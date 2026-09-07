// Main Application Controller for Harsh Caption Generator Studio

function getApiBase() {
  if (typeof window.getApiBase === 'function' && window.getApiBase !== getApiBase) {
    return window.getApiBase();
  }
  if (window.location.protocol === 'https:') return '';
  if (window.location.origin && window.location.origin.includes(':7860')) return '';
  const host = window.location.hostname || '127.0.0.1';
  return `http://${host}:7860`;
}
if (!window.getApiBase) window.getApiBase = getApiBase;
window.API_BASE = (typeof window.getApiBase === 'function') ? window.getApiBase() : getApiBase();
const API_BASE = window.API_BASE;

let currentProject = null;
let kalakarPlayer = null;
let kalakarTimeline = null;
let kalakarEditor = null;
let pendingUploadFile = null;

const DID_YOU_KNOW_TIPS = [
  "More than 200,000 creators and editors trust Harsh Caption Generator for fast viral captions.",
  "Adding animated captions increases video watch time and retention by over 80% on Instagram Reels and Shorts!",
  "Hinglish captions allow Indian creators to reach both regional and global youth audiences effortlessly.",
  "Word-level pop animations boost visual engagement and prevent users from scrolling away.",
  "You can drag and position your captions anywhere on the video in real-time!"
];

async function initApp() {
  initNavigation();
  initDropzone();
  initPrepareModal();
  initKeyboardShortcuts();
  try { await loadRecentProjects(); } catch (_) {}

  // App must always start on and stay on the upload/dashboard screen
  showScreen('screen-dashboard');

  // Guard against premature navigation:
  // ONLY open the editor on load if an explicit project ID query param is present AND contains a valid media file
  const urlParams = new URLSearchParams(window.location.search);
  const requestedProjId = urlParams.get('project') || urlParams.get('id');
  if (requestedProjId) {
    try {
      const savedProj = localStorage.getItem('harsh_project_' + requestedProjId);
      if (savedProj) {
        const p = JSON.parse(savedProj);
        if (p && (p.file || (p.video_url && !p.video_url.includes('demo_video.mp4')))) {
          openStudioEditor(p);
        }
      }
    } catch (_) {}
  }
}

function openDefaultDemoEditor() {
  openStudioEditor({
    id: 'demo_proj',
    title: "Viral Creator Demo",
    filename: "demo_video.mp4",
    video_url: "/static/assets/demo_video.mp4",
    file_path: "",
    created_at: "Demo",
    language: "Hinglish",
    duration: 14.5,
    segments: [
      {
        id: 1,
        start: 0,
        end: 3.5,
        text: "Create viral animated captions in seconds",
        words: [
          { word: "Create", start: 0, end: 0.5, highlight: true },
          { word: "viral", start: 0.5, end: 1.1, highlight: false },
          { word: "animated", start: 1.1, end: 1.8, highlight: false },
          { word: "captions", start: 1.8, end: 2.6, highlight: false },
          { word: "instantly", start: 2.6, end: 3.5, highlight: false }
        ]
      }
    ],
    style: { ...TEMPLATES[0].style }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Only if not typing in input or contenteditable
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    const isEditing = activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable;
    if (isEditing) return;

    if (e.code === 'Space') {
      e.preventDefault();
      window.toggleVideoPlayback();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      if (kalakarPlayer) kalakarPlayer.seek(kalakarPlayer.currentTime - 1.0);
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      if (kalakarPlayer) kalakarPlayer.seek(kalakarPlayer.currentTime + 1.0);
    }
  });
}

