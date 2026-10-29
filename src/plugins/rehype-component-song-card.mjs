/// <reference types="mdast" />
import { h } from "hastscript";

/**
 * Render a song card from markdown directives.
 *
 * Usage:
 * :::song{title="Song" artist="Artist" cover="https://..." audio="https://..." lyricOffset="0.35"}
 * [00:00.00] Lyric line 1
 * [00:12.30] Lyric line 2
 * :::
 */
export function SongCardComponent(properties, children) {
    const title = properties?.title || "Untitled";
    const artist = properties?.artist || "Unknown Artist";
    const cover = properties?.cover;
    const audio = properties?.audio;
    const audioExtension = String(audio || '').split(/[?#]/, 1)[0].split('.').pop().toLowerCase();
    const audioType = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav',
        ogg: 'audio/ogg', flac: 'audio/flac', webm: 'audio/webm' }[audioExtension];
    const lyricOffsetRaw = properties?.lyricOffset ?? properties?.["lyric-offset"];
    const lyricOffset = lyricOffsetRaw !== undefined && !Number.isNaN(Number(lyricOffsetRaw)) ? Number(lyricOffsetRaw) : 0.35;
    const cardId = `song-${Math.random().toString(36).slice(2, 10)}`;

    if (!cover || !audio) {
        return h(
            "div",
            { class: "hidden" },
            'Invalid song directive. ("cover" and "audio" attributes are required)',
        );
    }

    const extractNodeText = (node) => {
        if (!node) return "";
        if (typeof node.value === "string") return node.value;
        if (Array.isArray(node.children)) {
            return node.children.map(extractNodeText).join("");
        }
        return "";
    };

    const rawLyrics = (Array.isArray(children) ? children : [])
        .map(extractNodeText)
        .join("\n")
        .trim();

    const stripTimestampPrefix = (line) =>
        line.replace(/^\s*\[[^\]]+\]\s*/g, "").trim();

    const parseTimestamp = (token) => {
        if (!token) return null;
        const normalized = token.trim().replaceAll("：", ":");
        if (!normalized) return null;

        // mm:ss(.xxx)
        if (normalized.includes(":")) {
            const [mRaw, secRaw] = normalized.split(":", 2);
            const minute = Number(mRaw);
            if (!Number.isFinite(minute)) return null;

            let second = 0;
            let fraction = 0;
            if (secRaw.includes(".")) {
                const [sRaw, fRaw] = secRaw.split(".", 2);
                second = Number(sRaw);
                if (!Number.isFinite(second)) return null;
                const fracStr = (fRaw || "0").replace(/[^\d]/g, "");
                fraction = fracStr ? Number(fracStr) / Math.pow(10, fracStr.length) : 0;
            } else {
                second = Number(secRaw);
                if (!Number.isFinite(second)) return null;
            }
            return minute * 60 + second + fraction;
        }

        // ss(.xxx)
        if (normalized.includes(".")) {
            const [sRaw, fRaw] = normalized.split(".", 2);
            const second = Number(sRaw);
            if (!Number.isFinite(second)) return null;
            const fracStr = (fRaw || "0").replace(/[^\d]/g, "");
            const fraction = fracStr ? Number(fracStr) / Math.pow(10, fracStr.length) : 0;
            return second + fraction;
        }

        return null;
    };

    const parseLrc = (input) => {
        if (!input) return [];
        const output = [];
        const lines = input.split(/\r?\n/);
        for (const line of lines) {
            const timestampMatches = [...line.matchAll(/\[([^\]]+)\]/g)];
            const text = stripTimestampPrefix(line.replace(/\[([^\]]+)\]/g, "").trim());
            if (timestampMatches.length === 0) continue;
            for (const match of timestampMatches) {
                const time = parseTimestamp(match[1]);
                if (time === null || Number.isNaN(time)) continue;
                output.push({ time, text: text || "..." });
            }
        }
        return output.sort((a, b) => a.time - b.time);
    };

    const lrcLines = parseLrc(rawLyrics);
    const fallbackLines = rawLyrics
        ? rawLyrics.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
        : [];
    const safeCover = String(cover).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    const firstLine = lrcLines[0]?.text || stripTimestampPrefix(fallbackLines[0] || "") || "No lyrics provided.";

    const lyricsSource =
        lrcLines.length > 0
            ? h(
                "ul",
                { class: "song-card__lyrics-source", hidden: true, "data-lrc-source": "true" },
                lrcLines.map((line) =>
                    h(
                        "li",
                        {
                            "data-lrc-time": line.time.toFixed(3),
                        },
                        line.text,
                    ),
                ),
            )
            : null;

    return h("section", {
        class: "song-card not-prose",
        "data-song-card": "true",
        "data-song-card-id": cardId,
        "data-song-title": title,
        "data-song-artist": artist,
        "data-lyric-offset": String(lyricOffset),
        style: `--song-cover: url("${safeCover}");`,
    }, [
        h("div", { class: "song-card__bg", "aria-hidden": "true" }),
        h("div", { class: "song-card__overlay", "aria-hidden": "true" }),
        h("div", { class: "song-card__cover-wrap" }, [
            h("img", {
                class: "song-card__cover",
                src: cover,
                alt: `${title} cover`,
                loading: "lazy",
            }),
        ]),
        h("div", { class: "song-card__body" }, [
            h("div", { class: "song-card__meta-row" }, [
                h("h4", { class: "song-card__titleline" }, `${title} - ${artist}`),
            ]),
            h("div", { class: "song-card__lyrics-stage", "data-lyrics-stage": "true" }, [
                h("div", { class: "song-card__lyrics-line song-card__lyrics-line--current", "data-lyrics-current": "true" }, firstLine),
                h("div", { class: "song-card__lyrics-line song-card__lyrics-line--exit", "data-lyrics-exit": "true", "aria-hidden": "true" }, ""),
            ]),
            h("audio", { class: "song-card__audio-el", preload: "none", "data-song-audio": "true" }, [
                h("source", { "data-src": audio, type: audioType }),
                "Your browser does not support the audio element.",
            ]),
            h("div", { class: "song-card__player", "data-player": "true" }, [
                h(
                    "button",
                    {
                        type: "button",
                        class: "song-card__play-btn",
                        "data-player-toggle": "true",
                        "aria-label": "Play",
                    },
                    [
                        h("span", { class: "song-card__play-icon song-card__play-icon--play", "aria-hidden": "true" }, [
                            h(
                                "svg",
                                {
                                    viewBox: "0 0 24 24",
                                    width: "18",
                                    height: "18",
                                    fill: "currentColor",
                                    "aria-hidden": "true",
                                },
                                [h("path", { d: "M9 6.75c0-.4.44-.64.77-.42l7.5 4.75a.5.5 0 0 1 0 .84l-7.5 4.75A.5.5 0 0 1 9 16.25z" })],
                            ),
                        ]),
                        h("span", { class: "song-card__play-icon song-card__play-icon--pause", "aria-hidden": "true" }, [
                            h(
                                "svg",
                                {
                                    viewBox: "0 0 24 24",
                                    width: "18",
                                    height: "18",
                                    fill: "currentColor",
                                    "aria-hidden": "true",
                                },
                                [
                                    h("rect", { x: "7.3", y: "6", width: "3.2", height: "12", rx: "0.9" }),
                                    h("rect", { x: "13.5", y: "6", width: "3.2", height: "12", rx: "0.9" }),
                                ],
                            ),
                        ]),
                    ],
                ),
                h("span", { class: "song-card__time", "data-player-current": "true" }, "0:00"),
                h("span", { class: "song-card__time-sep" }, "/"),
                h("span", { class: "song-card__time", "data-player-duration": "true" }, "--:--"),
                h("div", {
                    class: "song-card__progress-wrap",
                    "data-player-progress-wrap": "true",
                    role: "slider",
                    tabindex: "0",
                    "aria-label": "Playback progress",
                    "aria-valuemin": "0",
                    "aria-valuemax": "100",
                    "aria-valuenow": "0",
                }, [
                    h("div", { class: "song-card__progress-rail" }, [
                        h("div", { class: "song-card__progress-fill", "data-player-fill": "true" }),
                        h("div", { class: "song-card__progress-thumb", "data-player-thumb": "true" }),
                    ]),
                    h("div", { class: "song-card__progress-tooltip", "data-player-tooltip": "true" }, "0:00"),
                ]),
                h("div", { class: "song-card__volume-wrap", "data-volume-wrap": "true" }, [
                    h("button", {
                        type: "button",
                        class: "song-card__volume-btn",
                        "data-volume-toggle": "true",
                        "aria-label": "Mute or Unmute",
                    }, [
                        h("span", { class: "song-card__volume-icon song-card__volume-icon--up", "aria-hidden": "true" }, [
                            h("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "currentColor" }, [
                                h("path", { d: "M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H3.75A1.75 1.75 0 0 0 2 9.25v5.5c0 .966.784 1.75 1.75 1.75h2.69l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM17.78 7.22a.75.75 0 0 0-1.06 1.06 6 6 0 0 1 0 8.48.75.75 0 1 0 1.06 1.06 7.5 7.5 0 0 0 0-10.6z" }),
                                h("path", { d: "M20.96 4.04a.75.75 0 0 0-1.06 1.06 10.5 10.5 0 0 1 0 14.85.75.75 0 0 0 1.06 1.06 12 12 0 0 0 0-16.97z" }),
                            ]),
                        ]),
                        h("span", { class: "song-card__volume-icon song-card__volume-icon--mute", "aria-hidden": "true" }, [
                            h("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "currentColor" }, [
                                h("path", { d: "M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H3.75A1.75 1.75 0 0 0 2 9.25v5.5c0 .966.784 1.75 1.75 1.75h2.69l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06z" }),
                                h("path", { d: "m16.28 9.22 4.5 4.5a.75.75 0 0 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 1.06-1.06z" }),
                                h("path", { d: "m20.78 9.22-4.5 4.5a.75.75 0 0 0 1.06 1.06l4.5-4.5a.75.75 0 0 0-1.06-1.06z" }),
                            ]),
                        ]),
                    ]),
                    h("div", { class: "song-card__volume-slider-wrap" }, [
                        h("div", {
                            class: "song-card__volume-track",
                            "data-volume-track": "true",
                            role: "slider",
                            tabindex: "0",
                            "aria-label": "Volume",
                            "aria-valuemin": "0",
                            "aria-valuemax": "100",
                            "aria-valuenow": "100",
                        }, [
                            h("div", { class: "song-card__volume-rail" }, [
                                h("div", { class: "song-card__volume-fill", "data-volume-fill": "true" }),
                                h("div", { class: "song-card__volume-thumb", "data-volume-thumb": "true" }),
                            ]),
                        ]),
                    ]),
                ]),
            ]),
            lyricsSource,
        ]),
    ]);
}
