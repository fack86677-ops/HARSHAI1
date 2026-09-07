// Inspector Styling Controls, Transcript List Editor, and Export Modal for Harsh AI Studio
// Works directly with authoritative Caption data model

class KalakarEditor {
  constructor(player, timeline) {
    this.player = player;
    this.timeline = timeline;
    this.segments = [];
    this.historyStack = [];
    this.redoStack = [];

    this.initLeftTabs();
    this.initCustomFontUploader();
    this.initInspectorDOM();
    this.initAnimationTabDOM();
    this.initTranscriptDOM();
    this.initTemplatesGrid();
    this.initExportModal();
    this.initHistoryAndShortcuts();
    this.loadSavedFonts();
  }

  setSegments(segments) {
    this.segments = segments || [];
    this.renderTranscriptList();
  }

  pushStateToHistory() {
    const caps = this.timeline ? this.timeline.timeline.captions : this.segments;
    if (caps && caps.length) {
      this.historyStack.push(JSON.parse(JSON.stringify(caps)));
      if (this.historyStack.length > 40) this.historyStack.shift();
      this.redoStack = [];
      this.updateUndoRedoUI();
    }
  }

  undo() {
    if (this.historyStack.length > 0) {
      const current = this.timeline ? this.timeline.timeline.captions : this.segments;
      this.redoStack.push(JSON.parse(JSON.stringify(current)));
      const previous = this.historyStack.pop();
      if (this.timeline) this.timeline.setCaptions(previous);
      this.applyStateChange();
      if (window.showToast) window.showToast('↶ Action Undone');
    } else {
      if (window.showToast) window.showToast('No more actions to undo');
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const current = this.timeline ? this.timeline.timeline.captions : this.segments;
      this.historyStack.push(JSON.parse(JSON.stringify(current)));
      const next = this.redoStack.pop();
      if (this.timeline) this.timeline.setCaptions(next);
      this.applyStateChange();
      if (window.showToast) window.showToast('↷ Action Redone');
    } else {
      if (window.showToast) window.showToast('No more actions to redo');
    }
  }

  applyStateChange() {
    this.renderTranscriptList();
    if (this.player) this.player.render();
    this.updateUndoRedoUI();
    if (window.saveCurrentProject) window.saveCurrentProject();
  }