function initNavigation() {
  // Navigation back to dashboard
  const btnBackHome = document.getElementById('btn-back-home');
  if (btnBackHome) {
    btnBackHome.addEventListener('click', () => {
      showScreen('screen-dashboard');
      loadRecentProjects();
      if (window.setCredits && window.getCredits) {
        window.setCredits(window.getCredits());
      }
    });
  }

  // Safe zone toggle
  const safeZoneToggle = document.getElementById('btn-toggle-safe-zone');
  let safeZoneActive = false;
  if (safeZoneToggle) {
    safeZoneToggle.addEventListener('click', () => {
      safeZoneActive = !safeZoneActive;
      if (kalakarPlayer) kalakarPlayer.toggleSafeZone(safeZoneActive);
      safeZoneToggle.classList.toggle('text-[#6366F1]', safeZoneActive);
    });
  }

  // Project title editing
  const titleEl = document.getElementById('project-title-display');
  if (titleEl) {
    titleEl.addEventListener('blur', () => {
      if (currentProject) {
        currentProject.title = titleEl.textContent.trim() || 'Untitled Project';
        saveCurrentProject();
        if (window.showToast) window.showToast('Project title updated!');
      }
    });
  }
}

function showScreen(screenId) {
  // Navigation Guard: Prevent showing editor unless an active video file exists in state
  if (screenId === 'screen-studio') {
    const hasActiveMedia = Boolean(
      (currentProject && (currentProject.file || (currentProject.video_url && !currentProject.video_url.includes('demo_video.mp4')))) ||
      (window.uploadedVideo && (window.uploadedVideo.file || (window.uploadedVideo.video_url && !window.uploadedVideo.video_url.includes('demo_video.mp4'))))
    );

    if (!hasActiveMedia) {
      console.warn("[Navigation Guard] Access to Editor denied without an uploaded video. Staying on dashboard.");
      screenId = 'screen-dashboard';
    }
  }

  // Toggle in-studio body class for locked video editing canvas vs smooth scrolling dashboard
  if (screenId === 'screen-studio') {
    document.body.classList.add('in-studio');
  } else {
    document.body.classList.remove('in-studio');
    try { loadRecentProjects(); } catch (_) {}
  }

  document.querySelectorAll('.app-screen').forEach(s => {
    s.classList.add('hidden');
    s.style.setProperty('display', 'none', 'important');
  });
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.remove('hidden');
    target.style.setProperty('display', 'flex', 'important');
  }
}

const ALLOWED_MEDIA_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv', '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];

function validateMediaFile(file) {
  if (!file) return { valid: false, error: 'No file selected.' };

  const fileName = (file.name || '').toLowerCase();
  const fileType = (file.type || '').toLowerCase();

  const hasValidExt = ALLOWED_MEDIA_EXTENSIONS.some(ext => fileName.endsWith(ext));
  const hasValidMime = fileType.startsWith('video/') || fileType.startsWith('audio/');

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: `Unsupported file format "${file.name}". Please upload an MP4, MOV, WebM, MP3, or WAV file.`
    };
  }

  // Max 500MB
  if (file.size > 500 * 1024 * 1024) {
    return {
      valid: false,
      error: 'File size exceeds 500MB limit. Please upload a smaller video clip.'
    };
  }

  return { valid: true };
}

window.handleDirectUpload = function(file) {
  if (!file) return;

  const check = validateMediaFile(file);
  if (!check.valid) {
    if (window.showToast) window.showToast(check.error, true);
    else alert(check.error);
    const fileInput = document.getElementById('file-upload-input');
    if (fileInput) fileInput.value = '';
    return;
  }

  const localBlobUrl = URL.createObjectURL(file);
  const newProject = {
    id: `proj_${Date.now()}`,
    title: file.name.replace(/\.[^/.]+$/, ""),
    filename: file.name,
    video_url: localBlobUrl,
    file_path: '',
    file: file,
    created_at: "Just now",
    language: "Hinglish",
    duration: 15.0,
    captions: [],
    segments: [],
    style: { ...TEMPLATES[0].style }
  };

  pendingUploadFile = file;
  window.pendingUploadFile = file;
  window.uploadedVideo = {
    id: newProject.id,
    file: file,
    name: file.name,
    video_url: localBlobUrl,
    mimeType: file.type || 'video/mp4',
    duration: 15.0
  };

  // 1. Instantly open Studio Editor
  openStudioEditor(newProject);

  // 2. Open Prepare Media Modal inside the Studio for language selection & caption trigger
  const modal = document.getElementById('modal-prepare-media');
  const previewName = document.getElementById('prepare-file-name');
  if (previewName) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    previewName.textContent = `Selected: ${file.name} (${sizeMb} MB)`;
  }
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
  }

  if (window.showToast) {
    window.showToast(`🚀 Video loaded: ${file.name}! Welcome to Studio.`);
  }
};

