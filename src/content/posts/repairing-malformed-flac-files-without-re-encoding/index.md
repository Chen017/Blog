---
title: "Repairing Malformed FLAC Files for Navidrome Without Re-encoding"
directoryTitle: "Navidrome FLAC Repair"
published: 2026-09-20
description: "Repair malformed FLAC files containing corrupted garbage bytes between metadata and audio frames without re-encoding to restore compatibility with Navidrome and FFmpeg."
category: "Development"
draft: false
---

I encountered several FLAC files that could not be played by Navidrome or decoded by FFmpeg (see [Navidrome Issue #6172](https://github.com/navidrome/navidrome/issues/6172)), while `libFLAC` could recover them with `-F`.

The problem was not damaged audio. The files contained several megabytes of garbage between the FLAC metadata and the first real audio frame:

```text
FLAC metadata
↓
garbage bytes
↓
valid FLAC frame 0
↓
valid FLAC frame 1
↓
...
```

FFmpeg gives up before finding the first frame, while:

```bash
flac -d -F
```

keeps scanning and eventually finds the intact audio.

Instead of decoding and re-encoding the files, the cleaner solution is to remove only the garbage bytes and preserve both the original metadata and the original compressed FLAC frames.

## 1. Find affected files

My music library was mounted from Cloudflare R2 using rclone:

```text
R2 → rclone mount → /mnt/music → Navidrome
```

First, test whether FFmpeg can produce even one audio frame.

Create:

```bash
nano /root/scan-flac.sh
```

with:

```bash
#!/usr/bin/env bash

set -u

ROOT="/mnt/music"
OUT="/root/flac-scan-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$OUT/logs"

GOOD="$OUT/good.txt"
BAD="$OUT/bad.txt"
TIMEOUT="$OUT/timeout.txt"

: > "$GOOD"
: > "$BAD"
: > "$TIMEOUT"

mapfile -d '' FILES < <(find "$ROOT" -type f -iname '*.flac' -print0)

TOTAL=${#FILES[@]}
N=0

for FILE in "${FILES[@]}"; do
    ((N++))

    REL="${FILE#$ROOT/}"
    TMP="$OUT/.probe-${N}.raw"
    LOG="$OUT/logs/${N}.log"

    rm -f "$TMP"

    printf '[%4d/%4d] %s ... ' "$N" "$TOTAL" "$REL"

    timeout --signal=TERM 30s \
        ffmpeg \
        -hide_banner \
        -nostdin \
        -v error \
        -i "$FILE" \
        -map 0:a:0 \
        -frames:a 1 \
        -c:a pcm_s16le \
        -f s16le \
        -y "$TMP" \
        2>"$LOG"

    RC=$?

    if [[ $RC -eq 124 ]]; then
        echo "TIMEOUT"
        printf '%s\n' "$FILE" >> "$TIMEOUT"

    elif [[ -s "$TMP" ]]; then
        echo "OK"
        printf '%s\n' "$FILE" >> "$GOOD"

        [[ ! -s "$LOG" ]] && rm -f "$LOG"

    else
        echo "BAD"
        printf '%s\n' "$FILE" >> "$BAD"
    fi

    rm -f "$TMP"
done

echo
echo "Total:   $TOTAL"
echo "OK:      $(wc -l < "$GOOD")"
echo "BAD:     $(wc -l < "$BAD")"
echo "TIMEOUT: $(wc -l < "$TIMEOUT")"
echo
echo "Results: $OUT"
```

Run:

```bash
chmod +x /root/scan-flac.sh
/root/scan-flac.sh
```

This does **not** decode every song completely. For a healthy FLAC, FFmpeg stops after producing the first audio frame.

In my case:

```text
Total:   924
OK:      920
BAD:     4
TIMEOUT: 0
```

The four affected files were:

```text
太空人 - 吴青峰.flac
等着等着就老了 - 李荣浩.flac
线的记忆 - 吴青峰.flac
躲 - 张洢豪.flac
```

## 2. Confirm that libFLAC can recover them

For an affected file:

```bash
flac -t "file.flac"
```

failed with errors such as:

```text
FLAC__STREAM_DECODER_ERROR_STATUS_LOST_SYNC
FLAC__STREAM_DECODER_ERROR_STATUS_BAD_HEADER
```

But:

```bash
flac -t -F "file.flac"
```

completed successfully.

You can also inspect the recovered frame structure with:

```bash
flac -a -F -c "file.flac" 2>/dev/null |
grep '^frame=' |
head -2
```

For example:

```text
frame=0 offset=2994885  bits=125165656 ...
frame=1 offset=18640592 bits=7768 ...
```

The abnormally huge first "frame" is the important clue.

`libFLAC -F` is effectively skipping a large corrupted region before reaching the real FLAC frames.

## 3. Copy only the affected files locally

Do not repair files directly through the R2 mount.

```bash
DIR=$(ls -dt /root/flac-scan-* | head -1)

mkdir -p /root/flac-repair/original
mkdir -p /root/flac-repair/fixed

while IFS= read -r src; do
    rel="${src#/mnt/music/}"
    dst="/root/flac-repair/original/$rel"

    mkdir -p "$(dirname "$dst")"

    echo "Copying: $rel"
    cp -- "$src" "$dst"
done < "$DIR/bad.txt"
```

The original malformed files are now preserved under:

```text
/root/flac-repair/original/
```

## 4. Remove the garbage without re-encoding

The repair script below:

1. Parses the native FLAC metadata chain.
2. Finds where metadata really ends.
3. Searches for a valid FLAC frame 0.
4. Validates the candidate using the FLAC frame-header CRC-8.
5. Removes only the bytes between metadata and frame 0.
6. Preserves the original metadata.
7. Preserves the original compressed FLAC audio frames.
8. Runs both `flac -t` and FFmpeg full decoding afterward.

Create:

```bash
nano /root/repair-flac-gap.py
```

with:

```python
#!/usr/bin/env python3

from pathlib import Path
import subprocess
import sys

SRC = Path("/root/flac-repair/original")
DST = Path("/root/flac-repair/fixed")


def crc8(buf):
    c = 0

    for b in buf:
        c ^= b

        for _ in range(8):
            if c & 0x80:
                c = ((c << 1) ^ 0x07) & 0xFF
            else:
                c = (c << 1) & 0xFF

    return c


def metadata_end(data):
    if data[:4] != b"fLaC":
        raise ValueError("missing native FLAC marker")

    p = 4

    while True:
        if p + 4 > len(data):
            raise ValueError("truncated metadata")

        header = data[p]
        length = int.from_bytes(data[p + 1:p + 4], "big")

        p += 4 + length

        if p > len(data):
            raise ValueError("metadata extends past EOF")

        if header & 0x80:
            return p


def valid_frame0_header(data, i):
    if i + 7 >= len(data):
        return False

    # FLAC sync code.
    if data[i] != 0xFF or data[i + 1] not in (0xF8, 0xF9):
        return False

    # Reserved bit.
    if data[i + 3] & 1:
        return False

    channel_code = data[i + 3] >> 4
    bps_code = (data[i + 3] >> 1) & 7

    if channel_code > 10 or bps_code == 3:
        return False

    block_code = data[i + 2] >> 4
    rate_code = data[i + 2] & 15

    if block_code == 0 or rate_code == 15:
        return False

    # Frame/sample number zero.
    if data[i + 4] != 0:
        return False

    p = i + 5

    if block_code == 6:
        p += 1
    elif block_code == 7:
        p += 2

    if rate_code == 12:
        p += 1
    elif rate_code in (13, 14):
        p += 2

    if p >= len(data):
        return False

    # Validate FLAC frame-header CRC-8.
    return crc8(data[i:p]) == data[p]


def run(cmd):
    return subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )


DST.mkdir(parents=True, exist_ok=True)

failures = 0

for src in sorted(SRC.rglob("*.flac")):
    rel = src.relative_to(SRC)
    dst = DST / rel

    dst.parent.mkdir(parents=True, exist_ok=True)

    print()
    print("==============================================")
    print(rel)
    print("==============================================")

    try:
        data = src.read_bytes()

        mend = metadata_end(data)

        candidates = []
        p = mend

        while True:
            p = data.find(b"\xff", p)

            if p < 0:
                break

            if valid_frame0_header(data, p):
                candidates.append(p)

            p += 1

        if len(candidates) != 1:
            raise ValueError(
                f"expected exactly one CRC-valid frame 0; "
                f"found {candidates}"
            )

        frame0 = candidates[0]
        garbage = frame0 - mend

        if garbage <= 0:
            raise ValueError(
                f"no garbage gap: metadata={mend}, frame0={frame0}"
            )

        print(f"metadata_end = {mend}")
        print(f"frame0_start = {frame0}")
        print(f"remove_bytes = {garbage}")

        # Preserve metadata and all original compressed audio frames.
        with dst.open("wb") as f:
            f.write(data[:mend])
            f.write(data[frame0:])

        result = run([
            "flac",
            "-s",
            "-t",
            str(dst)
        ])

        if result.returncode != 0:
            raise ValueError(
                "flac -t failed:\n" + result.stdout[-3000:]
            )

        result = run([
            "ffmpeg",
            "-hide_banner",
            "-nostdin",
            "-v", "error",
            "-i", str(dst),
            "-map", "0:a:0",
            "-f", "null",
            "-"
        ])

        if result.returncode != 0 or result.stdout.strip():
            raise ValueError(
                "ffmpeg full decode failed:\n"
                + result.stdout[-3000:]
            )

        print("VERIFY = PASS")
        print(f"fixed = {dst}")

    except Exception as e:
        failures += 1

        print(f"FAILED = {e}")

        try:
            dst.unlink()
        except FileNotFoundError:
            pass


print()
print("==============================================")
print(f"Done. failures={failures}")
print("==============================================")

sys.exit(1 if failures else 0)
```

Run it:

```bash
chmod +x /root/repair-flac-gap.py
python3 /root/repair-flac-gap.py
```

My result was:

```text
太空人 - 吴青峰.flac
metadata_end = 2994885
frame0_start = 18640023
remove_bytes = 15645138
VERIFY = PASS

等着等着就老了 - 李荣浩.flac
metadata_end = 11882787
frame0_start = 18213676
remove_bytes = 6330889
VERIFY = PASS

线的记忆 - 吴青峰.flac
metadata_end = 2993667
frame0_start = 18638121
remove_bytes = 15644454
VERIFY = PASS

躲 - 张洢豪.flac
metadata_end = 8211555
frame0_start = 18170392
remove_bytes = 9958837
VERIFY = PASS
```

The important part is:

```text
VERIFY = PASS
```

The repaired files are under:

```text
/root/flac-repair/fixed/
```

## 5. Why this is better than re-encoding

A generic workaround would be:

```bash
flac -d -F broken.flac -o recovered.wav
flac recovered.wav -o fixed.flac
```

That works, but unnecessarily decodes and re-encodes the entire file.

In this case the actual audio frames were already intact.

The repair instead changes:

```text
metadata
+
garbage
+
original FLAC frames
```

into:

```text
metadata
+
original FLAC frames
```

No audio decoding or re-encoding is involved.

## 6. Save hashes before replacing the remote files

```bash
echo "=== ORIGINAL ==="

find /root/flac-repair/original \
    -type f \
    -name '*.flac' \
    -print0 |
while IFS= read -r -d '' f; do
    sha256sum "$f"
done

echo
echo "=== FIXED ==="

find /root/flac-repair/fixed \
    -type f \
    -name '*.flac' \
    -print0 |
while IFS= read -r -d '' f; do
    sha256sum "$f"
done
```

Keep `/root/flac-repair/original` until everything has been verified.

## 7. Replace only the affected files

Because my R2 bucket was already mounted using rclone with VFS caching, I replaced the files through the mount:

```bash
DIR=$(ls -dt /root/flac-scan-* | head -1)

while IFS= read -r dst; do
    rel="${dst#/mnt/music/}"
    src="/root/flac-repair/fixed/$rel"

    echo "Replacing: $rel"

    if [[ ! -f "$src" ]]; then
        echo "ERROR: fixed file missing: $src"
        exit 1
    fi

    cp -f -- "$src" "$dst" || exit 1
done < "$DIR/bad.txt"
```

Only the affected files are uploaded again.

The rest of the music library is untouched.

## 8. Verify through the mount

Run a complete libFLAC and FFmpeg decode:

```bash
DIR=$(ls -dt /root/flac-scan-* | head -1)

while IFS= read -r f; do
    echo
    echo "===== $f ====="

    flac -s -t "$f"
    echo "flac RC=$?"

    ffmpeg \
        -hide_banner \
        -nostdin \
        -v error \
        -i "$f" \
        -map 0:a:0 \
        -f null -

    echo "ffmpeg RC=$?"
done < "$DIR/bad.txt"
```

The expected result is:

```text
flac RC=0
ffmpeg RC=0
```

for every repaired file.

## 9. Verify the actual R2 objects

Do not rely only on the mounted filesystem or VFS cache.

Compare the fixed local file with the object read directly from R2:

```bash
DIR=$(ls -dt /root/flac-scan-* | head -1)

while IFS= read -r mounted; do
    rel="${mounted#/mnt/music/}"
    fixed="/root/flac-repair/fixed/$rel"

    echo
    echo "=========================================="
    echo "$rel"

    echo -n "LOCAL FIXED : "
    sha256sum "$fixed" | awk '{print $1}'

    echo -n "R2 REMOTE   : "
    rclone cat "r2:alist/music/$rel" |
        sha256sum |
        awk '{print $1}'
done < "$DIR/bad.txt"
```

For every file:

```text
LOCAL FIXED == R2 REMOTE
```

must hold.

In my case all four objects matched exactly.

## Result

The files now work normally with both FFmpeg and Navidrome.

No special Navidrome transcoding profile is required, and normal FLAC files do not incur any additional processing cost.

The fix is simply:

```text
Find files where FFmpeg cannot reach frame 0
        ↓
Locate metadata end
        ↓
Locate the real CRC-valid FLAC frame 0
        ↓
Delete the garbage between them
        ↓
Keep metadata + original compressed audio frames
        ↓
Verify with libFLAC and FFmpeg
        ↓
Replace only the affected R2 objects
```
