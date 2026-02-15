/// <reference types="mdast" />
import { h } from "hastscript";

/**
 * Render a song card from markdown directives.
 * * Refactored for "Standard" Blurred Cover Background.
 */
export function SongCardComponent(properties, children) {
    const title = properties?.title || "Untitled";
    const artist = properties?.artist || "Unknown Artist";
    const cover = properties?.cover;
    const audio = properties?.audio;
    const cardId = `song-${Math.random().toString(36).slice(2, 10)}`;

    if (!cover || !audio) {
        return h("div", { class: "hidden" }, 'Error: "cover" and "audio" attributes are required.');
    }

    // Helper: Extract text from AST
    const extractNodeText = (node) => {
        if (!node) return "";
        if (typeof node.value === "string") return node.value;
        if (Array.isArray(node.children)) return node.children.map(extractNodeText).join("");
        return "";
    };

    // Helper: Parse Lyrics
    const rawLyrics = (Array.isArray(children) ? children : []).map(extractNodeText).join("\n").trim();
    const stripTimestampPrefix = (line) => line.replace(/^\s*\[[^\]]+\]\s*/g, "").trim();
    
    const parseTimestamp = (token) => {
        if (!token) return null;
        const normalized = token.trim().replaceAll("：", ":");
        if (normalized.includes(":")) {
            const [m, s] = normalized.split(":", 2);
            return Number(m) * 60 + Number(s);
        }
        return null;
    };

    const parseLrc = (input) => {
        if (!input) return [];
        const output = [];
        const lines = input.split(/\r?\n/);
        for (const line of lines) {
            const timeMatch = line.match(/\[(\d{2}):(\d{2}(?:\.\d+)?)\]/);
            const text = line.replace(/\[[^\]]+\]/g, "").trim();
            if (timeMatch && text) {
                const time = Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
                output.push({ time, text });
            }
        }
        return output.sort((a, b) => a.time - b.time);
    };

    const lrcLines = parseLrc(rawLyrics);
    const safeCover = String(cover).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const firstLine = lrcLines[0]?.text || (rawLyrics ? "Lyrics loaded" : "No lyrics provided");

    // Construct the Lyrics Source List (Hidden)
    const lyricsSource = lrcLines.length > 0
        ? h("ul", { class: "song-card__lyrics-source", hidden: true, "data-lrc-source": "true" },
            lrcLines.map(line => h("li", { "data-lrc-time": line.time.toFixed(3) }, line.text))
        ) : null;

    return h("section", {
        class: "song-card not-prose",
        "data-song-card": "true",
        "data-song-card-id": cardId,
        style: `--song-cover-url: url("${safeCover}");`, 
    }, [
        // 1. 背景层：高斯模糊封面
        h("div", { 
            class: "song-card__blur-bg", 
            style: `background-image: url("${safeCover}");`,
            "aria-hidden": "true" 
        }),
        
        // 2. 遮罩层：确保文字对比度 (半透明黑)
        h("div", { class: "song-card__overlay", "aria-hidden": "true" }),

        // 3. 内容主体
        h("div", { class: "song-card__body" }, [
            h("div", { class: "song-card__cover-wrap" }, [
                h("img", {
                    class: "song-card__cover",
                    src: cover,
                    alt: title,
                    loading: "lazy",
                    crossorigin: "anonymous" // 尝试允许跨域读取用于取色
                }),
            ]),
            
            h("div", { class: "song-card__info" }, [
                h("div", { class: "song-card__meta" }, [
                    h("h4", { class: "song-card__title" }, title),
                    h("span", { class: "song-card__artist" }, artist),
                ]),
                
                h("div", { class: "song-card__lyrics-container" }, [
                    h("p", { class: "song-card__lyric-line", "data-lyrics-current": "true" }, firstLine)
                ]),
                
                // Controls
                h("div", { class: "song-card__controls" }, [
                    h("button", { 
                        type: "button", 
                        class: "song-card__play-btn", 
                        "data-player-toggle": "true",
                        "aria-label": "Play"
                    }, [
                        // Play Icon
                        h("svg", { class: "icon-play", viewBox: "0 0 24 24", fill: "currentColor", width: "24", height: "24" }, 
                            [h("path", { d: "M8 5v14l11-7z" })]
                        ),
                        // Pause Icon
                        h("svg", { class: "icon-pause", viewBox: "0 0 24 24", fill: "currentColor", width: "24", height: "24" }, 
                            [h("path", { d: "M6 19h4V5H6v14zm8-14v14h4V5h-4z" })]
                        ),
                    ]),
                    
                    h("div", { class: "song-card__progress-wrap" }, [
                        h("span", { class: "song-card__time", "data-player-current": "true" }, "0:00"),
                        h("input", {
                            type: "range",
                            min: "0",
                            max: "100",
                            value: "0",
                            step: "0.1",
                            class: "song-card__slider",
                            "data-player-progress": "true"
                        }),
                        h("span", { class: "song-card__time", "data-player-duration": "true" }, "--:--"),
                    ])
                ]),
            ]),
            
            // Audio Element
            h("audio", { class: "song-card__audio", preload: "none", "data-song-audio": "true" }, [
                h("source", { "data-src": audio, type: "audio/mpeg" })
            ]),
            
            lyricsSource
        ]),

        // 4. 脚本 & 样式
        h("style", {}, `
            .song-card {
                position: relative;
                width: 100%;
                max-width: 600px;
                margin: 2rem auto;
                border-radius: 16px;
                overflow: hidden;
                color: #fff;
                font-family: system-ui, -apple-system, sans-serif;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                background: #1c1c1e; /* Fallback color */
                user-select: none;
                --song-accent: #ffffff; /* 默认强调色为白 */
            }
            
            /* Standard Blurred Background */
            .song-card__blur-bg {
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                background-size: cover;
                background-position: center;
                filter: blur(35px) brightness(0.6); /* 关键：强模糊 + 压暗 */
                transform: scale(1.2); /* 关键：放大以移除模糊白边 */
                z-index: 0;
                transition: opacity 0.5s ease;
            }

            .song-card__overlay {
                position: absolute;
                inset: 0;
                background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.5));
                z-index: 1;
            }

            .song-card__body {
                position: relative;
                z-index: 2;
                display: flex;
                gap: 20px;
                padding: 24px;
                align-items: center;
            }

            .song-card__cover-wrap {
                flex-shrink: 0;
                width: 100px;
                height: 100px;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }

            .song-card__cover {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
            }

            .song-card__info {
                flex-grow: 1;
                min-width: 0; /* Flexbox text truncation fix */
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 8px;
            }

            .song-card__meta {
                line-height: 1.3;
            }

            .song-card__title {
                font-size: 1.1rem;
                font-weight: 700;
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .song-card__artist {
                font-size: 0.9rem;
                opacity: 0.8;
                display: block;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .song-card__lyrics-container {
                height: 24px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .song-card__lyric-line {
                font-size: 0.95rem;
                color: rgba(255, 255, 255, 0.9);
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
            }

            .song-card__controls {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .song-card__play-btn {
                background: var(--song-accent);
                color: #000; /* 图标永远黑色 */
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.1s;
                flex-shrink: 0;
            }
            
            .song-card__play-btn:active { transform: scale(0.95); }
            
            .song-card__play-btn .icon-pause { display: none; }
            .song-card__play-btn.is-playing .icon-play { display: none; }
            .song-card__play-btn.is-playing .icon-pause { display: block; }

            .song-card__progress-wrap {
                flex-grow: 1;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.75rem;
                font-feature-settings: "tnum";
            }

            .song-card__slider {
                flex-grow: 1;
                -webkit-appearance: none;
                background: transparent;
                height: 4px;
                border-radius: 2px;
                cursor: pointer;
                background: rgba(255,255,255,0.2);
                position: relative;
            }
            
            /* Webkit Slider Thumb */
            .song-card__slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                height: 12px;
                width: 12px;
                border-radius: 50%;
                background: var(--song-accent);
                margin-top: -4px; /* Center thumb */
                box-shadow: 0 0 10px rgba(0,0,0,0.2);
            }
            
            /* Firefox Slider Thumb */
            .song-card__slider::-moz-range-thumb {
                height: 12px;
                width: 12px;
                border: none;
                border-radius: 50%;
                background: var(--song-accent);
            }
            
            /* Progress Fill Trick */
            .song-card__slider::-webkit-slider-runnable-track {
                background: linear-gradient(var(--song-accent), var(--song-accent)) 0/var(--progress, 0%) 100% no-repeat;
                height: 4px;
                border-radius: 2px;
            }
            
            @media (max-width: 480px) {
                .song-card__body { flex-direction: column; text-align: center; gap: 16px; }
                .song-card__info { width: 100%; }
                .song-card__controls { justify-content: center; }
            }
        `),

        // 5. 核心逻辑脚本
        h("script", { type: "text/javascript" }, `
(() => {
    const initCards = () => {
        document.querySelectorAll('[data-song-card="true"]').forEach(card => {
            if (card.dataset.loaded) return;
            card.dataset.loaded = "true";

            const audio = card.querySelector('[data-song-audio="true"]');
            const btn = card.querySelector('[data-player-toggle="true"]');
            const slider = card.querySelector('[data-player-progress="true"]');
            const currentEl = card.querySelector('[data-player-current="true"]');
            const durationEl = card.querySelector('[data-player-duration="true"]');
            const lyricEl = card.querySelector('[data-lyrics-current="true"]');
            const lines = Array.from(card.querySelectorAll('[data-lrc-source="true"] li'));
            const coverImg = card.querySelector('.song-card__cover');

            // --- Color Extraction Logic (Only for Accent) ---
            const extractColor = () => {
                if (!coverImg || !coverImg.complete) return;
                try {
                    const cvs = document.createElement('canvas');
                    cvs.width = 50; cvs.height = 50;
                    const ctx = cvs.getContext('2d');
                    ctx.drawImage(coverImg, 0, 0, 50, 50);
                    const data = ctx.getImageData(0, 0, 50, 50).data;
                    
                    let r=0, g=0, b=0, count=0;
                    for(let i=0; i<data.length; i+=4) {
                        r += data[i]; g += data[i+1]; b += data[i+2]; count++;
                    }
                    r = Math.floor(r/count); g = Math.floor(g/count); b = Math.floor(b/count);

                    // Convert to HSL to boost visibility
                    let max = Math.max(r,g,b), min = Math.min(r,g,b);
                    let h, s, l = (max+min)/2 / 255;
                    
                    if(max == min) { h=s=0; }
                    else {
                        const d = max-min;
                        s = l > 0.5 ? d/(510-max-min) : d/(max+min);
                        switch(max) {
                            case r: h = (g-b)/d + (g<b?6:0); break;
                            case g: h = (b-r)/d + 2; break;
                            case b: h = (r-g)/d + 4; break;
                        }
                        h /= 6;
                    }

                    // Force High Saturation & High Lightness for UI controls
                    const finalH = Math.round(h * 360);
                    const finalS = Math.max(60, s * 100); // At least 60% saturation
                    const finalL = Math.max(70, Math.min(90, l * 100)); // Clamp lightness between 70-90%

                    card.style.setProperty('--song-accent', \`hsl(\${finalH}, \${finalS}%, \${finalL}%)\`);
                } catch(e) {
                    console.log('CORS blocked canvas access, using default white accent.');
                }
            };

            if (coverImg.complete) extractColor();
            else coverImg.onload = extractColor;

            // --- Audio Logic ---
            const formatTime = (s) => {
                const m = Math.floor(s / 60);
                const ss = Math.floor(s % 60);
                return \`\${m}:\${String(ss).padStart(2,'0')}\`;
            };

            const updateState = () => {
                const cur = audio.currentTime || 0;
                const dur = audio.duration || 0;
                const progress = dur ? (cur / dur) * 100 : 0;
                
                slider.value = progress;
                slider.style.setProperty('--progress', \`\${progress}%\`);
                currentEl.textContent = formatTime(cur);
                durationEl.textContent = dur ? formatTime(dur) : "--:--";
                
                // Sync Lyrics
                if(lines.length) {
                    const idx = lines.findIndex(l => Number(l.dataset.lrcTime) > cur) - 1;
                    const activeLine = idx >= 0 ? lines[idx] : lines[0];
                    if (activeLine && lyricEl.textContent !== activeLine.textContent) {
                        lyricEl.style.opacity = 0;
                        lyricEl.style.transform = "translateY(5px)";
                        setTimeout(() => {
                            lyricEl.textContent = activeLine.textContent;
                            lyricEl.style.opacity = 1;
                            lyricEl.style.transform = "translateY(0)";
                        }, 150);
                    }
                }
            };

            btn.addEventListener('click', () => {
                if (audio.paused) {
                    // Lazy load src if needed
                    const src = audio.querySelector('source').dataset.src;
                    if (!audio.src && src) audio.src = src;
                    audio.play();
                    btn.classList.add('is-playing');
                } else {
                    audio.pause();
                    btn.classList.remove('is-playing');
                }
            });

            slider.addEventListener('input', (e) => {
                const v = e.target.value;
                slider.style.setProperty('--progress', \`\${v}%\`);
                if (audio.duration) {
                    audio.currentTime = (v / 100) * audio.duration;
                }
            });

            audio.addEventListener('timeupdate', updateState);
            audio.addEventListener('loadedmetadata', updateState);
            audio.addEventListener('ended', () => {
                btn.classList.remove('is-playing');
                audio.currentTime = 0;
            });
        });
    };

    // Initialize (Support standard, Astro, Swup)
    initCards();
    document.addEventListener('astro:page-load', initCards);
    document.addEventListener('swup:contentReplaced', initCards);
})();
        `),
    ]);
}