function initDropzone() {
  const dropzone = document.getElementById('main-dropzone');
  const fileInput = document.getElementById('file-upload-input');

  if (!dropzone || !fileInput) return;

  // Click on dropzone delegates to file input if not a native label
  dropzone.addEventListener('click', (e) => {
    if (e.target !== fileInput && dropzone.tagName.toLowerCase() !== 'label') {
      fileInput.click();
    }
  });

  // Keyboard accessibility
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  // Drag & drop handlers
  const highlight = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('border-[#6366F1]', 'ring-4', 'ring-[#6366F1]/40', 'scale-[1.01]');
  };

  const unhighlight = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('border-[#6366F1]', 'ring-4', 'ring-[#6366F1]/40', 'scale-[1.01]');
  };

  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, highlight, false);
  });

  ['dragleave', 'dragend'].forEach(name => {
    dropzone.addEventListener(name, unhighlight, false);
  });

  dropzone.addEventListener('drop', (e) => {
    unhighlight(e);
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      window.handleDirectUpload(dt.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      window.handleDirectUpload(e.target.files[0]);
    }
  });
}

function initPrepareModal() {
  const modal = document.getElementById('modal-prepare-media');
  const closeBtn = document.getElementById('btn-close-prepare');
  const generateBtn = document.getElementById('btn-generate-transcription');

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.style.setProperty('display', 'none', 'important');
      pendingUploadFile = null;
    });
  }

  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      const language = document.getElementById('select-spoken-language')?.value || 'hi';
      const script = document.getElementById('select-writing-script')?.value || 'roman';
      const audioEnhance = document.getElementById('toggle-audio-enhance')?.checked ?? true;
      const emojis = document.getElementById('toggle-emojis')?.checked ?? true;
      const translate = document.getElementById('toggle-translation')?.checked ?? false;

      if (modal) {
        modal.classList.add('hidden');
        modal.style.setProperty('display', 'none', 'important');
      }
      await startUploadAndTranscription(pendingUploadFile, { language, script, audioEnhance, emojis, translate });
    });
  }
}

