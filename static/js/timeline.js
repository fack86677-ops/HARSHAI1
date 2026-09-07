// Single Horizontal Track Multi-track Timeline Visualizer with Interactive NLE Video & Caption Editing
// Adheres strictly to the authoritative Caption, VideoClip, and Timeline data model specification

class KalakarTimeline {
  constructor(containerElement, player) {
    this.container = containerElement;
    this.player = player;
    
    // Authoritative Timeline Data Model
    this.timeline = {
      duration: 15.0,
      currentTime: 0.0,
      videoClips: [],
      captions: []
    };

    this.sourceFileId = 'video_001';
    this.sourceDuration = 15.0;
    this.videoFilename = 'video.mp4';
    this.selectedClipId = null;
    this.selectedCaptionId = null;

    this.zoom = 1.0;
    this.pixelsPerSecond = 80;
    this.mode = 'word'; // 'word' or 'line'
    this.audioPeaks = null;
    this._eventsBound = false;

    this.initDOM();
    this.initEvents();
  }

  // ─── DOM INITIALIZATION ──────────────────────────────────────────────

  initDOM() {
    this.container.innerHTML = `
      <!-- Vertical Timeline Resize Bar Handle -->
      <div id="timeline-resizer-handle" class="h-2.5 bg-[#10162A] hover:bg-[#6366F1] cursor-row-resize flex items-center justify-center transition group border-t border-[#1E293B]" title="Drag up/down to adjust timeline height">
        <div class="w-10 h-1 bg-[#334155] group-hover:bg-[#6366F1] rounded-full"></div>
      </div>

      <div class="flex items-center justify-between px-4 py-2 border-b border-[#1E293B] bg-[#080C1B] text-xs shrink-0 select-none">
        <!-- Left Tools: Captions & Video NLE Tools -->
        <div class="flex items-center gap-2.5">
          <!-- Caption Mode Switcher -->
          <div class="flex bg-[#10162A] p-0.5 rounded-lg border border-[#1E293B]">
            <button id="timeline-mode-word" class="px-2.5 py-1 rounded font-bold text-[10px] bg-[#6366F1] text-white transition shadow-sm">WORD</button>
            <button id="timeline-mode-line" class="px-2.5 py-1 rounded font-medium text-[10px] text-[#94A3B8] hover:text-white transition">LINE</button>
          </div>

          <!-- Caption Actions -->
          <button id="btn-add-word" class="flex items-center gap-1 px-2.5 py-1 bg-[#10162A] hover:bg-[#182242] border border-[#1E293B] hover:border-[#6366F1]/50 rounded-lg text-white font-medium text-[11px] transition" title="Add new caption at current playhead">
            <span>+ Caption</span>
          </button>
          <button id="btn-split-word" title="Split caption at playhead" class="p-1.5 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#10162A] border border-[#1E293B] transition flex items-center gap-1 text-[11px]">
            <svg class="w-3.5 h-3.5 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"/></svg>
            <span>Split Cap</span>
          </button>

          <div class="w-[1px] h-4 bg-[#1E293B]"></div>

          <!-- Video NLE Actions -->
          <button id="btn-split-video" class="flex items-center gap-1.5 px-2.5 py-1 bg-[#0284C7]/20 hover:bg-[#0284C7]/30 border border-[#0284C7]/40 rounded-lg text-[#38BDF8] font-bold text-[11px] transition shadow-sm" title="Split video clip at playhead position">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v10M16 7v10M12 4v16"/></svg>
            <span>Split Clip</span>
          </button>
          <button id="btn-delete-clip" class="flex items-center gap-1.5 px-2 py-1 bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/35 rounded-lg text-[#F87171] font-bold text-[11px] transition" title="Delete currently selected video clip">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            <span>Delete Clip</span>
          </button>
          <button id="btn-reset-video" class="p-1.5 text-[#64748B] hover:text-[#94A3B8] rounded-lg hover:bg-[#10162A] transition" title="Reset video clips to original">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>

        <!-- Right Tools: Timeline Zoom -->
        <div class="flex items-center gap-3">
          <span class="text-[#64748B] text-[11px] font-semibold">Zoom:</span>
          <button id="btn-zoom-out" class="text-[#94A3B8] hover:text-white p-1 rounded hover:bg-[#10162A] transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
          </button>
          <input id="timeline-zoom-slider" type="range" min="0.5" max="3.5" step="0.1" value="1.0" class="w-20 accent-[#6366F1] h-1.5 bg-[#1E293B] rounded cursor-pointer" />
          <button id="btn-zoom-in" class="text-[#94A3B8] hover:text-white p-1 rounded hover:bg-[#10162A] transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          </button>
        </div>
      </div>

      <div class="relative flex-1 overflow-x-auto overflow-y-hidden bg-[#050814] select-none" id="timeline-scroll-area">
        <div id="timeline-track-wrapper" class="relative h-full" style="min-width: 100%; width: 1200px;">
          <!-- Time Ruler -->
          <div id="timeline-ruler" class="h-6 border-b border-[#1E293B] flex items-center text-[10px] text-[#64748B] relative"></div>

          <!-- Single Horizontal Track 1: Captions Track -->
          <div class="flex items-center h-10 border-b border-[#1E293B]/70 relative">
            <div class="w-20 px-3 flex items-center gap-1 text-[11px] font-bold text-[#F59E0B] shrink-0 sticky left-0 z-30 bg-[#080C1B]/95 backdrop-blur border-r border-[#1E293B]">
              <span>✨ Captions</span>
            </div>
            <div id="captions-track-content" class="relative flex-1 h-full overflow-visible whitespace-nowrap"></div>
          </div>

          <!-- Track 2: Interactive Video Track (Multi-clip NLE) -->
          <div class="flex items-center h-8 border-b border-[#1E293B]/70 relative">
            <div class="w-20 px-3 flex items-center gap-1 text-[11px] font-semibold text-[#38BDF8] shrink-0 sticky left-0 z-30 bg-[#080C1B]/95 backdrop-blur border-r border-[#1E293B]">
              <span>📹 Video</span>
            </div>
            <div id="video-track-content" class="relative flex-1 h-full flex items-center px-1 overflow-visible"></div>
          </div>

          <!-- Track 3: Audio Waveform Track -->
          <div class="flex items-center h-9 relative">
            <div class="w-20 px-3 flex items-center gap-1 text-[11px] font-semibold text-[#10B981] shrink-0 sticky left-0 z-30 bg-[#080C1B]/95 backdrop-blur border-r border-[#1E293B]">
              <span>🔊 Audio</span>
            </div>
            <div id="audio-track-content" class="relative flex-1 h-full flex items-center px-1">
              <div id="audio-waveform-container" class="h-7 w-full bg-[#059669]/15 border border-[#059669]/30 rounded-lg overflow-hidden flex items-center gap-0.5 px-1"></div>
            </div>
          </div>

          <!-- Red Playhead Scrubber -->
          <div id="timeline-playhead" class="timeline-playhead" style="left: 80px;"></div>
        </div>
      </div>
    `;

    this.rulerEl = document.getElementById('timeline-ruler');
    this.trackWrapperEl = document.getElementById('timeline-track-wrapper');
    this.captionsTrackEl = document.getElementById('captions-track-content');
    this.videoTrackEl = document.getElementById('video-track-content');
    this.audioWaveformEl = document.getElementById('audio-waveform-container');
    this.playheadEl = document.getElementById('timeline-playhead');
    this.scrollAreaEl = document.getElementById('timeline-scroll-area');

    this.initVerticalResizer();
    this.generateWaveformBars();
  }

