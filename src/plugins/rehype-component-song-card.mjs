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
                h("source", { "data-src": audio, type: "audio/mpeg" }),
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
        h(
            "script",
            { type: "text/javascript" },
            `
(() => {
  const SCRIPT_VERSION = "song-card-v5";

  const initSongCards = () => {
    const cards = document.querySelectorAll('[data-song-card="true"]');
    cards.forEach((card) => {
      if (card.dataset.songBoundVersion === SCRIPT_VERSION) return;
      card.dataset.songBoundVersion = SCRIPT_VERSION;

      const audio = card.querySelector('[data-song-audio="true"]');
      const toggle = card.querySelector('[data-player-toggle="true"]');
      const progressWrap = card.querySelector('[data-player-progress-wrap="true"]');
      const progressTooltip = card.querySelector('[data-player-tooltip="true"]');
      const currentTimeEl = card.querySelector('[data-player-current="true"]');
      const durationEl = card.querySelector('[data-player-duration="true"]');
      const currentLyricEl = card.querySelector('[data-lyrics-current="true"]');
      const exitLyricEl = card.querySelector('[data-lyrics-exit="true"]');
      const lines = Array.from(card.querySelectorAll('[data-lrc-source="true"] [data-lrc-time]'));
      const coverImg = card.querySelector('.song-card__cover');
      const volumeWrap = card.querySelector('[data-volume-wrap="true"]');
      const volumeToggle = card.querySelector('[data-volume-toggle="true"]');
      const volumeTrack = card.querySelector('[data-volume-track="true"]');

      if (!audio || !toggle || !progressWrap || !currentTimeEl || !durationEl) return;
      let audioLoaded = false;
      let isDragging = false;
      let rafId = null;
      let currentLineIndex = -1;
      let lastVolume = 1;

      const lyricOffset = parseFloat(card.dataset.lyricOffset || "0.35");

      const ensureAudioLoaded = () => {
        if (audioLoaded) return;
        const sourceEl = audio.querySelector("source[data-src]");
        if (sourceEl && !sourceEl.getAttribute("src")) {
          const src = sourceEl.getAttribute("data-src");
          if (src) sourceEl.setAttribute("src", src);
        }
        audio.preload = "metadata";
        audio.load();
        audioLoaded = true;
      };

      const titlelineEl = card.querySelector('.song-card__titleline');
      const rawTitle = (card.dataset.songTitle || "").trim();
      const rawArtist = (card.dataset.songArtist || "").trim();
      if (titlelineEl && rawTitle && rawArtist) {
        titlelineEl.textContent = rawTitle + " - " + rawArtist;
      }

      const formatTime = (value) => {
        if (!Number.isFinite(value) || value < 0) return "0:00";
        const minute = Math.floor(value / 60);
        const second = Math.floor(value % 60);
        return minute + ":" + String(second).padStart(2, "0");
      };

      const findLineIndex = (time) => {
        const adjustedTime = time + (Number.isFinite(lyricOffset) ? lyricOffset : 0.35);
        for (let i = lines.length - 1; i >= 0; i--) {
          const t = Number(lines[i].dataset.lrcTime || 0);
          if (adjustedTime >= t) return i;
        }
        return -1;
      };

      const renderLyric = (index) => {
        if (!currentLyricEl || lines.length === 0) return;
        if (index === currentLineIndex) return;
        currentLineIndex = index;
        const current = index >= 0 ? lines[index] : lines[0];
        const nextText = current ? (current.textContent || "...") : "...";

        if (currentLyricEl.textContent !== nextText) {
          const prevText = currentLyricEl.textContent || "";
          if (exitLyricEl && prevText) {
            exitLyricEl.textContent = prevText;
            if (typeof exitLyricEl.animate === "function") {
              exitLyricEl.getAnimations().forEach((a) => a.cancel());
              exitLyricEl.animate([
                { opacity: 1, transform: "translateY(0)" },
                { opacity: 0, transform: "translateY(-100%)" },
              ], {
                duration: 380,
                easing: "cubic-bezier(0.25, 1, 0.5, 1)",
                fill: "both",
              });
            }
          }
          currentLyricEl.textContent = nextText;
          if (typeof currentLyricEl.animate === "function") {
            currentLyricEl.getAnimations().forEach((a) => a.cancel());
            currentLyricEl.animate([
              { opacity: 0, transform: "translateY(100%)" },
              { opacity: 1, transform: "translateY(0)" },
            ], {
              duration: 380,
              easing: "cubic-bezier(0.25, 1, 0.5, 1)",
              fill: "both",
            });
          }
        }
      };

      const updateProgressDisplay = (current, duration) => {
        const percent = duration > 0 ? (current / duration) * 100 : 0;
        const clampedPercent = Math.max(0, Math.min(100, percent));
        card.style.setProperty("--song-progress", clampedPercent.toFixed(3) + "%");
        progressWrap.setAttribute("aria-valuenow", clampedPercent.toFixed(1));
        currentTimeEl.textContent = formatTime(current);
        durationEl.textContent = duration > 0 ? formatTime(duration) : "--:--";
      };

      const syncByTime = () => {
        const duration = audio.duration || 0;
        const current = audio.currentTime || 0;
        if (!isDragging) {
          updateProgressDisplay(current, duration);
        }
        const idx = findLineIndex(current);
        renderLyric(idx);
      };

      const tick = () => {
        if (audio.paused || audio.ended) {
          stopLoop();
          return;
        }
        syncByTime();
        rafId = requestAnimationFrame(tick);
      };

      const startLoop = () => {
        if (!rafId) {
          rafId = requestAnimationFrame(tick);
        }
      };

      const stopLoop = () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      };

      const updateToggle = () => {
        const playing = !audio.paused;
        toggle.classList.toggle("is-playing", playing);
        toggle.setAttribute("aria-label", playing ? "Pause" : "Play");
      };

      toggle.addEventListener("click", () => {
        if (audio.paused) {
          ensureAudioLoaded();
          audio.play().catch(() => {});
        } else {
          audio.pause();
        }
      });

      const getPercentFromPointer = (e) => {
        const rect = progressWrap.getBoundingClientRect();
        if (rect.width <= 0) return 0;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const x = clientX - rect.left;
        return Math.max(0, Math.min(1, x / rect.width));
      };

      const seekToPercent = (ratio) => {
        const duration = audio.duration || 0;
        if (duration > 0) {
          audio.currentTime = duration * ratio;
          syncByTime();
        }
      };

      progressWrap.addEventListener("pointerdown", (e) => {
        ensureAudioLoaded();
        isDragging = true;
        progressWrap.classList.add("is-dragging");
        progressWrap.setPointerCapture(e.pointerId);
        const ratio = getPercentFromPointer(e);
        updateProgressDisplay(ratio * (audio.duration || 0), audio.duration || 0);
      });

      progressWrap.addEventListener("pointermove", (e) => {
        const ratio = getPercentFromPointer(e);
        const duration = audio.duration || 0;
        if (progressTooltip) {
          progressTooltip.textContent = formatTime(duration * ratio);
          progressTooltip.style.setProperty("--tooltip-x", (ratio * 100).toFixed(2) + "%");
        }
        if (isDragging) {
          updateProgressDisplay(ratio * duration, duration);
        }
      });

      progressWrap.addEventListener("pointerup", (e) => {
        if (!isDragging) return;
        isDragging = false;
        progressWrap.classList.remove("is-dragging");
        try { progressWrap.releasePointerCapture(e.pointerId); } catch (_) {}
        const ratio = getPercentFromPointer(e);
        seekToPercent(ratio);
      });

      progressWrap.addEventListener("pointercancel", (e) => {
        if (!isDragging) return;
        isDragging = false;
        progressWrap.classList.remove("is-dragging");
        try { progressWrap.releasePointerCapture(e.pointerId); } catch (_) {}
        syncByTime();
      });

      progressWrap.addEventListener("keydown", (e) => {
        const duration = audio.duration || 0;
        if (!duration) return;
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          audio.currentTime = Math.max(0, audio.currentTime - 5);
          syncByTime();
        } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          audio.currentTime = Math.min(duration, audio.currentTime + 5);
          syncByTime();
        }
      });

      let isVolumeDragging = false;
      const updateVolumeDisplay = (vol, muted) => {
        const effectiveVol = muted ? 0 : vol;
        const percent = Math.max(0, Math.min(100, effectiveVol * 100));
        volumeWrap.style.setProperty("--volume-percent", percent.toFixed(1) + "%");
        if (volumeTrack) {
          volumeTrack.setAttribute("aria-valuenow", percent.toFixed(0));
        }
        volumeWrap.classList.toggle("is-muted", effectiveVol === 0);
      };

      const setVolumeFromPointer = (e) => {
        if (!volumeTrack) return;
        const rect = volumeTrack.getBoundingClientRect();
        if (rect.width <= 0) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        ensureAudioLoaded();
        audio.volume = ratio;
        audio.muted = ratio === 0;
        if (ratio > 0) lastVolume = ratio;
        updateVolumeDisplay(ratio, audio.muted);
      };

      if (volumeToggle && volumeWrap && volumeTrack) {
        volumeToggle.addEventListener("click", (e) => {
          e.stopPropagation();
          ensureAudioLoaded();
          if (audio.muted || audio.volume === 0) {
            audio.muted = false;
            audio.volume = lastVolume || 1;
            updateVolumeDisplay(audio.volume, false);
          } else {
            lastVolume = audio.volume || 1;
            audio.muted = true;
            updateVolumeDisplay(audio.volume, true);
          }
        });

        volumeTrack.addEventListener("pointerdown", (e) => {
          ensureAudioLoaded();
          isVolumeDragging = true;
          volumeTrack.setPointerCapture(e.pointerId);
          setVolumeFromPointer(e);
        });

        volumeTrack.addEventListener("pointermove", (e) => {
          if (isVolumeDragging) setVolumeFromPointer(e);
        });

        volumeTrack.addEventListener("pointerup", (e) => {
          if (!isVolumeDragging) return;
          isVolumeDragging = false;
          try { volumeTrack.releasePointerCapture(e.pointerId); } catch (_) {}
          setVolumeFromPointer(e);
        });

        volumeTrack.addEventListener("pointercancel", (e) => {
          if (!isVolumeDragging) return;
          isVolumeDragging = false;
          try { volumeTrack.releasePointerCapture(e.pointerId); } catch (_) {}
        });

        volumeTrack.addEventListener("keydown", (e) => {
          ensureAudioLoaded();
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            audio.volume = Math.max(0, audio.volume - 0.05);
            audio.muted = audio.volume === 0;
            if (audio.volume > 0) lastVolume = audio.volume;
            updateVolumeDisplay(audio.volume, audio.muted);
          } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            audio.volume = Math.min(1, audio.volume + 0.05);
            audio.muted = false;
            lastVolume = audio.volume;
            updateVolumeDisplay(audio.volume, false);
          }
        });

        updateVolumeDisplay(1, false);
      }

      audio.addEventListener("loadedmetadata", () => {
        updateProgressDisplay(audio.currentTime || 0, audio.duration || 0);
        syncByTime();
      });

      audio.addEventListener("play", () => {
        document.querySelectorAll('[data-song-audio="true"]').forEach((otherAudio) => {
          if (otherAudio !== audio && !otherAudio.paused) {
            otherAudio.pause();
          }
        });
        card.classList.add("is-playing");
        updateToggle();
        startLoop();
      });

      audio.addEventListener("pause", () => {
        card.classList.remove("is-playing");
        updateToggle();
        stopLoop();
      });

      audio.addEventListener("ended", () => {
        card.classList.remove("is-playing");
        updateToggle();
        stopLoop();
      });

      audio.addEventListener("timeupdate", syncByTime);
      audio.addEventListener("seeked", syncByTime);

      updateToggle();
      updateProgressDisplay(0, 0);
      renderLyric(-1);
    });
  };

  window.__songCardInit = initSongCards;
  initSongCards();
  if (!window.__songCardListenersBound) {
    document.addEventListener('astro:page-load', () => window.__songCardInit?.());
    document.addEventListener('swup:contentReplaced', () => window.__songCardInit?.());
    window.__songCardListenersBound = true;
  }
})();
            `,
        ),
    ]);
}