async function startUploadAndTranscription(file, options) {
  const processingModal = document.getElementById('modal-processing');
  const progressBar = document.getElementById('processing-progress-bar');
  const progressText = document.getElementById('processing-progress-text');
  const statusSubtext = document.getElementById('processing-status-subtext');
  const triviaEl = document.getElementById('processing-trivia');

  if (processingModal) {
    processingModal.classList.remove('hidden');
    processingModal.style.setProperty('display', 'flex', 'important');
  }
  if (triviaEl) {
    triviaEl.textContent = DID_YOU_KNOW_TIPS[Math.floor(Math.random() * DID_YOU_KNOW_TIPS.length)];
  }

  let progress = 10;
  const updateProgress = (val, text) => {
    progress = val;
    if (progressBar) progressBar.style.width = `${val}%`;
    if (progressText) progressText.textContent = `${val}%`;
    if (statusSubtext && text) statusSubtext.textContent = text;
  };

  updateProgress(15, "Uploading your video media...");

  if (file) {
    window.uploadedVideo = {
      id: `video_${Date.now()}`,
      file: file,
      name: file.name,
      mimeType: file.type,
      duration: 0
    };
  }

  try {
    let uploadData = null;

    if (file) {
      try {
        // Try real upload to backend
        const res = await fetch(API_BASE + '/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-File-Name': encodeURIComponent(file.name)
          },
          body: file
        });
        const text = await res.text();
        try {
          uploadData = JSON.parse(text);
        } catch(e) {
          console.warn('Backend upload returned non-JSON, switching to local Blob URL:', text.slice(0, 100));
        }
      } catch (err) {
        console.warn('Upload network error, using local Blob URL:', err);
      }

      // If backend is not available or returned error
      if (!uploadData || !uploadData.success) {
        const blobUrl = URL.createObjectURL(file);
        const tempVid = document.createElement('video');
        tempVid.preload = 'metadata';
        tempVid.src = blobUrl;
        
        const dur = await new Promise(resolve => {
          tempVid.onloadedmetadata = () => resolve(tempVid.duration || 15.0);
          tempVid.onerror = () => resolve(15.0);
          setTimeout(() => resolve(15.0), 2500);
        });

        uploadData = {
          success: true,
          filename: file.name,
          video_url: blobUrl,
          file_path: '',
          info: { duration: dur, width: 1080, height: 1920 }
        };
      }
    } else {
      // Use demo sample video
      uploadData = {
        success: true,
        filename: "demo_video.mp4",
        video_url: "/static/assets/demo_video.mp4",
        file_path: "",
        info: { duration: 14.5, width: 1080, height: 1920 }
      };
    }

    const duration = uploadData.info?.duration || 15.0;
    if (window.uploadedVideo) {
      window.uploadedVideo.duration = duration;
    }

    // Deduct user credits before proceeding
    if (window.HCG && window.HCG.deductCredits) {
      const allowed = window.HCG.deductCredits(duration);
      if (!allowed) {
        if (processingModal) processingModal.classList.add('hidden');
        return;
      }
    }

    updateProgress(55, options.translate ? "Translating audio to English captions..." : "Audio cleaning & AI transcription running...");

    // Call Transcription API with FormData or JSON
    let transData = null;
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file, file.name);
      }
      formData.append('file_path', uploadData.file_path || '');
      formData.append('video_url', uploadData.video_url || '');
      formData.append('filename', uploadData.filename || '');
      formData.append('language', options.language || 'hi');
      formData.append('script', options.script || 'roman');
      const isHinglish = (options.language === 'hi' && options.script === 'roman') || options.language === 'hinglish';
      formData.append('hinglish', String(isHinglish));
      formData.append('audio_enhance', String(options.audioEnhance ?? true));
      formData.append('emojis', String(options.emojis ?? true));
      formData.append('translate', String(options.translate ?? false));

      const transRes = await fetch(API_BASE + '/api/transcribe', {
        method: 'POST',
        body: formData
      });

      if (transRes.ok) {
        transData = await transRes.json();
        if (transData.file_path && !uploadData.file_path) {
          uploadData.file_path = transData.file_path;
        }
        if (transData.video_url && (!uploadData.video_url || uploadData.video_url.startsWith('blob:'))) {
          uploadData.video_url = transData.video_url;
        }
      } else {
        const transText = await transRes.text();
        console.warn('Transcribe failed status:', transRes.status, transText.slice(0, 100));
      }
    } catch (err) {
      console.warn('Transcribe fetch failed:', err);
    }

    if (transData && transData.error) {
      console.warn('Transcription API message:', transData.error);
    }

    const realCaptions = (transData && Array.isArray(transData.captions)) ? transData.captions : ((transData && Array.isArray(transData.segments)) ? transData.segments : []);
    const realSegments = (transData && Array.isArray(transData.segments)) ? transData.segments : realCaptions;

    if (transData && transData.has_speech === false && realCaptions.length === 0) {
      if (window.showToast) {
        window.showToast("No detectable speech found in video audio.", true);
      }
    }

    if (transData && transData.remaining_credits !== undefined) {
      localStorage.setItem('hcg_credits', String(transData.remaining_credits));
      const credDisplay = document.getElementById('header-credits');
      if (credDisplay) credDisplay.textContent = transData.remaining_credits;
      const sideCred = document.getElementById('sidebar-credits-display');
      if (sideCred) sideCred.textContent = transData.remaining_credits;
    }

    updateProgress(90, "Synchronizing word-level animations & templates...");
    await new Promise(r => setTimeout(r, 600));
    updateProgress(100, "Ready!");

    if (processingModal) {
      processingModal.classList.add('hidden');
      processingModal.style.setProperty('display', 'none', 'important');
    }

    // Launch Studio Editor with real project data
    const project = {
      id: `proj_${Date.now()}`,
      title: uploadData.filename.replace(/\.[^/.]+$/, ""),
      filename: uploadData.filename,
      video_url: uploadData.video_url,
      file_path: uploadData.file_path || '',
      file: file,
      created_at: "Just now",
      language: options.language === 'hi' ? (options.script === 'roman' ? 'Hinglish' : 'Hindi (Native)') : (options.language || 'English'),
      duration: duration,
      captions: realCaptions,
      segments: realSegments,
      style: { ...TEMPLATES[0].style }
    };

    openStudioEditor(project);

  } catch (err) {
    console.error("Studio processing error:", err);
    if (window.showToast) {
      window.showToast("Note: " + err.message, true);
    }
    if (processingModal) {
      processingModal.classList.add('hidden');
      processingModal.style.setProperty('display', 'none', 'important');
    }
  }
}

