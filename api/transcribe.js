import formidable from 'formidable';
import fs from 'fs';

// Disable Vercel default bodyParser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

/**
 * Devanagari to Hinglish transliteration fallback.
 * Guarantees that any Hindi Devanagari characters are converted into readable Roman English script.
 */
function devanagariToHinglish(text) {
  if (!text) return '';

  const vowels = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
    'अं': 'am', 'अः': 'ah'
  };

  const matras = {
    'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
    'ं': 'n', 'ँ': 'n', 'ः': 'h'
  };

  const consonants = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
    'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
    'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gya',
    'ड़': 'd', 'ढ़': 'dh', 'ज़': 'z', 'फ़': 'f', 'क़': 'q', 'ख़': 'kh', 'ग़': 'g'
  };

  const virama = '्';
  let result = '';
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const char = text[i];
    const nextChar = text[i + 1] || '';

    if (vowels[char]) {
      result += vowels[char];
    } else if (consonants[char]) {
      let rom = consonants[char];
      if (nextChar === virama) {
        result += rom;
        i++; // Skip virama
      } else if (matras[nextChar]) {
        result += rom + matras[nextChar];
        i++; // Skip matra
      } else if (consonants[nextChar] || vowels[nextChar] || nextChar === ' ' || nextChar === '' || /[\s\p{P}]/u.test(nextChar)) {
        if (nextChar && consonants[nextChar]) {
          result += rom + 'a';
        } else {
          result += rom;
        }
      } else {
        result += rom;
      }
    } else if (matras[char]) {
      result += matras[char];
    } else if (char === '।') {
      result += '.';
    } else if (char === '॥') {
      result += '.';
    } else {
      result += char;
    }
  }

  return result;
}

function ensureHinglish(text) {
  if (!text) return '';
  if (/[\u0900-\u097F]/.test(text)) {
    return devanagariToHinglish(text);
  }
  return text;
}

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

  // Check for AI Transcription API Key (Groq or OpenAI)
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  const isGroq = Boolean(process.env.GROQ_API_KEY);

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'Missing Transcription API Key. Please configure GROQ_API_KEY in your Vercel Project Settings > Environment Variables.'
    });
  }

  try {
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 25 * 1024 * 1024, // 25 MB max
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

    const langRaw = (Array.isArray(fields.language) ? fields.language[0] : (fields.language || 'hi')).toString().trim().toLowerCase();
    const scriptRaw = (Array.isArray(fields.script) ? fields.script[0] : (fields.script || 'roman')).toString().trim().toLowerCase();
    const hinglishField = Array.isArray(fields.hinglish) ? fields.hinglish[0] : fields.hinglish;

    // Detect if Hinglish (Romanized Hindi) was requested
    const isHinglish = 
      langRaw === 'hinglish' || 
      (langRaw === 'hi' && scriptRaw === 'roman') ||
      (langRaw === 'hindi' && scriptRaw === 'roman') ||
      hinglishField === 'true' ||
      hinglishField === true;

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

    if (isHinglish) {
      // Instruct Whisper that speech is in Hindi, but prompt it to output Latin / Hinglish text
      whisperFormData.append('language', 'hi');
      whisperFormData.append(
        'prompt',
        'The audio is in Hindi. Please transcribe it exactly into Hinglish (Romanized Hindi script, using the English alphabet). Do not use Devanagari script.'
      );
    } else if (langRaw && langRaw !== 'auto') {
      const langMap = {
        'hindi': 'hi',
        'english': 'en',
        'urdu': 'ur',
        'punjabi': 'pa',
        'marathi': 'mr',
        'gujarati': 'gu',
        'bengali': 'bn',
        'tamil': 'ta',
        'telugu': 'te'
      };
      const isoLang = langMap[langRaw] || langRaw;
      whisperFormData.append('language', isoLang);
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

    // Format Captions matching editor.js schema
    const captions = rawSegments.map((seg, idx) => {
      let text = (seg.text || '').trim();
      if (isHinglish) {
        text = ensureHinglish(text);
      }
      const startTime = Number(Number(seg.start || 0).toFixed(3));
      const endTime = Number(Number(seg.end || seg.start + 0.5).toFixed(3));

      return {
        id: 'caption_' + String(idx + 1).padStart(3, '0'),
        text: text,
        startTime: startTime,
        endTime: endTime,
        originalText: text,
        language: isHinglish ? 'Hinglish' : langRaw,
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
        .map(w => {
          let wWord = (w.word || '').trim();
          if (isHinglish) {
            wWord = ensureHinglish(wWord);
          }
          return {
            word: wWord,
            start: Number(Number(w.start || 0).toFixed(3)),
            end: Number(Number(w.end || 0).toFixed(3))
          };
        });

      let segText = (seg.text || '').trim();
      if (isHinglish) {
        segText = ensureHinglish(segText);
      }

      return {
        start: Number(Number(sStart).toFixed(3)),
        end: Number(Number(sEnd).toFixed(3)),
        text: segText,
        words: segWords
      };
    });

    return res.status(200).json({
      success: true,
      captions: captions,
      segments: segments,
      has_speech: captions.length > 0,
      language: isHinglish ? 'Hinglish' : langRaw,
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
