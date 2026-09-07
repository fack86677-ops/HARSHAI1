import formidable from 'formidable';
import fs from 'fs';

// Disable Vercel default bodyParser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  // Check for AI Transcription API Key
  const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
  const isGroq = !process.env.OPENAI_API_KEY && Boolean(process.env.GROQ_API_KEY);

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'Missing Transcription API Key. Please configure OPENAI_API_KEY or GROQ_API_KEY in your Vercel Project Settings > Environment Variables.'
    });
  }

  try {
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 25 * 1024 * 1024, // 25 MB
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, flds, fls) => {
        if (err) reject(err);
        else resolve([flds, fls]);
      });
    });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file || !file.filepath) {
      return res.status(400).json({
        success: false,
        error: 'No media file received. Please upload an audio or video file.'
      });
    }

    const language = Array.isArray(fields.language) ? fields.language[0] : (fields.language || 'hi');
    const script = Array.isArray(fields.script) ? fields.script[0] : (fields.script || 'roman');

    // Read file buffer and prepare Web standard Blob
    const fileBuffer = fs.readFileSync(file.filepath);
    const mimeType = file.mimetype || 'video/mp4';
    const blob = new Blob([fileBuffer], { type: mimeType });

    // Clean up temporary serverless file
    try { fs.unlinkSync(file.filepath); } catch (_) {}

    // Prepare Whisper API payload
    const whisperFormData = new FormData();
    whisperFormData.append('file', blob, file.originalFilename || 'audio.mp4');
    whisperFormData.append('model', isGroq ? 'whisper-large-v3' : 'whisper-1');
    whisperFormData.append('response_format', 'verbose_json');
    whisperFormData.append('timestamp_granularities[]', 'segment');
    whisperFormData.append('timestamp_granularities[]', 'word');

    if (language && language !== 'auto') {
      whisperFormData.append('language', language);
    }

    const apiUrl = isGroq
      ? 'https://api.groq.com/openai/v1/audio/transcriptions'
      : 'https://api.openai.com/v1/audio/transcriptions';

    const whisperRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      body: whisperFormData
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      let errMsg = 'Whisper API error (' + whisperRes.status + ')';
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error?.message || errMsg;
      } catch (_) {}
      return res.status(whisperRes.status).json({ success: false, error: errMsg });
    }

    const data = await whisperRes.json();
    const rawSegments = data.segments || [];
    const rawWords = data.words || [];

    // Format Captions matching editor.js
    const captions = rawSegments.map((seg, idx) => {
      const text = (seg.text || '').trim();
      const startTime = Number(Number(seg.start || 0).toFixed(3));
      const endTime = Number(Number(seg.end || seg.start + 0.5).toFixed(3));

      return {
        id: 'caption_' + String(idx + 1).padStart(3, '0'),
        text: text,
        startTime: startTime,
        endTime: endTime,
        originalText: text,
        language: language,
        confidence: 0.95,
        videoClipId: 'clip_001',
        isEdited: false
      };
    });

    // Attach word-level timestamps to segments
    const segments = rawSegments.map(seg => {
      const sStart = seg.start || 0;
      const sEnd = seg.end || sStart + 0.5;

      const segWords = rawWords
        .filter(w => (w.start >= sStart - 0.05) && (w.end <= sEnd + 0.1))
        .map(w => ({
          word: (w.word || '').trim(),
          start: Number(Number(w.start || 0).toFixed(3)),
          end: Number(Number(w.end || 0).toFixed(3))
        }));

      return {
        start: Number(Number(sStart).toFixed(3)),
        end: Number(Number(sEnd).toFixed(3)),
        text: (seg.text || '').trim(),
        words: segWords
      };
    });

    return res.status(200).json({
      success: true,
      captions: captions,
      segments: segments,
      has_speech: captions.length > 0,
      language: language,
      message: captions.length > 0 ? 'Captions successfully generated' : 'No detectable speech found in audio',
      remaining_credits: 100
    });

  } catch (err) {
    console.error('[API/TRANSCRIBE ERROR]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal Serverless Transcription Error'
    });
  }
}