function openStudioEditor(project) {
  if (!project) {
    showScreen('screen-dashboard');
    return;
  }
  if (!project.file && window.uploadedVideo?.file) {
    project.file = window.uploadedVideo.file;
  }
  if (!project.video_url && window.uploadedVideo?.video_url) {
    project.video_url = window.uploadedVideo.video_url;
  }

  const hasMedia = Boolean(project.file || (project.video_url && !project.video_url.includes('demo_video.mp4')));
  if (!hasMedia) {
    console.warn("[Studio Guard] Cannot open Editor: No video file in state. Please upload a video first.");
    if (window.showToast) window.showToast("Please select or drop a video file first.", true);
    showScreen('screen-dashboard');
    return;
  }

  currentProject = project;
  window.currentProject = project;

  showScreen('screen-studio');

  // Update Top Bar
  const titleDisplay = document.getElementById('project-title-display');
  if (titleDisplay) titleDisplay.textContent = project.title || 'Untitled Project';

  const videoEl = document.getElementById('main-video-player');
  const captionOverlay = document.getElementById('caption-render-box');
  const safeZone = document.getElementById('safe-zone-box');

  let videoSrc = project.video_url;
  if (videoSrc && videoSrc.toLowerCase().endsWith('.mov')) {
    videoSrc = videoSrc.slice(0, -4) + '.mp4';
  }

  // Initialize or update Player
  if (!kalakarPlayer) {
    kalakarPlayer = new KalakarPlayer(videoEl, captionOverlay, safeZone);
    window.kalakarPlayer = kalakarPlayer;
  }
  kalakarPlayer.loadVideo(videoSrc);

  // Initialize or update Timeline
  const timelineContainer = document.getElementById('timeline-container');
  if (!kalakarTimeline) {
    kalakarTimeline = new KalakarTimeline(timelineContainer, kalakarPlayer);
    window.kalakarTimeline = kalakarTimeline;
  }

  // Set video source & duration
  const initialDuration = project.duration || 15.0;
  kalakarTimeline.setVideoSource(project.id, project.filename || project.title || 'video.mp4', initialDuration);

  // Restore saved video clips if present
  if (project.videoClips && Array.isArray(project.videoClips) && project.videoClips.length > 0) {
    kalakarTimeline.timeline.videoClips = project.videoClips;
    kalakarTimeline.recalculateTimelineFromClips();
  }

  // Load captions using authoritative single source of truth
  const rawCaptions = project.captions || project.segments || [];
  kalakarTimeline.setCaptions(rawCaptions);

  if (project.style) {
    kalakarPlayer.setStyle(project.style);
  }
  kalakarTimeline.extractRealAudioWaveform(videoSrc);

  // Initialize or update Editor
  if (!kalakarEditor) {
    kalakarEditor = new KalakarEditor(kalakarPlayer, kalakarTimeline);
    window.kalakarEditor = kalakarEditor;
  }
  kalakarEditor.renderTranscriptList();

  // Dynamic duration and aspect ratio adjustment on video metadata load
  const onMetadata = () => {
    if (videoEl && videoEl.duration && !isNaN(videoEl.duration) && videoEl.duration > 0 && isFinite(videoEl.duration)) {
      if (!project.videoClips || project.videoClips.length <= 1) {
        kalakarTimeline.setDuration(videoEl.duration);
        project.duration = kalakarTimeline.timeline.duration;
      }
      kalakarPlayer.updateTimeDisplay();
    }
  };

  if (videoEl) {
    videoEl.addEventListener('loadedmetadata', onMetadata);
    videoEl.addEventListener('durationchange', onMetadata);
    videoEl.addEventListener('canplay', onMetadata);
    if (videoEl.readyState >= 1) {
      onMetadata();
    }
  }

  // Save to recent projects
  saveCurrentProject();
}

