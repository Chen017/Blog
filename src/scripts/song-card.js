
(() => {
  const SCRIPT_VERSION = "song-card-v6";

  const cleanups = window.__songCardCleanups || (window.__songCardCleanups = new Set());
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

      if (coverImg) {
        const artworkFailed = () => {
          coverImg.hidden = true;
          const wrap = coverImg.closest('.song-card__cover-wrap');
          if (wrap) {
            wrap.dataset.artworkError = "true";
            wrap.setAttribute("role", "img");
            wrap.setAttribute("aria-label", "Artwork unavailable for " + (rawTitle || "this song"));
          }
        };
        coverImg.addEventListener("error", artworkFailed, { once: true });
        if (coverImg.complete && coverImg.currentSrc && !coverImg.naturalWidth) artworkFailed();
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
                duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 380,
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

      const playbackError = document.createElement("p");
      playbackError.className = "song-playback-error";
      playbackError.setAttribute("role", "status");
      playbackError.hidden = true;
      card.querySelector('.song-card__body')?.append(playbackError);
      const playbackFailed = () => {
        audioLoaded = false;
        card.classList.remove("is-playing");
        updateToggle();
        stopLoop();
        playbackError.textContent = "Audio could not load. Press play to retry.";
        playbackError.hidden = false;
      };
      audio.addEventListener("error", playbackFailed);

      toggle.addEventListener("click", () => {
        if (audio.paused) {
          playbackError.hidden = true;
          ensureAudioLoaded();
          audio.play().catch(playbackFailed);
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
        const rail = volumeTrack.querySelector('.song-card__volume-rail') || volumeTrack;
        const rect = rail.getBoundingClientRect();
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
          volumeWrap.classList.add("is-dragging-volume");
          volumeTrack.setPointerCapture(e.pointerId);
          setVolumeFromPointer(e);
        });

        volumeTrack.addEventListener("pointermove", (e) => {
          if (isVolumeDragging) setVolumeFromPointer(e);
        });

        volumeTrack.addEventListener("pointerup", (e) => {
          if (!isVolumeDragging) return;
          isVolumeDragging = false;
          volumeWrap.classList.remove("is-dragging-volume");
          try { volumeTrack.releasePointerCapture(e.pointerId); } catch (_) {}
          setVolumeFromPointer(e);
        });

        volumeTrack.addEventListener("pointercancel", (e) => {
          if (!isVolumeDragging) return;
          isVolumeDragging = false;
          volumeWrap.classList.remove("is-dragging-volume");
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

      cleanups.add(() => {
        audio.pause();
        stopLoop();
        card.querySelectorAll('*').forEach(el => el.getAnimations().forEach(animation => animation.cancel()));
      });
      updateToggle();
      updateProgressDisplay(0, 0);
      renderLyric(-1);
    });
  };

  window.__songCardInit = initSongCards;
  initSongCards();
  if (!window.__songCardListenersBound) {
    document.addEventListener('astro:page-load', () => window.__songCardInit?.());
    document.addEventListener('twilight:page:loaded', () => window.__songCardInit?.());
    document.addEventListener('twilight:page:before-replace', (event) => {
      cleanups.forEach(cleanup => cleanup());
      if (!event.detail?.persisted) cleanups.clear();
    });
    window.__songCardListenersBound = true;
  }
})();
            
export {};