  updateUndoRedoUI() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.style.opacity = this.historyStack.length > 0 ? '1' : '0.4';
    if (redoBtn) redoBtn.style.opacity = this.redoStack.length > 0 ? '1' : '0.4';
  }

  initHistoryAndShortcuts() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    const shortcutsBtn = document.getElementById('btn-open-shortcuts');
    const shortcutsModal = document.getElementById('modal-shortcuts');
    const closeShortcutsBtn = document.getElementById('btn-close-shortcuts');

    if (undoBtn) undoBtn.addEventListener('click', () => this.undo());
    if (redoBtn) redoBtn.addEventListener('click', () => this.redo());

    if (shortcutsBtn && shortcutsModal) {
      shortcutsBtn.addEventListener('click', () => shortcutsModal.classList.remove('hidden'));
    }
    if (closeShortcutsBtn && shortcutsModal) {
      closeShortcutsBtn.addEventListener('click', () => shortcutsModal.classList.add('hidden'));
    }

    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        this.redo();
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        if (shortcutsModal) shortcutsModal.classList.toggle('hidden');
      }
    });

    this.updateUndoRedoUI();
  }

  initLeftTabs() {
    const tabs = [
      { btn: 'left-tab-captions', content: 'left-content-captions' },
      { btn: 'left-tab-fonts', content: 'left-content-fonts' },
      { btn: 'left-tab-library', content: 'left-content-library' }
    ];

    tabs.forEach(t => {
      const btnEl = document.getElementById(t.btn);
      const contentEl = document.getElementById(t.content);
      if (btnEl && contentEl) {
        btnEl.addEventListener('click', () => {
          tabs.forEach(x => {
            const b = document.getElementById(x.btn);
            const c = document.getElementById(x.content);
            if (b) {
              b.className = 'flex-1 py-2.5 text-xs font-medium text-[#94A3B8] hover:text-white flex items-center justify-center gap-1.5 border-b-2 border-transparent';
            }
            if (c) c.classList.add('hidden');
          });
          btnEl.className = 'flex-1 py-2.5 text-xs font-bold text-[#6366F1] border-b-2 border-[#6366F1] flex items-center justify-center gap-1.5';
          contentEl.classList.remove('hidden');
        });
      }
    });

    window.applyFontDirectly = (fontName) => {
      if (this.player) {
        this.player.setStyle({ fontFamily: fontName });
        const fontSelect = document.getElementById('input-font-family');
        if (fontSelect) fontSelect.value = fontName;
        if (window.showToast) window.showToast(`Font applied: <b>${fontName}</b>`);
      }
    };
  }

  loadSavedFonts() {
    try {
      const saved = JSON.parse(localStorage.getItem('hcg_custom_fonts') || '[]');
      saved.forEach(f => {
        if (f.name && f.data) {
          const newStyle = document.createElement('style');
          newStyle.appendChild(document.createTextNode(`
            @font-face {
              font-family: '${f.name}';
              src: url('${f.data}');
            }
          `));
          document.head.appendChild(newStyle);

          const fontSelect = document.getElementById('input-font-family');
          if (fontSelect) {
            const opt = document.createElement('option');
            opt.value = f.name;
            opt.textContent = `Custom: ${f.name}`;
            fontSelect.prepend(opt);
          }
        }
      });
    } catch (e) {
      console.log('Saved fonts load note:', e);
    }
  }

  initCustomFontUploader() {
    const fileInput = document.getElementById('font-file-input');
    if (!fileInput) return;

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const fontName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "");
      const reader = new FileReader();

      reader.onload = (re) => {
        const fontData = re.target.result;

        try {
          const saved = JSON.parse(localStorage.getItem('hcg_custom_fonts') || '[]');
          if (!saved.find(x => x.name === fontName)) {
            saved.push({ name: fontName, data: fontData });
            localStorage.setItem('hcg_custom_fonts', JSON.stringify(saved));
          }
        } catch (err) {
          console.warn('Font storage error:', err);
        }

        const newStyle = document.createElement('style');
        newStyle.appendChild(document.createTextNode(`
          @font-face {
            font-family: '${fontName}';
            src: url('${fontData}');
          }
        `));
        document.head.appendChild(newStyle);

        const fontSelect = document.getElementById('input-font-family');
        if (fontSelect) {
          const opt = document.createElement('option');
          opt.value = fontName;
          opt.textContent = `Custom: ${fontName}`;
          opt.selected = true;
          fontSelect.prepend(opt);
        }

        if (this.player) {
          this.player.setStyle({ fontFamily: fontName });
        }

        if (window.showToast) window.showToast(`✨ Custom font <b>${fontName}</b> loaded & saved!`);
      };

      reader.readAsDataURL(file);
    });
  }

  initExportModal() {
    const exportBtn = document.getElementById('btn-open-export');
    const modal = document.getElementById('modal-export');
    const closeBtn = document.getElementById('btn-close-export');
    const confirmExportBtn = document.getElementById('btn-confirm-export');

    if (exportBtn && modal) {
      exportBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.style.setProperty('display', 'none', 'important');
      });
    }

    if (confirmExportBtn) {
      confirmExportBtn.addEventListener('click', async () => {
        const exportType = document.querySelector('input[name="export-format"]:checked')?.value || 'mp4';
        const exportRes = document.querySelector('input[name="export-res"]:checked')?.value || '1080p';

        const captions = (this.timeline && this.timeline.timeline && this.timeline.timeline.captions) 
          ? this.timeline.timeline.captions 
          : (this.segments || []);

        const proj = window.currentProject || {};

        confirmExportBtn.disabled = true;

        try {
          if (exportType === 'srt') {
            this.exportSRT(captions, proj.title);
            if (modal) {
              modal.classList.add('hidden');
              modal.style.setProperty('display', 'none', 'important');
            }
          } else if (exportType === 'vtt') {
            this.exportVTT(captions, proj.title);
            if (modal) {
              modal.classList.add('hidden');
              modal.style.setProperty('display', 'none', 'important');
            }
          } else {
            // Rendered Video (MP4) with burned-in captions, or Alpha channel overlay
            await this.exportCanvasVideo({
              exportType,
              exportRes,
              captions,
              proj,
              confirmExportBtn,
              modal
            });
          }
        } catch (err) {
          console.error('[EXPORT ERROR]', err);
          if (window.showToast) {
            window.showToast('Export error: ' + (err.message || 'Export failed'), true);
          }
        } finally {
          confirmExportBtn.disabled = false;
          confirmExportBtn.innerHTML = `
            <span>Download Now</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          `;
        }
      });
    }
  }

  // ─── SUBTITLE EXPORTERS (.SRT & .VTT) ──────────────────────────────────

  exportSRT(captions, title) {
    const formatTime = (sec) => {
      const s = Math.max(0, Number(sec) || 0);
      const hrs = Math.floor(s / 3600);
      const mins = Math.floor((s % 3600) / 60);
      const secs = Math.floor(s % 60);
      const ms = Math.floor((s % 1) * 1000);
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    };

    const srtContent = (captions || []).map((c, i) => {
      const start = c.startTime !== undefined ? c.startTime : (c.start || 0);
      const end = c.endTime !== undefined ? c.endTime : (c.end || start + 2);
      return `${i + 1}\n${formatTime(start)} --> ${formatTime(end)}\n${(c.text || '').trim()}\n`;
    }).join('\n');

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const filename = `${(title || 'video_captions').replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_')}.srt`;
    this.downloadBlob(blob, filename);

    if (window.showToast) {
      window.showToast(`📄 SubRip Subtitles Exported: <b>${filename}</b>`);
    }
  }

  exportVTT(captions, title) {
    const formatTime = (sec) => {
      const s = Math.max(0, Number(sec) || 0);
      const hrs = Math.floor(s / 3600);
      const mins = Math.floor((s % 3600) / 60);
      const secs = Math.floor(s % 60);
      const ms = Math.floor((s % 1) * 1000);
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    };

    let vttContent = "WEBVTT\n\n";
    vttContent += (captions || []).map((c, i) => {
      const start = c.startTime !== undefined ? c.startTime : (c.start || 0);
      const end = c.endTime !== undefined ? c.endTime : (c.end || start + 2);
      return `${i + 1}\n${formatTime(start)} --> ${formatTime(end)}\n${(c.text || '').trim()}\n`;
    }).join('\n');

    const blob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8' });
    const filename = `${(title || 'video_captions').replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_')}.vtt`;
    this.downloadBlob(blob, filename);

    if (window.showToast) {
      window.showToast(`🌐 WebVTT Subtitles Exported: <b>${filename}</b>`);
    }
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // ─── CLIENT-SIDE CANVAS VIDEO RENDERER (BURN-IN CAPTIONS) ─────────────

  async exportCanvasVideo({ exportType, exportRes, captions, proj, confirmExportBtn, modal }) {
    const videoEl = this.player?.video || document.getElementById('main-video-player');
    const videoSrc = proj.video_url || videoEl?.src || '/static/assets/demo_video.mp4';

    if (!videoSrc) {
      throw new Error('No video source available for rendering.');
    }

    // Determine dimensions based on aspect ratio & export resolution
    const isLandscape = this.player?.aspectRatio === '16:9';
    const isSquare = this.player?.aspectRatio === '1:1';

    let width = 1080;
    let height = 1920;
    if (exportRes === '4k') {
      width = isLandscape ? 3840 : (isSquare ? 2160 : 2160);
      height = isLandscape ? 2160 : (isSquare ? 2160 : 3840);
    } else if (exportRes === '720p') {
      width = isLandscape ? 1280 : (isSquare ? 720 : 720);
      height = isLandscape ? 720 : (isSquare ? 720 : 1280);
    } else {
      width = isLandscape ? 1920 : (isSquare ? 1080 : 1080);
      height = isLandscape ? 1080 : (isSquare ? 1080 : 1920);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: exportType === 'alpha' });

    // Off-screen render video element
    const renderVideo = document.createElement('video');
    renderVideo.src = videoSrc;
    renderVideo.crossOrigin = 'anonymous';
    renderVideo.playsInline = true;
    renderVideo.muted = false;

    await new Promise((resolve) => {
      renderVideo.onloadedmetadata = resolve;
      renderVideo.onerror = () => resolve();
      setTimeout(resolve, 3000);
    });

    const totalDuration = renderVideo.duration && !isNaN(renderVideo.duration) && renderVideo.duration > 0
      ? renderVideo.duration
      : (proj.duration || 15.0);

    // Setup canvas stream and hook audio from video stream
    const canvasStream = canvas.captureStream(30);
    try {
      const vidStream = renderVideo.captureStream ? renderVideo.captureStream() : (renderVideo.mozCaptureStream ? renderVideo.mozCaptureStream() : null);
      if (vidStream) {
        const audioTracks = vidStream.getAudioTracks();
        if (audioTracks.length > 0) {
          canvasStream.addTrack(audioTracks[0]);
        }
      }
    } catch (e) {
      console.warn("Audio stream track note:", e);
    }

    let mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4;codecs=avc1';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

    const chunks = [];
    const bitrate = exportRes === '4k' ? 16000000 : (exportRes === '1080p' ? 8000000 : 4000000);
    const recorder = new MediaRecorder(canvasStream, {
      mimeType,
      videoBitsPerSecond: bitrate
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const stopPromise = new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const filename = `${(proj.title || 'harsh_video').replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_')}_captioned.${ext}`;
        this.downloadBlob(blob, filename);
        resolve(filename);
      };
    });

    recorder.start(100);

    // Start video playback
    try {
      await renderVideo.play();
    } catch (playErr) {
      renderVideo.muted = true;
      await renderVideo.play();
    }

    const style = this.player?.currentStyle || (window.TEMPLATES && window.TEMPLATES[0]?.style) || {};

    // Animation & rendering frame loop
    await new Promise((resolve) => {
      let isDone = false;

      const finish = () => {
        if (isDone) return;
        isDone = true;
        renderVideo.pause();
        try { recorder.requestData(); } catch(_) {}
        recorder.stop();
        resolve();
      };

      const renderLoop = () => {
        if (isDone) return;

        const curTime = renderVideo.currentTime;

        // 1. Draw video background
        if (exportType === 'alpha') {
          ctx.clearRect(0, 0, width, height);
        } else {
          try {
            ctx.drawImage(renderVideo, 0, 0, width, height);
          } catch(drawErr) {}
        }

        // 2. Draw burned-in captions
        this.drawCaptionsToCanvas(ctx, curTime, captions, style, width, height);

        // 3. Update Progress UI
        const percent = Math.min(99, Math.max(1, Math.round((curTime / totalDuration) * 100)));
        confirmExportBtn.innerHTML = `
          <span class="inline-flex items-center gap-2">
            <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
            Burning Captions (${percent}%)...
          </span>
        `;

        if (curTime >= totalDuration - 0.05 || renderVideo.ended) {
          finish();
        } else {
          requestAnimationFrame(renderLoop);
        }
      };

      renderVideo.addEventListener('ended', finish);
      requestAnimationFrame(renderLoop);
    });

    const savedFile = await stopPromise;
    if (modal) {
      modal.classList.add('hidden');
      modal.style.setProperty('display', 'none', 'important');
    }
    if (window.showToast) {
      window.showToast(`🎉 Exported with Burned-In Captions: <b>${savedFile}</b>`);
    }
  }

  drawCaptionsToCanvas(ctx, now, captions, s, width, height) {
    if (!captions || captions.length === 0) return;

    // Find active caption
    const activeCap = captions.find(c => {
      const st = Number(c.startTime !== undefined ? c.startTime : c.start);
      const et = Number(c.endTime !== undefined ? c.endTime : c.end);
      return now >= (st - 0.03) && now <= (et + 0.05);
    });

    if (!activeCap || !activeCap.text) return;

    const rawWords = activeCap.text.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return;

    const capStart = Number(activeCap.startTime !== undefined ? activeCap.startTime : activeCap.start);
    const capEnd = Number(activeCap.endTime !== undefined ? activeCap.endTime : activeCap.end);
    const capDur = Math.max(0.1, capEnd - capStart);
    const wordDur = capDur / rawWords.length;
    const words = rawWords.map((w, i) => ({
      word: w,
      start: capStart + (i * wordDur),
      end: capStart + ((i + 1) * wordDur)
    }));

    // Scale factor: Preview is based on ~360px width
    const scaleFactor = Math.max(1, width / 360);
    const baseFontSize = Number(s.fontSize || 30);
    const fontSize = Math.round(baseFontSize * scaleFactor);

    // Font setup
    const fontFamily = s.fontFamily || 'Montserrat';
    const fontWeight = s.fontWeight || '900';
    ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = 'middle';

    // Text transform helper
    const transformText = (txt) => {
      if (s.textTransform === 'uppercase') return txt.toUpperCase();
      if (s.textTransform === 'lowercase') return txt.toLowerCase();
      if (s.textTransform === 'capitalize') return txt.charAt(0).toUpperCase() + txt.slice(1);
      return txt;
    };

    // Determine visible words based on displayMode
    const displayMode = s.displayMode || this.player?.displayMode || 'chunk';
    let visibleWords = [];

    if (displayMode === 'single') {
      const activeWord = words.find(w => now >= (w.start - 0.02) && now <= (w.end + 0.05));
      visibleWords = [activeWord || words[0]];
    } else if (displayMode === 'full') {
      visibleWords = words;
    } else {
      // Chunk mode (2-3 words)
      const chunkSize = 3;
      const activeWordIdx = words.findIndex(w => now >= (w.start - 0.02) && now <= (w.end + 0.05));
      let chunkStart = 0;
      if (activeWordIdx >= 0) {
        chunkStart = Math.floor(activeWordIdx / chunkSize) * chunkSize;
      }
      visibleWords = words.slice(chunkStart, chunkStart + chunkSize);
    }

    // Measure words
    const spaceWidth = ctx.measureText(' ').width;
    const measuredWords = visibleWords.map(w => {
      const transformed = transformText(w.word);
      return {
        ...w,
        transformed,
        width: ctx.measureText(transformed).width
      };
    });

    const totalTextWidth = measuredWords.reduce((acc, w) => acc + w.width, 0) + (spaceWidth * Math.max(0, measuredWords.length - 1));

    // Calculate center coordinates
    const posX = s.posX !== undefined ? s.posX : 50;
    const posY = s.posY !== undefined ? s.posY : 78;
    const targetCenterX = (posX / 100) * width;
    const targetCenterY = (posY / 100) * height;

    let startX = targetCenterX - (totalTextWidth / 2);
    if (s.textAlign === 'left') startX = targetCenterX;
    else if (s.textAlign === 'right') startX = targetCenterX - totalTextWidth;

    // Draw background box if enabled
    if (s.bgBox) {
      const padX = 18 * scaleFactor;
      const padY = 10 * scaleFactor;
      const boxHeight = fontSize * 1.35;
      const boxWidth = totalTextWidth + (padX * 2);
      const boxX = startX - padX;
      const boxY = targetCenterY - (boxHeight / 2);
      const radius = 10 * scaleFactor;

      ctx.save();
      ctx.fillStyle = s.bgColor || 'rgba(0,0,0,0.75)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
      } else {
        ctx.rect(boxX, boxY, boxWidth, boxHeight);
      }
      ctx.fill();
      ctx.restore();
    }

    // Draw individual words with animations / highlights
    let curX = startX;

    measuredWords.forEach(w => {
      const isWordActive = (now >= (w.start - 0.02) && now <= (w.end + 0.05));
      ctx.save();

      // Shadow
      if (s.shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.95)';
        ctx.shadowBlur = 8 * scaleFactor;
        ctx.shadowOffsetY = 3 * scaleFactor;
      }

      if (isWordActive) {
        const hlColor = s.highlightColor || '#FFE600';
        ctx.fillStyle = hlColor;
        ctx.shadowColor = hlColor;
        ctx.shadowBlur = 12 * scaleFactor;
      } else {
        ctx.fillStyle = s.color || '#FFFFFF';
      }

      // Stroke
      if (s.strokeWidth > 0) {
        const strokePx = Math.min(s.strokeWidth * scaleFactor, 8 * scaleFactor);
        ctx.lineWidth = strokePx;
        ctx.strokeStyle = s.strokeColor || '#000000';
        ctx.lineJoin = 'round';
        ctx.strokeText(w.transformed, curX, targetCenterY);
      }

      // Fill
      ctx.fillText(w.transformed, curX, targetCenterY);
      ctx.restore();

      curX += w.width + spaceWidth;
    });
  }

  initInspectorDOM() {
    const tabs = ['text', 'templates', 'transitions', 'audio'];
    tabs.forEach(tab => {
      const btn = document.getElementById(`tab-btn-${tab}`);
      const content = document.getElementById(`tab-content-${tab}`);
      if (btn && content) {
        btn.addEventListener('click', () => {
          tabs.forEach(t => {
            const b = document.getElementById(`tab-btn-${t}`);
            const c = document.getElementById(`tab-content-${t}`);
            if (b) b.className = 'px-3 py-2 text-xs font-medium text-[#94A3B8] hover:text-white border-b-2 border-transparent';
            if (c) c.classList.add('hidden');
          });
          btn.className = 'px-3 py-2 text-xs font-bold text-[#6366F1] border-b-2 border-[#6366F1]';
          content.classList.remove('hidden');
        });
      }
    });

    const btnChunk = document.getElementById('btn-display-chunk');
    const btnSingle = document.getElementById('btn-display-single');
    const btnFull = document.getElementById('btn-display-full');

    const updateDisplayModeBtns = (mode) => {
      if (btnChunk) btnChunk.className = mode === 'chunk' ? 'py-1.5 px-2 rounded-lg text-[11px] font-bold bg-[#6366F1] text-white transition' : 'py-1.5 px-2 rounded-lg text-[11px] font-medium text-[#94A3B8] hover:text-white transition';
      if (btnSingle) btnSingle.className = mode === 'single' ? 'py-1.5 px-2 rounded-lg text-[11px] font-bold bg-[#6366F1] text-white transition' : 'py-1.5 px-2 rounded-lg text-[11px] font-medium text-[#94A3B8] hover:text-white transition';
      if (btnFull) btnFull.className = mode === 'full' ? 'py-1.5 px-2 rounded-lg text-[11px] font-bold bg-[#6366F1] text-white transition' : 'py-1.5 px-2 rounded-lg text-[11px] font-medium text-[#94A3B8] hover:text-white transition';
    };

    if (btnChunk) {
      btnChunk.addEventListener('click', () => {
        this.player.setStyle({ displayMode: 'chunk' });
        updateDisplayModeBtns('chunk');
      });
    }
    if (btnSingle) {
      btnSingle.addEventListener('click', () => {
        this.player.setStyle({ displayMode: 'single' });
        updateDisplayModeBtns('single');
      });
    }
    if (btnFull) {
      btnFull.addEventListener('click', () => {
        this.player.setStyle({ displayMode: 'full' });
        updateDisplayModeBtns('full');
      });
    }

    const fontSelect = document.getElementById('input-font-family');
    const fontWeight = document.getElementById('input-font-weight');
    const fontSizeSlider = document.getElementById('slider-font-size');
    const fontSizeDisplay = document.getElementById('display-font-size');

    if (fontSelect) fontSelect.addEventListener('change', (e) => this.player.setStyle({ fontFamily: e.target.value }));
    if (fontWeight) fontWeight.addEventListener('change', (e) => this.player.setStyle({ fontWeight: e.target.value }));
    if (fontSizeSlider && fontSizeDisplay) {
      fontSizeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        fontSizeDisplay.textContent = `${val} px`;
        this.player.setStyle({ fontSize: val });
      });
    }

    const btnUpper = document.getElementById('btn-case-upper');
    const btnTitle = document.getElementById('btn-case-title');
    const btnLower = document.getElementById('btn-case-lower');

    if (btnUpper) btnUpper.addEventListener('click', () => this.player.setStyle({ textTransform: 'uppercase' }));
    if (btnTitle) btnTitle.addEventListener('click', () => this.player.setStyle({ textTransform: 'capitalize' }));
    if (btnLower) btnLower.addEventListener('click', () => this.player.setStyle({ textTransform: 'lowercase' }));

    const btnAlignLeft = document.getElementById('btn-align-left');
    const btnAlignCenter = document.getElementById('btn-align-center');
    const btnAlignRight = document.getElementById('btn-align-right');

    if (btnAlignLeft) btnAlignLeft.addEventListener('click', () => this.player.setStyle({ textAlign: 'left' }));
    if (btnAlignCenter) btnAlignCenter.addEventListener('click', () => this.player.setStyle({ textAlign: 'center' }));
    if (btnAlignRight) btnAlignRight.addEventListener('click', () => this.player.setStyle({ textAlign: 'right' }));

    const posXInput = document.getElementById('input-pos-x');
    const posYInput = document.getElementById('input-pos-y');
    const btnResetPos = document.getElementById('btn-reset-pos');

    if (posXInput) posXInput.addEventListener('change', (e) => this.player.setStyle({ posX: parseFloat(e.target.value) }));
    if (posYInput) posYInput.addEventListener('change', (e) => this.player.setStyle({ posY: parseFloat(e.target.value) }));
    if (btnResetPos) {
      btnResetPos.addEventListener('click', () => {
        this.player.setStyle({ posX: 50, posY: 80 });
        this.updatePositionInputs(50, 80);
      });
    }

    const primaryColorInput = document.getElementById('input-primary-color');
    if (primaryColorInput) {
      primaryColorInput.addEventListener('input', (e) => this.player.setStyle({ color: e.target.value }));
    }

    const emphasisBtns = document.querySelectorAll('.emphasis-color-btn');
    emphasisBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color');
        this.player.setStyle({ highlightColor: color });
        emphasisBtns.forEach(b => b.classList.remove('ring-2', 'ring-white'));
        btn.classList.add('ring-2', 'ring-white');
      });
    });

    const strokeToggle = document.getElementById('toggle-stroke');
    const shadowToggle = document.getElementById('toggle-shadow');
    const bgBoxToggle = document.getElementById('toggle-bg-box');

    if (strokeToggle) strokeToggle.addEventListener('change', (e) => this.player.setStyle({ strokeWidth: e.target.checked ? 2 : 0 }));
    if (shadowToggle) shadowToggle.addEventListener('change', (e) => this.player.setStyle({ shadow: e.target.checked }));
    if (bgBoxToggle) bgBoxToggle.addEventListener('change', (e) => this.player.setStyle({ bgBox: e.target.checked, bgColor: 'rgba(0,0,0,0.75)' }));
  }

  updatePositionInputs(x, y) {
    const posXInput = document.getElementById('input-pos-x');
    const posYInput = document.getElementById('input-pos-y');
    if (posXInput) posXInput.value = `${x.toFixed(1)} %`;
    if (posYInput) posYInput.value = `${y.toFixed(1)} %`;
  }

  initTemplatesGrid() {
    const grid = document.getElementById('templates-grid');
    if (!grid) return;

    grid.innerHTML = '';
    TEMPLATES.forEach(tpl => {
      const card = document.createElement('div');
      card.className = `template-card p-3 flex flex-col gap-2 ${tpl.id === 'hormozi' ? 'selected' : ''}`;
      card.id = `template-card-${tpl.id}`;
      
      card.innerHTML = `
        <div class="h-20 bg-[#0B0E12] rounded-lg flex items-center justify-center border border-[#1A222C] relative overflow-hidden">
          <span style="font-family: ${tpl.style.fontFamily}; font-weight: ${tpl.style.fontWeight}; color: ${tpl.style.color}; ${tpl.style.strokeWidth ? `-webkit-text-stroke: 1.5px ${tpl.style.strokeColor}; paint-order: stroke fill;` : ''} font-size: 15px; text-transform: ${tpl.style.textTransform};">
            <span style="color: ${tpl.style.highlightColor};">${tpl.previewText.split(' ')[0]}</span> ${tpl.previewText.split(' ').slice(1).join(' ')}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs font-semibold text-white">${tpl.name}</div>
            <div class="text-[10px] text-[#6B7280]">${tpl.creator}</div>
          </div>
          <span class="w-2 h-2 rounded-full ${tpl.id === 'hormozi' ? 'bg-[#6366F1]' : 'bg-[#232D3B]'}"></span>
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.player.setStyle(tpl.style);
        this.syncInspectorControls(tpl.style);
      });

      grid.appendChild(card);
    });
  }

  syncInspectorControls(style) {
    const fontSelect = document.getElementById('input-font-family');
    const fontWeight = document.getElementById('input-font-weight');
    const fontSizeSlider = document.getElementById('slider-font-size');
    const fontSizeDisplay = document.getElementById('display-font-size');
    const strokeToggle = document.getElementById('toggle-stroke');
    const shadowToggle = document.getElementById('toggle-shadow');
    const bgBoxToggle = document.getElementById('toggle-bg-box');

    if (fontSelect && style.fontFamily) fontSelect.value = style.fontFamily;
    if (fontWeight && style.fontWeight) fontWeight.value = style.fontWeight;
    if (fontSizeSlider && style.fontSize) {
      fontSizeSlider.value = style.fontSize;
      if (fontSizeDisplay) fontSizeDisplay.textContent = `${style.fontSize} px`;
    }
    if (strokeToggle) strokeToggle.checked = (style.strokeWidth > 0);
    if (shadowToggle) shadowToggle.checked = !!style.shadow;
    if (bgBoxToggle) bgBoxToggle.checked = !!style.bgBox;
    if (style.posX && style.posY) this.updatePositionInputs(style.posX, style.posY);

    const mode = style.displayMode || 'chunk';
    const btnChunk = document.getElementById('btn-display-chunk');
    const btnSingle = document.getElementById('btn-display-single');
    const btnFull = document.getElementById('btn-display-full');

    if (btnChunk) btnChunk.className = mode === 'chunk' ? 'py-1.5 px-2 rounded-lg text-[11px] font-bold bg-[#6366F1] text-white transition' : 'py-1.5 px-2 rounded-lg text-[11px] font-medium text-[#94A3B8] hover:text-white transition';
    if (btnSingle) btnSingle.className = mode === 'single' ? 'py-1.5 px-2 rounded-lg text-[11px] font-bold bg-[#6366F1] text-white transition' : 'py-1.5 px-2 rounded-lg text-[11px] font-medium text-[#94A3B8] hover:text-white transition';
    if (btnFull) btnFull.className = mode === 'full' ? 'py-1.5 px-2 rounded-lg text-[11px] font-bold bg-[#6366F1] text-white transition' : 'py-1.5 px-2 rounded-lg text-[11px] font-medium text-[#94A3B8] hover:text-white transition';

    const currentAnim = style.animation || 'pop';
    document.querySelectorAll('.btn-anim-select').forEach(btn => {
      const animVal = btn.getAttribute('data-anim');
      if (animVal === currentAnim) {
        btn.className = 'btn-anim-select p-3 bg-[#6366F1]/20 border border-[#6366F1] rounded-2xl text-xs font-bold text-white shadow-lg text-left flex items-center justify-between group';
      } else {
        btn.className = 'btn-anim-select p-3 bg-[#10162A] border border-[#1E293B] hover:border-[#6366F1] rounded-2xl text-xs font-bold text-white transition text-left flex items-center justify-between group';
      }
    });
  }

  initAnimationTabDOM() {
    const buttons = document.querySelectorAll('.btn-anim-select');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const anim = btn.getAttribute('data-anim') || 'pop';
        this.player.setStyle({ animation: anim });
        
        buttons.forEach(b => {
          b.className = 'btn-anim-select p-3 bg-[#10162A] border border-[#1E293B] hover:border-[#6366F1] rounded-2xl text-xs font-bold text-white transition text-left flex items-center justify-between group';
        });
        btn.className = 'btn-anim-select p-3 bg-[#6366F1]/20 border border-[#6366F1] rounded-2xl text-xs font-bold text-white shadow-lg text-left flex items-center justify-between group';
        
        if (window.showToast) {
          window.showToast(`✨ Caption animation: <b>${anim.toUpperCase()}</b>`);
        }
      });
    });
  }

  // ─── TRANSCRIPT DOM & IN-EDITOR AUTO-CAPTION GENERATION ───────────────

  initTranscriptDOM() {
    const searchInput = document.getElementById('transcript-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.transcript-line-item');
        items.forEach(item => {
          const text = item.getAttribute('data-text').toLowerCase();
          item.style.display = text.includes(q) ? 'flex' : 'none';
        });
      });
    }

    // Direct In-Editor "Generate Captions" Trigger
    const genBtn = document.getElementById('btn-editor-generate-captions');
    if (genBtn) {
      genBtn.addEventListener('click', async () => {
        const proj = window.currentProject;
        const videoSrc = proj?.file_path || proj?.video_url || this.player?.video?.src;

        genBtn.disabled = true;
        const originalHtml = genBtn.innerHTML;

        const updateBtnStatus = (text) => {
          genBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white inline" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>${text}</span>
          `;
        };

        try {
          updateBtnStatus('Preparing audio...');

          // 1. Locate media file in application state or recover from blob URL
          let mediaFile = window.uploadedVideo?.file || window.currentProject?.file;

          if (!mediaFile && videoSrc && videoSrc.startsWith('blob:')) {
            try {
              const blobRes = await fetch(videoSrc);
              const recoveredBlob = await blobRes.blob();
              mediaFile = new File([recoveredBlob], proj?.filename || 'video.mp4', {
                type: recoveredBlob.type || 'video/mp4'
              });
              if (window.uploadedVideo) window.uploadedVideo.file = mediaFile;
              if (proj) proj.file = mediaFile;
            } catch (be) {
              console.warn('Could not recover blob from memory:', be);
            }
          }

          if (!mediaFile && !proj?.file_path && !proj?.video_url && (!this.player || !this.player.video || !this.player.video.src)) {
            if (window.showToast) window.showToast('Please upload or select a video first to generate captions.', true);
            genBtn.disabled = false;
            genBtn.innerHTML = originalHtml;
            return;
          }

          // 2. Language selection
          const langSelect = document.getElementById('editor-caption-language');
          const selectedLang = langSelect ? langSelect.value : 'hinglish';
          let writingScript = 'roman';
          if (selectedLang === 'hindi') {
            writingScript = 'native';
          } else if (selectedLang === 'english') {
            writingScript = 'latin';
          }

          // 3. Construct FormData
          const formData = new FormData();
          if (mediaFile) {
            formData.append('file', mediaFile, mediaFile.name || 'video.mp4');
          }
          formData.append('file_path', proj?.file_path || '');
          formData.append('video_url', proj?.video_url || '');
          formData.append('filename', proj?.filename || (mediaFile ? mediaFile.name : ''));
          formData.append('language', selectedLang);
          formData.append('script', writingScript);
          formData.append('audio_enhance', 'true');
          formData.append('emojis', 'true');

          updateBtnStatus('Transcribing audio...');

          let apiBase = (typeof window.getApiBase === 'function') ? window.getApiBase() : (window.API_BASE || '');
          if (window.location.protocol === 'https:' && apiBase.startsWith('http://')) {
            apiBase = apiBase.replace(/^http:\/\//i, 'https://');
          }
          const res = await fetch(`${apiBase}/api/transcribe`, {
            method: 'POST',
            body: formData
          });

          updateBtnStatus('Generating timestamps...');

          const contentType = res.headers.get('content-type') || '';
          if (!res.ok) {
            let errMsg = `Transcription failed (${res.status})`;
            if (contentType.includes('application/json')) {
              try {
                const errData = await res.json();
                errMsg = errData.error || errData.message || errMsg;
              } catch (e) {}
            } else {
              const text = await res.text();
              const clean = text.replace(/<[^>]*>?/gm, ' ').trim();
              if (clean) errMsg = clean.slice(0, 140);
            }
            throw new Error(errMsg);
          }

          const data = await res.json();

          updateBtnStatus('Creating captions...');

          if (data.success) {
            const captions = data.captions || [];
            if (!data.has_speech || captions.length === 0) {
              if (window.showToast) {
                window.showToast('No detectable speech found in this video audio.', true);
              } else {
                alert('No detectable speech found in this video audio.');
              }
            } else {
              // Update project metadata if server returned file_path or video_url
              if (data.file_path && window.currentProject) {
                window.currentProject.file_path = data.file_path;
              }
              if (data.video_url && window.currentProject && (!window.currentProject.video_url || window.currentProject.video_url.startsWith('blob:'))) {
                window.currentProject.video_url = data.video_url;
              }

              if (this.timeline) {
                this.timeline.setCaptions(captions);
              }
              this.renderTranscriptList();
              if (this.player) this.player.render();
              if (window.saveCurrentProject) window.saveCurrentProject();

              if (window.showToast) {
                window.showToast(`✨ ${captions.length} captions generated successfully (${data.language || selectedLang})!`);
              }

              if (data.remaining_credits !== undefined) {
                localStorage.setItem('hcg_credits', String(data.remaining_credits));
                const credDisplay = document.getElementById('header-credits');
                if (credDisplay) credDisplay.textContent = data.remaining_credits;
                const sideCred = document.getElementById('sidebar-credits-display');
                if (sideCred) sideCred.textContent = data.remaining_credits;
              }
            }

            genBtn.innerHTML = `
              <svg class="w-3.5 h-3.5 text-[#10B981] inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
              <span>Captions Generated!</span>
            `;
            setTimeout(() => {
              genBtn.innerHTML = originalHtml;
              genBtn.disabled = false;
            }, 2000);
            return;
          } else {
            throw new Error(data.error || 'Failed to transcribe');
          }
        } catch (err) {
          console.error('Transcription error:', err);
          if (window.showToast) {
            window.showToast('Transcription error: ' + err.message, true);
          }
          genBtn.innerHTML = originalHtml;
          genBtn.disabled = false;
        }
      });
    }

    // "+ Add" caption button
    const addCapBtn = document.getElementById('btn-editor-add-caption');
    if (addCapBtn) {
      addCapBtn.addEventListener('click', () => {
        const text = prompt('Enter new caption text:');
        if (!text || !text.trim()) return;

        this.pushStateToHistory();
        const curTime = this.player ? this.player.currentTime : 0;
        const newCap = {
          id: `caption_${Date.now().toString().slice(-4)}`,
          text: text.trim(),
          startTime: Math.round(curTime * 100) / 100,
          endTime: Math.round((curTime + 2.0) * 100) / 100,
          originalText: text.trim(),
          language: 'hinglish',
          confidence: 1.0,
          videoClipId: this.timeline?.selectedClipId || 'clip_001',
          isEdited: true
        };

        if (this.timeline) {
          this.timeline.timeline.captions.push(newCap);
          this.timeline.timeline.captions.sort((a, b) => a.startTime - b.startTime);
          this.timeline.renderCaptionBlocks();
        }
        this.renderTranscriptList();
        if (this.player) this.player.render();
        if (window.saveCurrentProject) window.saveCurrentProject();
      });
    }
  }

  // ─── TRANSCRIPT LIST RENDERING ────────────────────────────────────────

  renderTranscriptList() {
    const listContainer = document.getElementById('transcript-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const captions = this.timeline ? this.timeline.timeline.captions : (this.segments || []);

    if (captions.length === 0) {
      listContainer.innerHTML = `
        <div class="p-6 text-center text-[#64748B] flex flex-col items-center justify-center space-y-2">
          <span class="text-2xl">🎙️</span>
          <div class="text-xs font-semibold text-[#94A3B8]">No captions generated yet</div>
          <div class="text-[11px] text-[#64748B]">Click "⚡ Generate Captions" above to transcribe video audio automatically!</div>
        </div>
      `;
      return;
    }

    captions.forEach((cap, idx) => {
      const row = document.createElement('div');
      row.className = 'transcript-line-item flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-[#151C24] border border-[#1E293B]/40 hover:border-[#6366F1]/40 transition group cursor-pointer';
      row.setAttribute('data-text', cap.text);
      row.setAttribute('data-cap-id', cap.id);

      // Line ID
      const numSpan = document.createElement('div');
      numSpan.className = 'text-[10px] font-mono font-bold text-[#818CF8] pt-0.5 select-none w-7 shrink-0 truncate';
      numSpan.textContent = cap.id;

      // Caption Content
      const contentBox = document.createElement('div');
      contentBox.className = 'flex-1 min-w-0 flex flex-col gap-1';

      const timingBadge = document.createElement('div');
      timingBadge.className = 'text-[10px] font-mono text-[#64748B] flex items-center gap-1.5';
      timingBadge.innerHTML = `
        <span class="text-[#10B981]">${cap.startTime.toFixed(2)}s</span>
        <span>→</span>
        <span class="text-[#38BDF8]">${cap.endTime.toFixed(2)}s</span>
        ${cap.isEdited ? '<span class="text-[9px] px-1 py-0.2 rounded bg-[#F59E0B]/20 text-[#F59E0B] font-sans font-bold">edited</span>' : ''}
      `;

      const textSpan = document.createElement('div');
      textSpan.className = 'text-xs text-white leading-relaxed select-text font-medium';
      textSpan.textContent = cap.text;

      contentBox.appendChild(timingBadge);
      contentBox.appendChild(textSpan);

      // Double click text to edit in-place
      textSpan.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const updated = prompt('Edit Caption Text:', cap.text);
        if (updated !== null && updated.trim() !== '') {
          this.pushStateToHistory();
          cap.text = updated.trim();
          cap.isEdited = true;
          this.renderTranscriptList();
          if (this.timeline) this.timeline.renderCaptionBlocks();
          if (this.player) this.player.render();
          if (window.saveCurrentProject) window.saveCurrentProject();
        }
      });

      // Quick Actions
      const actions = document.createElement('div');
      actions.className = 'opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition text-[#94A3B8] pt-0.5';

      const splitBtn = document.createElement('button');
      splitBtn.className = 'p-1 hover:text-white hover:bg-[#232D3B] rounded-lg transition';
      splitBtn.title = 'Split caption in two';
      splitBtn.innerHTML = `<svg class="w-3.5 h-3.5 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"/></svg>`;
      splitBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.splitCaption(cap.id);
      });

      const dupBtn = document.createElement('button');
      dupBtn.className = 'p-1 hover:text-white hover:bg-[#232D3B] rounded-lg transition';
      dupBtn.title = 'Duplicate caption';
      dupBtn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>`;
      dupBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.duplicateCaption(cap.id);
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'p-1 hover:text-red-400 hover:bg-[#232D3B] rounded-lg transition';
      delBtn.title = 'Delete caption';
      delBtn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`;
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteCaption(cap.id);
      });

      actions.appendChild(splitBtn);
      actions.appendChild(dupBtn);
      actions.appendChild(delBtn);

      row.appendChild(numSpan);
      row.appendChild(contentBox);
      row.appendChild(actions);

      row.addEventListener('click', () => {
        if (this.player) this.player.seek(cap.startTime);
      });

      listContainer.appendChild(row);
    });
  }

  highlightTranscriptItem(captionId) {
    const items = document.querySelectorAll('.transcript-line-item');
    items.forEach(item => {
      if (captionId && item.getAttribute('data-cap-id') === captionId) {
        item.classList.add('bg-[#6366F1]/20', 'border-[#6366F1]/70');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('bg-[#6366F1]/20', 'border-[#6366F1]/70');
      }
    });
  }

  splitCaption(captionId) {
    if (!this.timeline) return;
    const caps = this.timeline.timeline.captions;
    const idx = caps.findIndex(c => c.id === captionId);
    if (idx < 0) return;

    const cap = caps[idx];
    const words = cap.text.split(/\s+/).filter(Boolean);
    if (words.length <= 1) {
      if (window.showToast) window.showToast('Caption mein kam se kam 2 words hone chahiye split karne ke liye.', true);
      return;
    }

    this.pushStateToHistory();
    const mid = Math.floor(words.length / 2);
    const midTime = Math.round(((cap.startTime + cap.endTime) / 2) * 100) / 100;

    const part1 = {
      ...cap,
      id: cap.id,
      text: words.slice(0, mid).join(' '),
      startTime: cap.startTime,
      endTime: midTime,
      isEdited: true
    };

    const part2 = {
      ...cap,
      id: `${cap.id}_part2`,
      text: words.slice(mid).join(' '),
      startTime: midTime,
      endTime: cap.endTime,
      isEdited: true
    };

    caps.splice(idx, 1, part1, part2);
    caps.sort((a, b) => a.startTime - b.startTime);

    this.renderTranscriptList();
    this.timeline.renderCaptionBlocks();
    if (this.player) this.player.render();
    if (window.saveCurrentProject) window.saveCurrentProject();
    if (window.showToast) window.showToast('✂️ Caption split ho gaya!');
  }

  duplicateCaption(captionId) {
    if (!this.timeline) return;
    const caps = this.timeline.timeline.captions;
    const idx = caps.findIndex(c => c.id === captionId);
    if (idx < 0) return;

    this.pushStateToHistory();
    const cap = caps[idx];
    const dur = cap.endTime - cap.startTime;
    const newStart = Math.round((cap.endTime + 0.1) * 100) / 100;
    const newEnd = Math.round((newStart + dur) * 100) / 100;

    const newCap = {
      ...cap,
      id: `${cap.id}_copy`,
      startTime: newStart,
      endTime: newEnd,
      isEdited: true
    };

    caps.splice(idx + 1, 0, newCap);
    caps.sort((a, b) => a.startTime - b.startTime);

    this.renderTranscriptList();
    this.timeline.renderCaptionBlocks();
    if (this.player) this.player.render();
    if (window.saveCurrentProject) window.saveCurrentProject();
    if (window.showToast) window.showToast('📋 Caption duplicate ho gaya!');
  }

  deleteCaption(captionId) {
    if (!this.timeline) return;
    const caps = this.timeline.timeline.captions;
    const idx = caps.findIndex(c => c.id === captionId);
    if (idx < 0) return;

    if (confirm(`Delete caption "${caps[idx].text}"?`)) {
      this.pushStateToHistory();
      caps.splice(idx, 1);
      this.renderTranscriptList();
      this.timeline.renderCaptionBlocks();
      if (this.player) this.player.render();
      if (window.saveCurrentProject) window.saveCurrentProject();
      if (window.showToast) window.showToast('🗑️ Caption delete ho gaya!');
    }
  }
}

window.KalakarEditor = KalakarEditor;