window.recentProjectsList = [];

async function loadRecentProjects() {
  const container = document.getElementById('recent-videos-grid');
  if (!container) return;

  try {
    let loadedProjects = [];

    // 1. Fetch from serverless backend if available
    try {
      const res = await fetch(API_BASE + '/api/projects');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.projects)) {
          loadedProjects = data.projects;
        }
      }
    } catch (_) {}

    // 2. Fetch from localStorage persistent storage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('harsh_project_')) {
          try {
            const item = JSON.parse(localStorage.getItem(key));
            if (item && item.id && !loadedProjects.some(p => p.id === item.id)) {
              loadedProjects.unshift(item);
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    window.recentProjectsList = loadedProjects;
    renderRecentProjectsGrid();
  } catch (err) {
    console.error("Error loading recent projects:", err);
  }
}

function renderRecentProjectsGrid() {
  const container = document.getElementById('recent-videos-grid');
  if (!container) return;

  const projects = window.recentProjectsList || [];
  container.innerHTML = '';

  if (projects.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 px-6 rounded-3xl bg-[#080C1B]/60 border border-dashed border-[#1E293B] flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-2xl mb-3 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
          🎬
        </div>
        <h4 class="text-sm font-extrabold text-white mb-1">No Projects Saved Yet</h4>
        <p class="text-xs text-[#94A3B8] max-w-sm mb-4">Upload a video or audio clip above to automatically generate animated viral captions!</p>
        <button onclick="document.getElementById('file-upload-input')?.click()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-xs font-extrabold shadow-lg hover:scale-105 transition">
          + Upload Video Now
        </button>
      </div>
    `;
    return;
  }

  projects.forEach(proj => {
    const card = document.createElement('div');
    card.id = 'project-card-' + proj.id;
    card.className = 'group relative rounded-2xl bg-[#0B0F1E]/90 border border-[#1E293B]/90 hover:border-[#6366F1]/60 backdrop-blur-xl overflow-hidden shadow-xl hover:shadow-[0_0_30px_rgba(99,102,241,0.25)] transition duration-300 flex flex-col cursor-pointer';

    card.innerHTML = `
      <div class="relative aspect-[9/16] bg-black/60 flex items-center justify-center overflow-hidden">
        <img src="${proj.thumbnail || '/static/assets/demo_thumb.jpg'}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" onerror="this.src='/static/assets/demo_thumb.jpg'" />
        <div class="absolute inset-0 bg-gradient-to-t from-[#0B0F1E] via-transparent to-black/30 pointer-events-none"></div>

        <!-- Play Overlay on Hover -->
        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center">
          <div class="w-12 h-12 rounded-full bg-[#6366F1]/90 backdrop-blur-md text-white flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.8)] transform group-hover:scale-110 transition border border-white/30">
            <svg class="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>

        <!-- Top Badges -->
        <div class="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span class="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-black/70 backdrop-blur-md border border-[#6366F1]/40 text-[#818CF8]">
            ${proj.language || 'Hinglish'}
          </span>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/70 backdrop-blur-md border border-white/10 text-white">
            ${proj.duration ? (Number(proj.duration).toFixed(1) + 's') : 'Video'}
          </span>
        </div>

        <!-- Bottom Captions Synced Pill -->
        <div class="absolute bottom-2.5 left-2.5 right-2.5 px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-xl text-[10px] font-bold text-[#A5B4FC] truncate border border-white/10 flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
          <span class="truncate">${(proj.captions?.length || proj.segments?.length || 0)} Captions Synced</span>
        </div>
      </div>

      <!-- Card Info Footer -->
      <div class="p-3.5 flex items-center justify-between bg-[#080C1B]/95 border-t border-[#1E293B]/70">
        <div class="flex-1 min-w-0 pr-2">
          <h4 class="text-xs font-extrabold text-white group-hover:text-[#818CF8] transition truncate" title="${proj.title || 'Untitled Video'}">${proj.title || 'Untitled Video'}</h4>
          <p class="text-[10px] text-[#64748B] mt-0.5 truncate">${proj.created_at || 'Saved'} • ${(proj.filename || 'video.mp4')}</p>
        </div>

        <!-- Delete Button -->
        <div class="flex items-center gap-1 shrink-0">
          <button class="btn-delete-proj p-1.5 rounded-lg text-[#64748B] hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition" title="Delete Project">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    `;

    // Clicking card (except delete button) opens editor
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete-proj')) return;
      openStudioEditor(proj);
    });

    // Delete handler
    const delBtn = card.querySelector('.btn-delete-proj');
    if (delBtn) {
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        await window.deleteProject(proj.id, proj.title);
      });
    }

    container.appendChild(card);
  });
}

// Global permanent project deletion
window.deleteProject = async function(projectId, projectTitle) {
  if (!projectId) return;

  const confirmed = confirm(`Are you sure you want to permanently delete "${projectTitle || 'this project'}"?`);
  if (!confirmed) return;

  // 1. Permanently remove from LocalStorage
  try {
    localStorage.removeItem('harsh_project_' + projectId);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key === 'harsh_project_' + projectId || key.includes(projectId))) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.warn("LocalStorage remove note:", e);
  }

  // 2. Remove from frontend state array
  if (Array.isArray(window.recentProjectsList)) {
    window.recentProjectsList = window.recentProjectsList.filter(p => p.id !== projectId);
  }

  // 3. Clear active project if currently open
  if (currentProject && currentProject.id === projectId) {
    currentProject = null;
    window.currentProject = null;
  }
  if (window.uploadedVideo && window.uploadedVideo.id === projectId) {
    window.uploadedVideo = null;
  }

  // 4. Call serverless delete endpoint
  try {
    await fetch(API_BASE + '/api/delete_project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId })
    });
  } catch (apiErr) {
    console.warn("Backend delete sync note:", apiErr.message);
  }

  // 5. Instantly update UI
  renderRecentProjectsGrid();

  // 6. Show toast
  if (window.showToast) {
    window.showToast(`🗑️ Project "${projectTitle || 'Video'}" permanently deleted!`);
  }
};

async function saveCurrentProject() {
  if (!currentProject) return;
  const badge = document.getElementById('auto-save-badge');
  if (badge) {
    badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-ping"></span><span>Saving...</span>`;
    badge.className = 'flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/25 ml-1';
  }

  try {
    currentProject.style = kalakarPlayer?.currentStyle || currentProject.style;
    if (kalakarTimeline) {
      currentProject.videoClips = kalakarTimeline.timeline.videoClips;
      currentProject.captions = kalakarTimeline.timeline.captions;
      currentProject.segments = kalakarTimeline.timeline.captions;
      currentProject.duration = kalakarTimeline.timeline.duration;
    }

    // Save to localStorage as immediate offline/client-side persistence
    try {
      const { file, ...serializableProject } = currentProject;
      localStorage.setItem('harsh_project_' + currentProject.id, JSON.stringify(serializableProject));
    } catch(e) {}

    // Send to backend if available
    try {
      await fetch(API_BASE + '/api/save_project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentProject)
      });
    } catch (apiErr) {
      console.warn("API save note (stored in local browser storage):", apiErr.message);
    }

    if (badge) {
      setTimeout(() => {
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span><span>Saved ✓</span>`;
        badge.className = 'flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/25 ml-1';
      }, 300);
    }
  } catch (err) {
    console.error("Failed saving project:", err);
    if (badge) {
      badge.innerHTML = `<span class="text-[#94A3B8]">Saved (Local) ✓</span>`;
    }
  }
}
window.saveCurrentProject = saveCurrentProject;

// Global player trigger
window.toggleVideoPlayback = () => {
  if (kalakarPlayer) kalakarPlayer.togglePlay();
};
