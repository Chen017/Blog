/// <reference types="mdast" />
import { h } from "hastscript";

/**
 * Render a song card from markdown directives.
 *
 * Usage:
 * :::song{title="Song" artist="Artist" cover="https://..." audio="https://..."}
 * [00:00.00] Lyric line 1
 * [00:12.30] Lyric line 2
 * :::
 */
export function SongCardComponent(properties, children) {
    const title = properties?.title || "Untitled";
    const artist = properties?.artist || "Unknown Artist";
    const cover = properties?.cover;
    const audio = properties?.audio;
    const lyricsTitle = properties?.lyricsTitle || "Lyrics";
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

    const parseLrc = (input) => {
        if (!input) return [];
        const output = [];
        const lines = input.split(/\r?\n/);
        for (const line of lines) {
            const timestampMatches = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
            const text = line.replace(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g, "").trim();
            if (timestampMatches.length === 0) continue;
            for (const match of timestampMatches) {
                const minute = Number(match[1] || 0);
                const second = Number(match[2] || 0);
                const fractionRaw = match[3] || "0";
                const fraction = Number(fractionRaw) / Math.pow(10, fractionRaw.length);
                const time = minute * 60 + second + fraction;
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

    const lyricsContent =
        lrcLines.length > 0
            ? h(
                "ul",
                { class: "song-card__lyrics-list", "data-lrc-list": "true" },
                lrcLines.map((line) =>
                    h(
                        "li",
                        {
                            class: "song-card__lyrics-line",
                            "data-lrc-time": line.time.toFixed(3),
                            title: `Jump to ${line.time.toFixed(2)}s`,
                        },
                        line.text,
                    ),
                ),
            )
            : fallbackLines.length > 0
                ? fallbackLines.map((line) => h("p", line))
                : [h("p", "No lyrics provided.")];

    return h("section", {
        class: "song-card not-prose",
        "data-song-card": "true",
        "data-song-card-id": cardId,
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
            h("h4", { class: "song-card__title" }, title),
            h("p", { class: "song-card__artist" }, artist),
            h("audio", { class: "song-card__audio", controls: true, preload: "metadata", "data-song-audio": "true" }, [
                h("source", { src: audio, type: "audio/mpeg" }),
                "Your browser does not support the audio element.",
            ]),
            h("details", { class: "song-card__lyrics-details", open: true }, [
                h("summary", { class: "song-card__lyrics-summary" }, lyricsTitle),
                h("div", { class: "song-card__lyrics", "data-lyrics-container": "true" }, lyricsContent),
            ]),
        ]),
        h(
            "script",
            { type: "text/javascript" },
            `
(() => {
  if (window.__songCardInitBound) return;
  window.__songCardInitBound = true;

  const initSongCards = () => {
    const cards = document.querySelectorAll('[data-song-card="true"]');
    cards.forEach((card) => {
      if (card.dataset.songBound === "1") return;
      card.dataset.songBound = "1";

      const audio = card.querySelector('[data-song-audio="true"]');
      const container = card.querySelector('[data-lyrics-container="true"]');
      const lines = Array.from(card.querySelectorAll('[data-lrc-time]'));
      if (!audio || !container || lines.length === 0) return;

      let activeIndex = -1;
      let lastScrollAt = 0;

      const setActive = (nextIndex) => {
        if (nextIndex === activeIndex) return;
        if (activeIndex >= 0 && lines[activeIndex]) {
          lines[activeIndex].classList.remove('is-active');
        }
        activeIndex = nextIndex;
        if (activeIndex >= 0 && lines[activeIndex]) {
          const current = lines[activeIndex];
          current.classList.add('is-active');
          const now = Date.now();
          if (now - lastScrollAt > 250) {
            current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            lastScrollAt = now;
          }
        }
      };

      const findLineIndex = (time) => {
        for (let i = lines.length - 1; i >= 0; i--) {
          const t = Number(lines[i].dataset.lrcTime || 0);
          if (time >= t) return i;
        }
        return -1;
      };

      const syncByTime = () => {
        const idx = findLineIndex(audio.currentTime || 0);
        setActive(idx);
      };

      audio.addEventListener('timeupdate', syncByTime);
      audio.addEventListener('seeked', syncByTime);
      audio.addEventListener('loadedmetadata', syncByTime);
      audio.addEventListener('play', syncByTime);

      lines.forEach((line) => {
        line.addEventListener('click', () => {
          const t = Number(line.dataset.lrcTime || 0);
          if (!Number.isNaN(t)) {
            audio.currentTime = t;
            if (audio.paused) audio.play().catch(() => {});
          }
        });
      });
    });
  };

  initSongCards();
  document.addEventListener('astro:page-load', initSongCards);
  document.addEventListener('swup:contentReplaced', initSongCards);
})();
            `,
        ),
    ]);
}