  initVerticalResizer() {
    const handle = document.getElementById('timeline-resizer-handle');
    if (!handle || !this.container) return;

    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizing = true;
      startY = e.clientY;
      startHeight = this.container.getBoundingClientRect().height;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (moveEvt) => {
        if (!isResizing) return;
        const deltaY = startY - moveEvt.clientY;
        const newHeight = Math.max(130, Math.min(500, startHeight + deltaY));
        this.container.style.height = `${newHeight}px`;
      };

      const onMouseUp = () => {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  // ─── DATA INITIALIZATION & VALIDATION ────────────────────────────────

  setVideoSource(sourceFileId, filename, sourceDuration) {
    this.sourceFileId = sourceFileId || 'video_001';
    this.videoFilename = filename || 'video.mp4';
    this.sourceDuration = (sourceDuration && !isNaN(sourceDuration) && sourceDuration > 0) ? sourceDuration : 15.0;

    // Initialize default single clip if no clips exist
    if (!this.timeline.videoClips || this.timeline.videoClips.length === 0) {
      this.timeline.videoClips = [{
        id: 'clip_001',
        sourceFileId: this.sourceFileId,
        sourceStartTime: 0,
        sourceEndTime: this.sourceDuration,
        timelineStartTime: 0,
        timelineEndTime: this.sourceDuration,
        duration: this.sourceDuration
      }];
      this.selectedClipId = 'clip_001';
    }

    this.recalculateTimelineFromClips();
    this.updateDimensions();
  }

  setVideoFilename(name) {
    this.videoFilename = name || 'video.mp4';
    this.renderVideoClips();
  }

  setDuration(duration) {
    if (!duration || isNaN(duration) || duration <= 0) return;
    this.sourceDuration = duration;
    if (!this.timeline.videoClips || this.timeline.videoClips.length === 0) {
      this.timeline.videoClips = [{
        id: 'clip_001',
        sourceFileId: this.sourceFileId,
        sourceStartTime: 0,
        sourceEndTime: duration,
        timelineStartTime: 0,
        timelineEndTime: duration,
        duration: duration
      }];
      this.selectedClipId = 'clip_001';
    } else if (this.timeline.videoClips.length === 1 && this.timeline.videoClips[0].sourceEndTime === 15.0) {
      this.timeline.videoClips[0].sourceEndTime = duration;
      this.timeline.videoClips[0].duration = duration;
    }
    this.recalculateTimelineFromClips();
    this.updateDimensions();
  }

  // Set and validate captions according to exact user data model
  setCaptions(newCaptions) {
    if (!Array.isArray(newCaptions)) newCaptions = [];

    const fallbackClipId = this.timeline.videoClips[0]?.id || 'clip_001';
    const validated = [];

    newCaptions.forEach((c, idx) => {
      // Support incoming objects with either startTime/endTime or start/end
      const sTime = typeof c.startTime === 'number' ? c.startTime : (typeof c.start === 'number' ? c.start : 0.0);
      const eTime = typeof c.endTime === 'number' ? c.endTime : (typeof c.end === 'number' ? c.end : sTime + 1.0);
      const textVal = String(c.text || '').trim();

      if (!textVal) return; // Disallow empty caption text

      // Preserve or generate word-level timings
      let capWords = Array.isArray(c.words) ? c.words.map(w => ({
        word: String(w.word || '').trim(),
        start: typeof w.start === 'number' ? Math.round(w.start * 1000) / 1000 : Math.round(sTime * 1000) / 1000,
        end: typeof w.end === 'number' ? Math.round(w.end * 1000) / 1000 : Math.round(eTime * 1000) / 1000
      })).filter(w => w.word.length > 0) : [];

      if (capWords.length === 0 && textVal.length > 0) {
        const tokens = textVal.split(/\s+/).filter(Boolean);
        const dur = Math.max(0.1, eTime - sTime);
        const wDur = dur / Math.max(1, tokens.length);
        capWords = tokens.map((tok, i) => ({
          word: tok,
          start: Math.round((sTime + (i * wDur)) * 1000) / 1000,
          end: Math.round((sTime + ((i + 1) * wDur)) * 1000) / 1000
        }));
      }

      const captionObj = {
        id: c.id ? String(c.id) : `caption_${String(idx + 1).padStart(3, '0')}`,
        text: textVal,
        startTime: Math.max(0, Math.round(sTime * 1000) / 1000),
        endTime: Math.max(Math.round((sTime + 0.05) * 1000) / 1000, Math.round(eTime * 1000) / 1000),
        originalText: c.originalText || textVal,
        language: c.language || 'hinglish',
        confidence: typeof c.confidence === 'number' ? c.confidence : 0.94,
        videoClipId: c.videoClipId || fallbackClipId,
        isEdited: Boolean(c.isEdited),
        words: capWords
      };

      // Caption validation rules
      if (captionObj.startTime >= 0 && captionObj.endTime > captionObj.startTime) {
        validated.push(captionObj);
      }
    });

    // Enforce unique caption IDs
    const idSet = new Set();
    validated.forEach((c, i) => {
      if (idSet.has(c.id)) {
        c.id = `caption_${String(i + 1).padStart(3, '0')}`;
      }
      idSet.add(c.id);
    });

    // Always sort captions by startTime ASC
    validated.sort((a, b) => a.startTime - b.startTime);

    this.timeline.captions = validated;

    // Adjust timeline duration if captions exceed it
    const lastCap = this.timeline.captions[this.timeline.captions.length - 1];
    if (lastCap && lastCap.endTime > this.timeline.duration) {
      this.timeline.duration = lastCap.endTime;
    }

    this.updateDimensions();
  }

  // Legacy bridge for existing editor calls
  setSegments(segments) {
    this.setCaptions(segments);
  }

  get segments() {
    return this.timeline.captions;
  }

  get duration() {
    return this.timeline.duration;
  }

  // ─── NLE TIMELINE MATHEMATICS & SYNCHRONIZATION ───────────────────────

  recalculateTimelineFromClips() {
    let accumulated = 0;
    this.timeline.videoClips.forEach(clip => {
      clip.duration = Math.max(0.05, Math.round((clip.sourceEndTime - clip.sourceStartTime) * 1000) / 1000);
      clip.timelineStartTime = Math.round(accumulated * 1000) / 1000;
      clip.timelineEndTime = Math.round((accumulated + clip.duration) * 1000) / 1000;
      accumulated += clip.duration;
    });

    this.timeline.duration = Math.max(0.1, Math.round(accumulated * 1000) / 1000);
    this.timeline.currentTime = Math.max(0, Math.min(this.timeline.duration, this.timeline.currentTime));
    
    if (this.player) {
      this.player.duration = this.timeline.duration;
    }
  }

  // ─── VIDEO CLIP EDITING (TRIM, SPLIT, DELETE) ──────────────────────────

  // 1. SPLIT VIDEO CLIP AT PLAYHEAD
  splitVideoClipAt(splitTime) {
    const curTime = splitTime !== undefined ? splitTime : this.timeline.currentTime;
    
    // Locate the video clip currently spanning curTime
    const clipIdx = this.timeline.videoClips.findIndex(c => curTime > (c.timelineStartTime + 0.1) && curTime < (c.timelineEndTime - 0.1));
    if (clipIdx < 0) {
      if (window.showToast) window.showToast('Video ko split karne ke liye playhead ko kisi clip ke beech mein rakhein.', true);
      return false;
    }

    if (window.kalakarEditor?.pushStateToHistory) {
      window.kalakarEditor.pushStateToHistory();
    }

    const origClip = this.timeline.videoClips[clipIdx];
    const offset = curTime - origClip.timelineStartTime;
    const splitSourceTime = Math.round((origClip.sourceStartTime + offset) * 1000) / 1000;

    const clip1Id = origClip.id;
    const clip2Id = `${origClip.id}_part2`;

    const clip1 = {
      id: clip1Id,
      sourceFileId: origClip.sourceFileId,
      sourceStartTime: origClip.sourceStartTime,
      sourceEndTime: splitSourceTime,
      timelineStartTime: origClip.timelineStartTime,
      timelineEndTime: curTime,
      duration: Math.round((splitSourceTime - origClip.sourceStartTime) * 1000) / 1000
    };

    const clip2 = {
      id: clip2Id,
      sourceFileId: origClip.sourceFileId,
      sourceStartTime: splitSourceTime,
      sourceEndTime: origClip.sourceEndTime,
      timelineStartTime: curTime,
      timelineEndTime: origClip.timelineEndTime,
      duration: Math.round((origClip.sourceEndTime - splitSourceTime) * 1000) / 1000
    };

    this.timeline.videoClips.splice(clipIdx, 1, clip1, clip2);
    this.selectedClipId = clip2Id;
    this.recalculateTimelineFromClips();

    // ─── SPLIT CAPTION BEHAVIOR ───
    // If a caption crosses the video split point, split into two caption objects
    const newCaptions = [];
    this.timeline.captions.forEach(cap => {
      if (cap.startTime < curTime && cap.endTime > curTime) {
        // Intersecting caption: split text across split point
        const words = cap.text.split(/\s+/).filter(Boolean);
        const ratio = (curTime - cap.startTime) / (cap.endTime - cap.startTime);
        const splitWordIdx = Math.max(1, Math.min(words.length - 1, Math.round(words.length * ratio)));

        const textPart1 = words.slice(0, splitWordIdx).join(' ');
        const textPart2 = words.slice(splitWordIdx).join(' ');

        const capPart1 = {
          ...cap,
          id: cap.id,
          text: textPart1,
          startTime: cap.startTime,
          endTime: curTime,
          videoClipId: clip1Id,
          isEdited: true
        };

        const capPart2 = {
          ...cap,
          id: `${cap.id}_part2`,
          text: textPart2,
          startTime: curTime,
          endTime: cap.endTime,
          videoClipId: clip2Id,
          isEdited: true
        };

        newCaptions.push(capPart1, capPart2);
      } else if (cap.startTime >= curTime && cap.videoClipId === origClip.id) {
        // Re-assign downstream caption to clip2
        newCaptions.push({
          ...cap,
          videoClipId: clip2Id
        });
      } else {
        newCaptions.push(cap);
      }
    });

    this.timeline.captions = newCaptions;
    this.timeline.captions.sort((a, b) => a.startTime - b.startTime);

    this.updateDimensions();
    if (window.kalakarEditor) window.kalakarEditor.setSegments(this.timeline.captions);
    if (this.player) this.player.render();
    if (window.showToast) window.showToast('✂️ Video clip split ho gayi!');
    return true;
  }

  // 2. DELETE VIDEO CLIP
  deleteVideoClip(clipId) {
    const targetId = clipId || this.selectedClipId;
    if (!targetId) {
      if (window.showToast) window.showToast('Pehle delete karne ke liye kisi video clip par click karein.', true);
      return false;
    }

    if (this.timeline.videoClips.length <= 1) {
      if (window.showToast) window.showToast('Timeline mein kam se kam ek video clip hona zaroori hai.', true);
      return false;
    }

    const clipIdx = this.timeline.videoClips.findIndex(c => c.id === targetId);
    if (clipIdx < 0) return false;

    if (window.kalakarEditor?.pushStateToHistory) {
      window.kalakarEditor.pushStateToHistory();
    }

    const deletedClip = this.timeline.videoClips[clipIdx];
    const delStart = deletedClip.timelineStartTime;
    const delEnd = deletedClip.timelineEndTime;
    const delDur = deletedClip.duration;

    this.timeline.videoClips.splice(clipIdx, 1);
    this.selectedClipId = this.timeline.videoClips[Math.max(0, clipIdx - 1)]?.id || null;

    // ─── DELETE / TRIM CAPTION BEHAVIOR ───
    // 1. Remove captions completely inside deleted section
    // 2. Trim captions that partially intersect deleted section
    // 3. Shift all captions after deleted section backward by exact deleted duration
    const remainingCaptions = [];
    this.timeline.captions.forEach(cap => {
      if (cap.videoClipId === deletedClip.id || (cap.startTime >= delStart && cap.endTime <= delEnd)) {
        // Completely inside deleted section: remove
        return;
      }

      let s = cap.startTime;
      let e = cap.endTime;

      if (s < delStart && e > delStart && e <= delEnd) {
        // Truncate right edge
        e = delStart;
      } else if (s >= delStart && s < delEnd && e > delEnd) {
        // Truncate left edge
        s = delStart;
        e = e - delDur;
      } else if (s >= delEnd) {
        // Shift backward
        s = Math.max(0, Math.round((s - delDur) * 1000) / 1000);
        e = Math.max(s + 0.05, Math.round((e - delDur) * 1000) / 1000);
      }

      if (e > s) {
        remainingCaptions.push({
          ...cap,
          startTime: s,
          endTime: e
        });
      }
    });

    this.timeline.captions = remainingCaptions;
    this.recalculateTimelineFromClips();
    this.timeline.captions.sort((a, b) => a.startTime - b.startTime);

    this.updateDimensions();
    if (window.kalakarEditor) window.kalakarEditor.setSegments(this.timeline.captions);
    if (this.player) {
      this.player.seek(Math.min(this.timeline.currentTime, this.timeline.duration));
      this.player.render();
    }
    if (window.showToast) window.showToast('🗑️ Video clip delete ho gayi!');
    return true;
  }

  // 3. RESET VIDEO CLIPS TO ORIGINAL UNTRIMMED STATE
  resetVideoClips() {
    if (window.kalakarEditor?.pushStateToHistory) {
      window.kalakarEditor.pushStateToHistory();
    }

    this.timeline.videoClips = [{
      id: 'clip_001',
      sourceFileId: this.sourceFileId,
      sourceStartTime: 0,
      sourceEndTime: this.sourceDuration,
      timelineStartTime: 0,
      timelineEndTime: this.sourceDuration,
      duration: this.sourceDuration
    }];
    this.selectedClipId = 'clip_001';

    // Re-anchor all captions to clip_001
    this.timeline.captions.forEach(c => {
      c.videoClipId = 'clip_001';
    });

    this.recalculateTimelineFromClips();
    this.updateDimensions();
    if (window.kalakarEditor) window.kalakarEditor.setSegments(this.timeline.captions);
    if (this.player) this.player.render();
    if (window.showToast) window.showToast('↺ Video clips reset ho gayi!');
  }

  // ─── RENDERING TIMELINE COMPONENTS ────────────────────────────────────

  updateDimensions() {
    if (!this.trackWrapperEl) return;
    const totalWidth = Math.max(900, (this.timeline.duration * this.pixelsPerSecond * this.zoom) + 140);
    this.trackWrapperEl.style.width = `${totalWidth}px`;
    this.renderRuler();
    this.renderVideoClips();
    this.renderCaptionBlocks();
    this.renderWaveform();
  }

  renderRuler() {
    if (!this.rulerEl) return;
    this.rulerEl.innerHTML = '';

    let step = 1.0;
    if (this.timeline.duration > 300) step = 10.0;
    else if (this.timeline.duration > 120) step = 5.0;
    else if (this.timeline.duration > 60) step = 2.0;
    else if (this.zoom > 1.5) step = 0.5;

    const offsetLeft = 80;

    for (let t = 0; t <= this.timeline.duration + 0.05; t += step) {
      const x = offsetLeft + (t * this.pixelsPerSecond * this.zoom);
      const marker = document.createElement('div');
      marker.className = 'absolute top-0 bottom-0 flex flex-col justify-end pointer-events-none';
      marker.style.left = `${x}px`;

      const mm = Math.floor(t / 60);
      const ss = Math.floor(t % 60);
      const ms = Math.round((t % 1) * 10);
      const label = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${ms}`;

      marker.innerHTML = `
        <span class="text-[9px] text-[#64748B] leading-none mb-1 select-none font-mono">${label}</span>
        <div class="h-2 w-[1px] bg-[#1E293B]"></div>
      `;
      this.rulerEl.appendChild(marker);
    }
  }

  renderVideoClips() {
    if (!this.videoTrackEl) return;
    this.videoTrackEl.innerHTML = '';

    this.timeline.videoClips.forEach((clip, idx) => {
      const startX = (clip.timelineStartTime * this.pixelsPerSecond * this.zoom);
      const clipWidth = Math.max(40, (clip.duration * this.pixelsPerSecond * this.zoom) - 2);

      const block = document.createElement('div');
      const isSelected = (clip.id === this.selectedClipId);
      block.className = `video-clip-block ${isSelected ? 'selected' : ''}`;
      block.style.left = `${startX}px`;
      block.style.width = `${clipWidth}px`;
      block.dataset.clipId = clip.id;
      block.title = `${clip.id}: ${clip.duration.toFixed(2)}s (${clip.sourceStartTime.toFixed(1)}s - ${clip.sourceEndTime.toFixed(1)}s)\n• Drag left/right edge to trim\n• Click to select for Split/Delete`;

      // Trim Left Handle
      const leftHandle = document.createElement('div');
      leftHandle.className = 'video-clip-trim-handle video-clip-trim-left';
      leftHandle.title = 'Drag to trim clip start';

      // Title & duration
      const infoSpan = document.createElement('div');
      infoSpan.className = 'px-2 flex items-center gap-1.5 overflow-hidden text-[10px] pointer-events-none';
      infoSpan.innerHTML = `
        <span class="font-extrabold truncate text-white">${clip.id}</span>
        <span class="text-[9px] font-mono opacity-80">${clip.duration.toFixed(1)}s</span>
      `;

      // Trim Right Handle
      const rightHandle = document.createElement('div');
      rightHandle.className = 'video-clip-trim-handle video-clip-trim-right';
      rightHandle.title = 'Drag to trim clip end';

      block.appendChild(leftHandle);
      block.appendChild(infoSpan);
      block.appendChild(rightHandle);

      // Select Clip on click
      block.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedClipId = clip.id;
        this.renderVideoClips();
      });

      // ─── LEFT TRIM HANDLE DRAG ───
      leftHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const startMouseX = e.clientX;
        const origSourceStart = clip.sourceStartTime;
        const maxSourceStart = clip.sourceEndTime - 0.2;

        const onMouseMove = (moveEvt) => {
          const deltaX = moveEvt.clientX - startMouseX;
          const deltaSec = deltaX / (this.pixelsPerSecond * this.zoom);
          clip.sourceStartTime = Math.max(0, Math.min(maxSourceStart, Math.round((origSourceStart + deltaSec) * 100) / 100));
          this.recalculateTimelineFromClips();
          this.updateDimensions();
          if (this.player) {
            this.player.seek(clip.timelineStartTime);
            this.player.render();
          }
        };

        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          if (window.kalakarEditor?.pushStateToHistory) window.kalakarEditor.pushStateToHistory();
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });

      // ─── RIGHT TRIM HANDLE DRAG ───
      rightHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const startMouseX = e.clientX;
        const origSourceEnd = clip.sourceEndTime;
        const minSourceEnd = clip.sourceStartTime + 0.2;

        const onMouseMove = (moveEvt) => {
          const deltaX = moveEvt.clientX - startMouseX;
          const deltaSec = deltaX / (this.pixelsPerSecond * this.zoom);
          clip.sourceEndTime = Math.max(minSourceEnd, Math.min(this.sourceDuration, Math.round((origSourceEnd + deltaSec) * 100) / 100));
          this.recalculateTimelineFromClips();
          this.updateDimensions();
          if (this.player) {
            this.player.seek(clip.timelineEndTime - 0.05);
            this.player.render();
          }
        };

        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          if (window.kalakarEditor?.pushStateToHistory) window.kalakarEditor.pushStateToHistory();
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });

      this.videoTrackEl.appendChild(block);
    });
  }

  // ─── CAPTION TRACK RENDERING (WORD-LEVEL BLOCKS & LINE BLOCKS) ───────────

  renderCaptionBlocks() {
    if (!this.captionsTrackEl) return;
    this.captionsTrackEl.innerHTML = '';

    if (this.mode === 'word') {
      // ─── 1. WORD-LEVEL BLOCKS (INDIVIDUAL SLEEK BLOCKS PER WORD) ───
      this.timeline.captions.forEach((caption) => {
        const words = (caption.words && caption.words.length > 0)
          ? caption.words
          : caption.text.split(/\s+/).filter(Boolean).map((w, i, arr) => {
              const dur = Math.max(0.1, caption.endTime - caption.startTime);
              const wd = dur / arr.length;
              return {
                word: w,
                start: Math.round((caption.startTime + (i * wd)) * 1000) / 1000,
                end: Math.round((caption.startTime + ((i + 1) * wd)) * 1000) / 1000
              };
            });

        words.forEach((w, wIdx) => {
          const startX = (w.start * this.pixelsPerSecond * this.zoom);
          const blockWidth = Math.max(26, ((w.end - w.start) * this.pixelsPerSecond * this.zoom) - 2);

          const block = document.createElement('div');
          block.className = 'timeline-word-block caption-block flex items-center justify-between group/word relative select-none rounded bg-[#4F46E5]/35 hover:bg-[#6366F1] border border-[#818CF8]/40 hover:border-[#818CF8] text-white transition-all cursor-pointer shadow-sm';
          block.style.position = 'absolute';
          block.style.top = '6px';
          block.style.height = '28px';
          block.style.left = `${startX}px`;
          block.style.width = `${blockWidth}px`;
          block.dataset.captionId = caption.id;
          block.dataset.wordIdx = String(wIdx);
          block.dataset.start = String(w.start);
          block.dataset.end = String(w.end);
          block.title = `Word: "${w.word}"\n${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s\n• Click to seek\n• Drag edges to adjust\n• Double click to edit`;

          // Trim Left Handle
          const leftHandle = document.createElement('div');
          leftHandle.className = 'absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-[#34D399] bg-transparent group-hover/word:bg-white/40 transition z-20 rounded-l';

          // Word Text
          const textSpan = document.createElement('span');
          textSpan.className = 'truncate px-1 pointer-events-none text-[10px] font-bold text-white leading-none whitespace-nowrap overflow-hidden text-center flex-1';
          textSpan.textContent = w.word;

          // Trim Right Handle
          const rightHandle = document.createElement('div');
          rightHandle.className = 'absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-[#34D399] bg-transparent group-hover/word:bg-white/40 transition z-20 rounded-r';

          block.appendChild(leftHandle);
          block.appendChild(textSpan);
          block.appendChild(rightHandle);

          // Click: seek to word start
          block.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectedCaptionId = caption.id;
            if (this.player) this.player.seek(w.start);
          });

          // Double click: edit word text
          block.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const newWord = prompt('Edit Word:', w.word);
            if (newWord !== null && newWord.trim() !== '') {
              w.word = newWord.trim();
              caption.text = words.map(x => x.word).join(' ');
              caption.isEdited = true;
              this.renderCaptionBlocks();
              if (this.player) this.player.render();
              if (window.kalakarEditor?.renderTranscriptList) window.kalakarEditor.renderTranscriptList();
              if (window.saveCurrentProject) window.saveCurrentProject();
            }
          });

          // Left Trim Handle Drag (Adjust word start)
          leftHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const startMouseX = e.clientX;
            const origStart = w.start;

            const onMouseMove = (moveEvt) => {
              const deltaX = moveEvt.clientX - startMouseX;
              const deltaSec = deltaX / (this.pixelsPerSecond * this.zoom);
              w.start = Math.max(0, Math.min(w.end - 0.05, Math.round((origStart + deltaSec) * 100) / 100));
              if (wIdx === 0) caption.startTime = w.start;
              block.style.left = `${w.start * this.pixelsPerSecond * this.zoom}px`;
              block.style.width = `${Math.max(20, ((w.end - w.start) * this.pixelsPerSecond * this.zoom) - 2)}px`;
              block.dataset.start = String(w.start);
            };

            const onMouseUp = () => {
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
              caption.isEdited = true;
              this.renderCaptionBlocks();
              if (this.player) this.player.render();
              if (window.kalakarEditor?.renderTranscriptList) window.kalakarEditor.renderTranscriptList();
              if (window.kalakarEditor?.pushStateToHistory) window.kalakarEditor.pushStateToHistory();
              if (window.saveCurrentProject) window.saveCurrentProject();
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
          });

          // Right Trim Handle Drag (Adjust word end)
          rightHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const startMouseX = e.clientX;
            const origEnd = w.end;

            const onMouseMove = (moveEvt) => {
              const deltaX = moveEvt.clientX - startMouseX;
              const deltaSec = deltaX / (this.pixelsPerSecond * this.zoom);
              w.end = Math.max(w.start + 0.05, Math.min(this.timeline.duration, Math.round((origEnd + deltaSec) * 100) / 100));
              if (wIdx === words.length - 1) caption.endTime = w.end;
              block.style.width = `${Math.max(20, ((w.end - w.start) * this.pixelsPerSecond * this.zoom) - 2)}px`;
              block.dataset.end = String(w.end);
            };

            const onMouseUp = () => {
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
              caption.isEdited = true;
              this.renderCaptionBlocks();
              if (this.player) this.player.render();
              if (window.kalakarEditor?.renderTranscriptList) window.kalakarEditor.renderTranscriptList();
              if (window.kalakarEditor?.pushStateToHistory) window.kalakarEditor.pushStateToHistory();
              if (window.saveCurrentProject) window.saveCurrentProject();
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
          });

          this.captionsTrackEl.appendChild(block);
        });
      });
    } else {
      // ─── 2. LINE-LEVEL BLOCKS (FULL SENTENCE BLOCKS) ───
      this.timeline.captions.forEach(caption => {
        const startX = (caption.startTime * this.pixelsPerSecond * this.zoom);
        const blockWidth = Math.max(30, ((caption.endTime - caption.startTime) * this.pixelsPerSecond * this.zoom) - 3);

        const block = document.createElement('div');
        block.className = 'caption-block flex items-center justify-between group/block relative select-none';
        block.style.left = `${startX}px`;
        block.style.width = `${blockWidth}px`;
        block.dataset.captionId = caption.id;
        block.dataset.start = String(caption.startTime);
        block.dataset.end = String(caption.endTime);
        block.title = `${caption.text}\n(${caption.startTime.toFixed(2)}s - ${caption.endTime.toFixed(2)}s)`;

        // Trim Left Handle
        const leftHandle = document.createElement('div');
        leftHandle.className = 'absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-[#6366F1] bg-[#6366F1]/50 opacity-0 group-hover/block:opacity-100 transition z-20 rounded-l';

        const textSpan = document.createElement('span');
        textSpan.className = 'truncate px-1.5 pointer-events-none text-[10px] font-bold text-white leading-none whitespace-nowrap overflow-hidden flex-1 text-center';
        textSpan.textContent = caption.text;

        const rightHandle = document.createElement('div');
        rightHandle.className = 'absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-[#6366F1] bg-[#6366F1]/50 opacity-0 group-hover/block:opacity-100 transition z-20 rounded-r';

        block.appendChild(leftHandle);
        block.appendChild(textSpan);
        block.appendChild(rightHandle);

        block.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const newText = prompt('Edit Caption Text:', caption.text);
          if (newText !== null && newText.trim() !== '') {
            caption.text = newText.trim();
            caption.isEdited = true;
            this.renderCaptionBlocks();
            if (this.player) this.player.render();
            if (window.kalakarEditor?.renderTranscriptList) window.kalakarEditor.renderTranscriptList();
            if (window.saveCurrentProject) window.saveCurrentProject();
          }
        });

        block.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectedCaptionId = caption.id;
          if (this.player) this.player.seek(caption.startTime);
        });

        // Block Drag & Move
        block.addEventListener('mousedown', (e) => {
          if (e.target === leftHandle || e.target === rightHandle) return;
          e.stopPropagation();
          const startMouseX = e.clientX;
          const origStart = caption.startTime;
          const origEnd = caption.endTime;
          const blockDur = origEnd - origStart;

          const onMouseMove = (moveEvt) => {
            const deltaX = moveEvt.clientX - startMouseX;
            const deltaSec = deltaX / (this.pixelsPerSecond * this.zoom);
            const newStart = Math.max(0, Math.min(this.timeline.duration - blockDur, Math.round((origStart + deltaSec) * 100) / 100));
            caption.startTime = newStart;
            caption.endTime = Math.round((newStart + blockDur) * 100) / 100;
            caption.isEdited = true;

            this.timeline.captions.sort((a, b) => a.startTime - b.startTime);
            this.renderCaptionBlocks();
            if (this.player) this.player.render();
            if (window.kalakarEditor?.renderTranscriptList) window.kalakarEditor.renderTranscriptList();
          };

          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            if (window.kalakarEditor?.pushStateToHistory) window.kalakarEditor.pushStateToHistory();
            if (window.saveCurrentProject) window.saveCurrentProject();
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });

        // Left Trim
        leftHandle.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          const startMouseX = e.clientX;
          const origStart = caption.startTime;

          const onMouseMove = (moveEvt) => {
            const deltaX = moveEvt.clientX - startMouseX;
            const deltaSec = deltaX / (this.pixelsPerSecond * this.zoom);
            caption.startTime = Math.max(0, Math.min(caption.endTime - 0.08, Math.round((origStart + deltaSec) * 100) / 100));
            caption.isEdited = true;
            this.timeline.captions.sort((a, b) => a.startTime - b.startTime);
            this.renderCaptionBlocks();
            if (this.player) this.player.render();
            if (window.kalakarEditor?.renderTranscriptList) window.kalakarEditor.renderTranscriptList();
          };

          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            if (window.kalakarEditor?.pushStateToHistory) window.kalakarEditor.pushStateToHistory();
            if (window.saveCurrentProject) window.saveCurrentProject();
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });

        // Right Trim
        rightHandle.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          const startMouseX = e.clientX;
          const origEnd = caption.endTime;

          const onMouseMove = (moveEvt) => {
            const deltaX = moveEvt.clientX - startMouseX;
            const deltaSec = deltaX / (this.pixelsPerSecond * this.zoom);
            caption.endTime = Math.max(caption.startTime + 0.08, Math.min(this.timeline.duration, Math.round((origEnd + deltaSec) * 100) / 100));
            caption.isEdited = true;
            this.timeline.captions.sort((a, b) => a.startTime - b.startTime);
            this.renderCaptionBlocks();
            if (this.player) this.player.render();
            if (window.kalakarEditor?.renderTranscriptList) window.kalakarEditor.renderTranscriptList();
          };

          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            if (window.kalakarEditor?.pushStateToHistory) window.kalakarEditor.pushStateToHistory();
            if (window.saveCurrentProject) window.saveCurrentProject();
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });

        this.captionsTrackEl.appendChild(block);
      });
    }

    this.updatePlayhead(this.timeline.currentTime);
  }

  // ─── PLAYHEAD & SCRUBBING (SINGLE SOURCE OF TRUTH) ─────────────────────

  setCurrentTime(timeInSeconds) {
    this.timeline.currentTime = Math.max(0, Math.min(this.timeline.duration, timeInSeconds));
    this.updatePlayhead(this.timeline.currentTime);
  }

  updatePlayhead(timeInSeconds) {
    if (!this.playheadEl) return;
    const offsetLeft = 80;
    const x = offsetLeft + (timeInSeconds * this.pixelsPerSecond * this.zoom);
    this.playheadEl.style.left = `${x}px`;

    // Highlight active caption block
    if (this.captionsTrackEl) {
      const blocks = this.captionsTrackEl.querySelectorAll('.caption-block');
      blocks.forEach(b => {
        const start = parseFloat(b.dataset.start);
        const end = parseFloat(b.dataset.end);
        if (timeInSeconds >= (start - 0.02) && timeInSeconds <= (end + 0.05)) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    }

    // Auto-scroll timeline smoothly during playback
    if (this.player && this.player.isPlaying && this.scrollAreaEl) {
      const scrollLeft = this.scrollAreaEl.scrollLeft;
      const clientWidth = this.scrollAreaEl.clientWidth;
      if (x > (scrollLeft + clientWidth - 100)) {
        this.scrollAreaEl.scrollLeft = x - 120;
      } else if (x < scrollLeft + 80) {
        this.scrollAreaEl.scrollLeft = Math.max(0, x - 100);
      }
    }
  }

  // ─── AUDIO WAVEFORM VISUALIZER ────────────────────────────────────────

  async extractRealAudioWaveform(videoUrl) {
    if (!videoUrl) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const response = await fetch(videoUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const rawData = audioBuffer.getChannelData(0);
      const totalSamples = Math.max(100, Math.floor((this.timeline.duration || 30) * 12 * this.zoom));
      const blockSize = Math.floor(rawData.length / totalSamples);
      const peaks = [];

      for (let i = 0; i < totalSamples; i++) {
        const start = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[start + j] || 0);
        }
        peaks.push(sum / Math.max(1, blockSize));
      }

      const maxPeak = Math.max(...peaks) || 1;
      this.audioPeaks = peaks.map(p => Math.max(4, Math.round((p / maxPeak) * 22)));
      this.renderWaveform();
    } catch (e) {
      this.generateWaveformBars();
    }
  }

  renderWaveform() {
    if (!this.audioWaveformEl) return;
    if (this.audioPeaks && this.audioPeaks.length) {
      let html = '';
      this.audioPeaks.forEach(h => {
        html += `<div class="w-1 bg-[#10B981] rounded-full opacity-80 shrink-0" style="height: ${h}px;"></div>`;
      });
      this.audioWaveformEl.innerHTML = html;
    } else {
      this.generateWaveformBars();
    }
  }

  generateWaveformBars() {
    let barsHtml = '';
    const numBars = Math.max(100, Math.floor((this.timeline.duration || 30) * 10 * this.zoom));
    for (let i = 0; i < numBars; i++) {
      const height = Math.floor(Math.sin(i * 0.25) * 10 + Math.cos(i * 0.15) * 8 + 12);
      barsHtml += `<div class="w-1 bg-[#10B981] rounded-full opacity-70 shrink-0" style="height: ${Math.max(4, height)}px;"></div>`;
    }
    if (this.audioWaveformEl) {
      this.audioWaveformEl.innerHTML = barsHtml;
    }
  }

  // ─── EVENT HANDLERS & SCRUBBING ───────────────────────────────────────

  initEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    // Real-time Scrubbing via timeline drag or click
    let isScrubbing = false;

    const handleSeek = (clientX) => {
      if (!this.trackWrapperEl || !this.player) return;
      const rect = this.trackWrapperEl.getBoundingClientRect();
      const clickX = clientX - rect.left - 80;
      if (clickX >= 0) {
        const targetTime = Math.max(0, Math.min(this.timeline.duration, clickX / (this.pixelsPerSecond * this.zoom)));
        this.player.seek(targetTime);
      }
    };

    if (this.scrollAreaEl) {
      this.scrollAreaEl.addEventListener('mousedown', (e) => {
        if (e.target.closest('.caption-block') || e.target.closest('.video-clip-block')) return;
        isScrubbing = true;
        handleSeek(e.clientX);
      });
    }

    window.addEventListener('mousemove', (e) => {
      if (isScrubbing) {
        handleSeek(e.clientX);
      }
    });

    window.addEventListener('mouseup', () => {
      if (isScrubbing) {
        isScrubbing = false;
      }
    });

    // Zoom Controls
    const zoomSlider = document.getElementById('timeline-zoom-slider');
    const zoomInBtn = document.getElementById('btn-zoom-in');
    const zoomOutBtn = document.getElementById('btn-zoom-out');

    if (zoomSlider) {
      zoomSlider.addEventListener('input', (e) => {
        this.zoom = parseFloat(e.target.value);
        this.updateDimensions();
      });
    }

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        this.zoom = Math.min(3.5, this.zoom + 0.3);
        if (zoomSlider) zoomSlider.value = this.zoom;
        this.updateDimensions();
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        this.zoom = Math.max(0.5, this.zoom - 0.3);
        if (zoomSlider) zoomSlider.value = this.zoom;
        this.updateDimensions();
      });
    }

    // Video NLE Tool Buttons
    const splitVideoBtn = document.getElementById('btn-split-video');
    if (splitVideoBtn) {
      splitVideoBtn.addEventListener('click', () => this.splitVideoClipAt());
    }

    const deleteClipBtn = document.getElementById('btn-delete-clip');
    if (deleteClipBtn) {
      deleteClipBtn.addEventListener('click', () => this.deleteVideoClip());
    }

    const resetVideoBtn = document.getElementById('btn-reset-video');
    if (resetVideoBtn) {
      resetVideoBtn.addEventListener('click', () => this.resetVideoClips());
    }

    // Caption Action: Add new caption at playhead
    const addWordBtn = document.getElementById('btn-add-word');
    if (addWordBtn) {
      addWordBtn.addEventListener('click', () => {
        const text = prompt('Enter new caption text:');
        if (!text || !text.trim()) return;

        if (window.kalakarEditor?.pushStateToHistory) window.kalakarEditor.pushStateToHistory();

        const curTime = this.timeline.currentTime;
        const newCap = {
          id: `caption_${Date.now().toString().slice(-4)}`,
          text: text.trim(),
          startTime: Math.round(curTime * 100) / 100,
          endTime: Math.min(this.timeline.duration, Math.round((curTime + 2.0) * 100) / 100),
          originalText: text.trim(),
          language: 'hinglish',
          confidence: 1.0,
          videoClipId: this.selectedClipId || this.timeline.videoClips[0]?.id || 'clip_001',
          isEdited: true
        };

        this.timeline.captions.push(newCap);
        this.timeline.captions.sort((a, b) => a.startTime - b.startTime);

        this.renderCaptionBlocks();
        if (window.kalakarEditor) window.kalakarEditor.setSegments(this.timeline.captions);
        if (this.player) this.player.render();
        if (window.showToast) window.showToast(`✨ Caption "${newCap.text}" added!`);
      });
    }

    // Caption Action: Split caption at playhead
    const splitWordBtn = document.getElementById('btn-split-word');
    if (splitWordBtn) {
      splitWordBtn.addEventListener('click', () => {
        const curTime = this.timeline.currentTime;
        const capIdx = this.timeline.captions.findIndex(c => curTime > c.startTime && curTime < c.endTime);
        if (capIdx < 0) {
          if (window.showToast) window.showToast('Playhead ko kisi caption ke beech mein rakhein split karne ke liye.', true);
          return;
        }

        if (window.kalakarEditor?.pushStateToHistory) window.kalakarEditor.pushStateToHistory();

        const origCap = this.timeline.captions[capIdx];
        const words = origCap.text.split(/\s+/).filter(Boolean);
        const ratio = (curTime - origCap.startTime) / (origCap.endTime - origCap.startTime);
        const splitIdx = Math.max(1, Math.min(words.length - 1, Math.round(words.length * ratio)));

        const part1 = {
          ...origCap,
          id: origCap.id,
          text: words.slice(0, splitIdx).join(' '),
          startTime: origCap.startTime,
          endTime: curTime,
          isEdited: true
        };

        const part2 = {
          ...origCap,
          id: `${origCap.id}_part2`,
          text: words.slice(splitIdx).join(' '),
          startTime: curTime,
          endTime: origCap.endTime,
          isEdited: true
        };

        this.timeline.captions.splice(capIdx, 1, part1, part2);
        this.timeline.captions.sort((a, b) => a.startTime - b.startTime);

        this.renderCaptionBlocks();
        if (window.kalakarEditor) window.kalakarEditor.setSegments(this.timeline.captions);
        if (this.player) this.player.render();
        if (window.showToast) window.showToast('✂️ Caption split ho gaya!');
      });
    }

    // Mode toggles
    const wordModeBtn = document.getElementById('timeline-mode-word');
    const lineModeBtn = document.getElementById('timeline-mode-line');

    if (wordModeBtn && lineModeBtn) {
      wordModeBtn.addEventListener('click', () => {
        this.mode = 'word';
        wordModeBtn.className = 'px-2.5 py-1 rounded font-bold text-[10px] bg-[#6366F1] text-white transition shadow-sm';
        lineModeBtn.className = 'px-2.5 py-1 rounded font-medium text-[10px] text-[#94A3B8] hover:text-white transition';
        this.renderCaptionBlocks();
        if (this.player) this.player.setStyle({ displayMode: 'chunk' });
      });

      lineModeBtn.addEventListener('click', () => {
        this.mode = 'line';
        lineModeBtn.className = 'px-2.5 py-1 rounded font-bold text-[10px] bg-[#6366F1] text-white transition shadow-sm';
        wordModeBtn.className = 'px-2.5 py-1 rounded font-medium text-[10px] text-[#94A3B8] hover:text-white transition';
        this.renderCaptionBlocks();
        if (this.player) this.player.setStyle({ displayMode: 'full' });
      });
    }
  }

  render() {
    this.updateDimensions();
  }
}

window.KalakarTimeline = KalakarTimeline;
