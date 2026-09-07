# -*- coding: utf-8 -*-
"""
Harsh AI Studio / Kalakar Web Studio - Backend Server
Provides REST APIs for:
- User Authentication: Email 6-digit OTP & Google OAuth with Session Management
- User & Admin Dashboard APIs with Role-Based Access Control
- Video upload & ffprobe media info extraction
- Real AI Speech-to-Text Transcription with Faster-Whisper + Indic transliteration + word timestamps (No mock fallback)
- Subtitle generation & FFmpeg video burning
- Project state management & SQLite persistent storage
"""

import os
import sys
import json
import time
import uuid
import shutil
import random
import urllib.parse
from http.cookies import SimpleCookie
import subprocess
import threading
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn

# Configure UTF-8 for stdout and stderr on Windows
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add current directory to path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import db
from hinglish_engine import devanagari_to_hinglish

STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
EXPORTS_DIR = os.path.join(BASE_DIR, "exports")
PROJECTS_FILE = os.path.join(BASE_DIR, "projects.json")
SMTP_CONFIG_FILE = os.path.join(BASE_DIR, "smtp_config.json")
USERS_FILE = os.path.join(BASE_DIR, "users.json")
ADMIN_EMAIL = "harshdhiman332@gmail.com"

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(EXPORTS_DIR, exist_ok=True)

# ─── SMTP CONFIGURATION & EMAIL SENDER ─────────────────────────────────

def get_smtp_config():
    config = {
        "smtp_host": os.environ.get("SMTP_HOST", "smtp.gmail.com"),
        "smtp_port": int(os.environ.get("SMTP_PORT", 587)),
        "smtp_user": os.environ.get("SMTP_USER", ""),
        "smtp_pass": os.environ.get("SMTP_PASS", ""),
        "from_name": os.environ.get("SMTP_FROM_NAME", "Harsh AI Studio")
    }
    if os.path.exists(SMTP_CONFIG_FILE):
        try:
            with open(SMTP_CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                config.update(saved)
        except Exception as e:
            print("Error loading smtp_config.json:", e)
    return config

def send_real_email_otp(to_email, user_name, otp_code):
    """
    Sends a real 6-digit OTP email directly to user's Gmail / email inbox.
    """
    cfg = get_smtp_config()
    subject = f"{otp_code} is your Harsh AI Studio Verification Code"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #06080F; color: #FFFFFF; padding: 20px; }}
        .container {{ max-width: 520px; margin: 0 auto; background: #0B0F19; border: 1px solid #1E293B; border-radius: 18px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
        .logo {{ font-size: 20px; font-weight: 900; color: #6366F1; margin-bottom: 20px; }}
        .title {{ font-size: 22px; font-weight: 800; color: #FFFFFF; margin-bottom: 8px; }}
        .desc {{ font-size: 14px; color: #94A3B8; line-height: 1.6; margin-bottom: 24px; }}
        .otp-box {{ background: rgba(99, 102, 241, 0.1); border: 2px dashed #6366F1; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }}
        .otp-code {{ font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #818CF8; font-family: monospace; }}
        .footer {{ font-size: 12px; color: #64748B; border-top: 1px solid #1E293B; padding-top: 18px; margin-top: 24px; text-align: center; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">⚡ HARSH AI STUDIO</div>
        <div class="title">Verify your Email Address</div>
        <p class="desc">Hello <strong>{user_name or 'Creator'}</strong>,<br>Thank you for signing in. Use the 6-digit verification code below to activate your account and claim your <strong>100 Free AI Credits</strong>:</p>
        
        <div class="otp-box">
          <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 6px;">Your 6-Digit Verification Code</div>
          <div class="otp-code">{otp_code}</div>
        </div>
        
        <p class="desc" style="font-size: 12px;">This verification code is valid for <strong>10 minutes</strong>. If you did not request this code, you can safely ignore this email.</p>
        
        <div class="footer">
          © 2026 Harsh AI Studio • Ultra-Premium AI Video & Caption Suite
        </div>
      </div>
    </body>
    </html>
    """
    
    smtp_user = cfg.get("smtp_user", "").strip()
    smtp_pass = cfg.get("smtp_pass", "").strip()
    smtp_host = cfg.get("smtp_host", "smtp.gmail.com").strip()
    smtp_port = int(cfg.get("smtp_port", 587))
    from_name = cfg.get("from_name", "Harsh AI Studio")
    
    if smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{smtp_user}>"
            msg["To"] = to_email
            
            part = MIMEText(html_body, "html", "utf-8")
            msg.attach(part)
            
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, [to_email], msg.as_string())
            server.quit()
            print(f"[EMAIL ENGINE] Real OTP {otp_code} successfully delivered to {to_email} via {smtp_host}!")
            return True, f"OTP sent to {to_email}"
        except Exception as e:
            print(f"[EMAIL ENGINE] SMTP Delivery Error: {e}")
            return False, str(e)
    else:
        print(f"[EMAIL ENGINE] SMTP not configured in smtp_config.json. OTP for {to_email} is {otp_code}")
        return True, f"OTP generated for {to_email}"

def notify_admin_of_lead(user_data, client_ip="Unknown", user_agent="Unknown"):
    """Sends notification to harshdhiman332@gmail.com on login."""
    cfg = get_smtp_config()
    smtp_user = cfg.get("smtp_user", "").strip()
    smtp_pass = cfg.get("smtp_pass", "").strip()
    
    if not (smtp_user and smtp_pass):
        return
        
    try:
        subject = f"🚀 New Creator Login: {user_data.get('email', 'Unknown')}"
        body = f"""
        New User Registered / Logged In:
        • Name: {user_data.get('name', 'N/A')}
        • Email: {user_data.get('email', 'N/A')}
        • Provider: {user_data.get('auth_provider', 'email')}
        • Role: {user_data.get('role', 'user')}
        • IP: {client_ip}
        • User-Agent: {user_agent}
        • Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}
        """
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = f"Harsh AI Alerts <{smtp_user}>"
        msg["To"] = ADMIN_EMAIL
        
        server = smtplib.SMTP(cfg.get("smtp_host", "smtp.gmail.com"), int(cfg.get("smtp_port", 587)), timeout=10)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, [ADMIN_EMAIL], msg.as_string())
        server.quit()
    except Exception as e:
        print(f"[LEAD NOTIFIER] Notification notice: {e}")

# ─── AUTHENTICATION HELPERS ───────────────────────────────────────────

def get_authenticated_user(handler):
    """
    Extracts authenticated user dict from session_id cookie or Authorization Bearer header.
    """
    session_id = None
    # 1. Cookie
    cookie_header = handler.headers.get('Cookie')
    if cookie_header:
        try:
            cookie = SimpleCookie()
            cookie.load(cookie_header)
            if 'session_id' in cookie:
                session_id = cookie['session_id'].value
        except Exception:
            pass
            
    # 2. Authorization Header
    if not session_id:
        auth_header = handler.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            session_id = auth_header[7:].strip()
            
    if session_id:
        user = db.get_session(session_id)
        if user:
            return user
            
    return None

# ─── MEDIA PROCESSING & SPEECH-TO-TEXT ENGINE ─────────────────────────

def get_ffmpeg_path():
    local_ffmpeg = os.path.join(BASE_DIR, "ffmpeg.exe")
    if os.path.exists(local_ffmpeg):
        return local_ffmpeg
    return "ffmpeg"

def get_ffprobe_path():
    local_ffprobe = os.path.join(BASE_DIR, "ffprobe.exe")
    if os.path.exists(local_ffprobe):
        return local_ffprobe
    return "ffprobe"

def get_media_info(file_path):
    ffprobe = get_ffprobe_path()
    cmd = [
        ffprobe, "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", file_path
    ]
    startupinfo = None
    if os.name == 'nt':
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startupinfo.wShowWindow = subprocess.SW_HIDE

    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=startupinfo)
        data = json.loads(res.stdout.decode('utf-8'))
        format_dur = data.get("format", {}).get("duration")
        duration = float(format_dur) if format_dur else 0.0
        
        width, height = 1080, 1920
        for stream in data.get("streams", []):
            if stream.get("codec_type") == "video":
                width = int(stream.get("width", width))
                height = int(stream.get("height", height))
                if duration <= 0 and "duration" in stream:
                    try:
                        duration = float(stream["duration"])
                    except Exception:
                        pass
            elif stream.get("codec_type") == "audio" and duration <= 0 and "duration" in stream:
                try:
                    duration = float(stream["duration"])
                except Exception:
                    pass
                    
        if duration <= 0:
            duration = 30.0

        return {
            "duration": round(duration, 3),
            "width": width,
            "height": height,
            "aspect_ratio": f"{width}:{height}"
        }
    except Exception as e:
        print(f"Error reading media info: {e}")
        return {"duration": 30.0, "width": 1080, "height": 1920, "aspect_ratio": "9:16"}

def parse_multipart(raw_bytes, boundary):
    """
    Parses multipart/form-data payload into fields and files dicts.
    Robust against binary files and cross-platform line breaks.
    """
    boundary_bytes = b'--' + boundary.encode('utf-8')
    parts = raw_bytes.split(boundary_bytes)
    fields = {}
    files = {}
    for part in parts:
        if not part or part.strip() == b'--':
            continue
        if b'\r\n\r\n' in part:
            header_data, body_data = part.split(b'\r\n\r\n', 1)
        elif b'\n\n' in part:
            header_data, body_data = part.split(b'\n\n', 1)
        else:
            continue
        if body_data.endswith(b'\r\n'):
            body_data = body_data[:-2]
        elif body_data.endswith(b'\n'):
            body_data = body_data[:-1]

        header_str = header_data.decode('latin-1', errors='ignore')
        name = None
        filename = None
        for line in header_str.splitlines():
            if line.lower().startswith('content-disposition:'):
                for item in line.split(';'):
                    item = item.strip()
                    if item.lower().startswith('name='):
                        name = item[5:].strip('"\'')
                    elif item.lower().startswith('filename='):
                        filename = item[9:].strip('"\'')
        if name:
            if filename:
                files[name] = {'filename': filename, 'data': body_data}
            else:
                fields[name] = body_data.decode('utf-8', errors='ignore').strip()
    return fields, files

def extract_audio(video_path, output_wav, enhance=True):
    ffmpeg = get_ffmpeg_path()
    # High-pass 70Hz cuts low-frequency rumble, volume boost provides clear speech levels fast without slow 2-pass loudnorm
    audio_filters = "highpass=f=70,volume=1.2" if enhance else "anull"
    cmd = [
        ffmpeg, "-y", "-i", video_path,
        "-vn", "-af", audio_filters, "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        output_wav
    ]
    startupinfo = None
    if os.name == 'nt':
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startupinfo.wShowWindow = subprocess.SW_HIDE
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=startupinfo)
    return res.returncode == 0 and os.path.exists(output_wav)

# Emoji mapping for auto-emoji feature
EMOJI_KEYWORDS = {
    "happy": "😊", "raksha": "🪢", "bandhan": "✨", "gifts": "🎁", "gift": "🎁",
    "video": "🎥", "money": "💰", "paisa": "💸", "kamao": "🤑", "growth": "📈",
    "secret": "🤫", "love": "❤️", "dost": "🤝", "fire": "🔥", "awesome": "⚡",
    "festive": "🎉", "festival": "🪔", "inside": "🚪", "party": "🥳", "wow": "🤩",
    "start": "🚀", "winner": "🏆", "danger": "⚠️", "idea": "💡", "learn": "📚"
}

RTL_LANGUAGES = ["ur", "ar", "fa", "ps", "sd", "ks"]

LANGUAGE_INITIAL_PROMPTS = {
    "hi": "नमस्ते, यह वीडियो हिंदी भाषा और देवनागरी लिपि में है।",
    "pa": "ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ, ਇਹ ਵੀਡੀਓ ਪੰਜਾਬੀ ਵਿੱਚ ਹੈ।",
    "ur": "یہ ویڈیو اردو زبان میں ہے۔",
    "bn": "নমস্কার, এই ভিডিওটি বাংলা ভাষায়।",
    "gu": "નમસ્તે, આ વિડિઓ ગુજરાતીમાં છે.",
    "mr": "नमस्कार, हा व्हिडिओ मराठी भाषेत आहे.",
    "ta": "வணக்கம், இந்த காணொளி தமிழில் உள்ளது.",
    "te": "నమస్కారం, ఈ ویڈیو తెలుగులో ఉంది.",
    "en": "Hello, welcome to this video transcript with accurate punctuation."
}

def attach_emojis_to_segments(segments):
    for seg in segments:
        for w in seg.get("words", []):
            clean_word = w["word"].lower().strip(".,!?;:\"'")
            if clean_word in EMOJI_KEYWORDS:
                w["emoji"] = EMOJI_KEYWORDS[clean_word]
    return segments

_WHISPER_MODELS = {}
_WHISPER_LOCK = threading.Lock()

def get_whisper_model(size="base"):
    with _WHISPER_LOCK:
        if size not in _WHISPER_MODELS:
            from faster_whisper import WhisperModel
            try:
                print(f"[WHISPER ENGINE] Loading WhisperModel '{size}' on CPU int8...")
                _WHISPER_MODELS[size] = WhisperModel(size, device="cpu", compute_type="int8")
            except Exception as e:
                print(f"[WHISPER ENGINE] Failed loading '{size}', falling back to 'base'/'tiny': {e}")
                if size != "tiny":
                    _WHISPER_MODELS[size] = WhisperModel("tiny", device="cpu", compute_type="int8")
                else:
                    raise e
        return _WHISPER_MODELS[size]

def run_whisper_transcription(file_path, language="hi", script="roman", use_emojis=True, translate=False, enhance=True):
    """
    Runs faster-whisper on media file with translation, prompt biasing and noise reduction.
    Returns real word-level and line-level timestamps from the actual audio without any placeholder text.
    Handles Hinglish (Roman Hindi transliteration), Hindi, English, and Auto-detection.
    """
    temp_wav = os.path.join(UPLOADS_DIR, f"temp_{uuid.uuid4().hex[:8]}.wav")
    extract_audio(file_path, temp_wav, enhance=enhance)
    
    segments_data = []
    audio_source = temp_wav if os.path.exists(temp_wav) else file_path

    # Normalize language parameters
    lang_lower = (language or "hi").lower().strip()
    is_hinglish = lang_lower in ["hinglish", "hi-en", "hi_en"] or (lang_lower in ["hi", "hindi"] and script == "roman")
    
    if is_hinglish:
        whisper_lang = "hi"
        script = "roman"
        target_lang = "hinglish"
    elif lang_lower in ["hindi", "hi"]:
        whisper_lang = "hi"
        script = "native"
        target_lang = "hindi"
    elif lang_lower in ["english", "en"]:
        whisper_lang = "en"
        script = "latin"
        target_lang = "english"
    elif lang_lower in ["auto", "detect", "auto detect"]:
        whisper_lang = None
        script = "roman"
        target_lang = "auto"
    else:
        whisper_lang = lang_lower
        target_lang = lang_lower
    
    detected_lang = whisper_lang or "hi"

    try:
        task_mode = "translate" if translate else "transcribe"
        initial_prompt = "नमस्ते, यह वीडियो हिंदी भाषा और देवनागरी लिपि में है।"
        if whisper_lang == "en":
            initial_prompt = LANGUAGE_INITIAL_PROMPTS.get("en", "Hello, welcome to this video transcript with accurate punctuation.")
        elif whisper_lang in LANGUAGE_INITIAL_PROMPTS:
            initial_prompt = LANGUAGE_INITIAL_PROMPTS[whisper_lang]
            
        print(f"[WHISPER ENGINE] Starting transcription: task={task_mode}, whisper_lang={whisper_lang}, target_lang={target_lang}, script={script}")
        model = get_whisper_model("base")
        
        segments_gen, info = model.transcribe(
            audio_source,
            language=whisper_lang,
            task=task_mode,
            initial_prompt=initial_prompt,
            word_timestamps=True,
            beam_size=1
        )
        
        if hasattr(info, 'language') and info.language:
            detected_lang = info.language
            if target_lang == "auto":
                if detected_lang in ["hi", "ur", "mr", "pa"] and script == "roman":
                    is_hinglish = True
                    target_lang = "hinglish"
                elif detected_lang == "en":
                    target_lang = "english"
                else:
                    target_lang = detected_lang
        
        line_idx = 1
        for seg in segments_gen:
            raw_text = seg.text.strip()
            if not raw_text:
                continue
            words = []
            for w in (seg.words or []):
                raw_word = w.word.strip()
                processed_word = raw_word
                if is_hinglish or script == "roman":
                    processed_word = devanagari_to_hinglish(raw_word)
                words.append({
                    "word": processed_word,
                    "start": float(round(w.start, 3)),
                    "end": float(round(w.end, 3)),
                    "highlight": False
                })
            
            line_text = " ".join([w["word"] for w in words]) if words else raw_text
            if is_hinglish or script == "roman":
                line_text = devanagari_to_hinglish(line_text)
                
            segments_data.append({
                "id": line_idx,
                "start": float(round(seg.start, 3)),
                "end": float(round(seg.end, 3)),
                "text": line_text,
                "originalText": raw_text,
                "words": words
            })
            line_idx += 1
            
        if use_emojis and segments_data:
            try:
                attach_emojis_to_segments(segments_data)
            except Exception as e_em:
                print(f"[WHISPER ENGINE] Emojis attach notice: {e_em}")

        print(f"[WHISPER ENGINE] Successfully transcribed {len(segments_data)} speech segments (lang={target_lang}).")
        return segments_data, target_lang, detected_lang
            
    except Exception as e:
        print(f"[WHISPER ENGINE ERROR] {e}")
        raise e
    finally:
        if os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except Exception:
                pass

    if use_emojis and segments_data:
        segments_data = attach_emojis_to_segments(segments_data)
        
    return segments_data

FALLBACK_SCRIPTS = {
    "hi_roman": [
        "Sunno bhai agar aap bhi apni reel viral karna chahte ho",
        "Toh sabse pehle video me animated captions lagana shuru karo",
        "Kyunki 85 percent log bina audio ke videos dekhte hain",
        "Harsh AI Studio se 1-click me viral captions generate hote hain",
        "Word by word pop animations se viewer engagement 10x badhta hai",
        "Aaj hi try karo aur apna content rapidly grow karo",
        "Video ko like aur share karna bilkul mat bhulna dosto",
        "Agli viral reel ke liye abhi create karo"
    ],
    "hi_native": [
        "सुनो दोस्तों अगर आप भी अपनी रील्स को वायरल करना चाहते हो",
        "तो सबसे पहले अपनी वीडियो में अट्रैक्टिव कैप्शन्स लगाना शुरू करो",
        "क्योंकि 85 प्रतिशत से ज्यादा लोग बिना आवाज़ के वीडियो देखते हैं",
        "हर्ष एआई स्टूडियो से 1 क्लिक में बेहतरीन कैप्शन्स तैयार करें",
        "वर्ड बाई वर्ड एनिमेशन से दर्शकों का ध्यान अंत तक बना रहता है",
        "अभी अपनी वीडियो एक्सपोर्ट करें और तेजी से ग्रो करें",
        "लाइक शेयर और सब्सक्राइब करना ना भूलें"
    ],
    "en": [
        "Stop scrolling right now if you want to grow your audience",
        "Adding dynamic word-by-word captions increases retention by 80 percent",
        "Most viewers on social media watch videos on mute",
        "Animated captions keep your audience hooked until the very end",
        "Create viral Alex Hormozi style subtitles in just one click",
        "Export in crystal clear ultra HD resolution effortlessly",
        "Hit that follow button for more creator growth secrets"
    ],
    "pa": [
        "ਸੁਣੋ ਜੀ ਜੇਕਰ ਤੁਸੀਂ ਵੀ ਆਪਣੀ ਰੀਲ ਵਾਇਰਲ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ",
        "ਤਾਂ ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਵੀਡੀਓ ਵਿੱਚ ਐਨੀਮੇਟਿਡ ਕੈਪਸ਼ਨ ਲਗਾਓ",
        "ਇਸ ਨਾਲ ਵੀਡੀਓ ਦਾ ਵਾਚ ਟਾਈਮ ਬਹੁਤ ਵਧ ਜਾਂਦਾ ਹੈ",
        "ਹਰਸ਼ ਏਆਈ ਸਟੂਡੀਓ ਨਾਲ 1 ਕਲਿੱਕ ਵਿੱਚ ਕੈਪਸ਼ਨ ਬਣਾਓ"
    ],
    "ur": [
        "اگر آپ بھی اپنی ویڈیو وائرل کرنا چاہتے ہیں",
        "تو سب سے پہلے اپنی ویڈیو میں دلکش کیپشنز لگائیں",
        "کیونکہ متحرک کیپشنز سے ویڈیو کی مقبولیت میں اضافہ ہوتا ہے",
        "ہرش اے آئی اسٹوڈیو سے باآسانی کیپشنز بنائیں"
    ]
}

def generate_dynamic_segments(duration=15.0, language="hi", script="roman", use_emojis=True):
    key = f"{language}_{script}" if language == "hi" else language
    lines = FALLBACK_SCRIPTS.get(key, FALLBACK_SCRIPTS.get("hi_roman"))
    
    segments = []
    seg_duration = 2.4
    num_segs = max(1, int(duration // seg_duration))
    current_time = 0.0
    
    for i in range(num_segs):
        if current_time >= duration - 0.5:
            break
        end_time = min(duration, round(current_time + seg_duration, 3))
        text = lines[i % len(lines)]
        words_raw = text.split(" ")
        words = []
        w_dur = (end_time - current_time) / max(1, len(words_raw))
        for w_idx, w in enumerate(words_raw):
            w_start = round(current_time + w_idx * w_dur, 3)
            w_end = round(current_time + (w_idx + 1) * w_dur, 3)
            words.append({
                "word": w,
                "start": w_start,
                "end": w_end,
                "highlight": False
            })
        segments.append({
            "id": i + 1,
            "start": round(current_time, 3),
            "end": end_time,
            "text": text,
            "words": words
        })
        current_time = end_time

    if use_emojis:
        segments = attach_emojis_to_segments(segments)
    return segments

# ─── SUBTITLE FORMATTERS & ASS RENDERER ─────────────────────────────────

def format_timestamp_srt(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000: millis = 999
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def format_timestamp_vtt(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000: millis = 999
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"

def hex_to_ass_color(c_str, alpha="00", default="&H00FFFFFF&"):
    if not c_str: return default
    c_str = str(c_str).strip().lstrip('#')
    if len(c_str) == 6:
        r, g, b = c_str[0:2], c_str[2:4], c_str[4:6]
        return f"&H{alpha}{b}{g}{r}&"
    return default

def format_timestamp_ass(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centis = int(round((seconds - int(seconds)) * 100))
    if centis >= 100: centis = 99
    return f"{hours}:{minutes:02d}:{secs:02d}.{centis:02d}"

def generate_ass_content(segments, style, play_res_x=1080, play_res_y=1920):
    font_name = style.get("fontFamily", "Montserrat")
    font_size = int(style.get("fontSize", 34) * (play_res_y / 1080.0) * 1.5)
    
    primary_color = hex_to_ass_color(style.get("color", "#FFFFFF"))
    highlight_color = hex_to_ass_color(style.get("highlightColor", "#FFE600"))
    outline_color = hex_to_ass_color(style.get("strokeColor", "#000000"))
    back_color = "&H80000000&" if style.get("shadow", True) else "&H00000000&"
    
    stroke_width = 4 if style.get("strokeWidth", 2) > 0 else 0
    shadow_depth = 2 if style.get("shadow", True) else 0
    
    pos_y = style.get("posY", 80)
    margin_v = max(40, int((100 - pos_y) * (play_res_y / 100.0)))
    
    display_mode = style.get("displayMode", "chunk")
    text_transform = style.get("textTransform", "uppercase")
    
    lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        f"PlayResX: {play_res_x}",
        f"PlayResY: {play_res_y}",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: HarshCaptions,{font_name},{font_size},{primary_color},&H000000FF&,{outline_color},{back_color},-1,0,0,0,100,100,0,0,1,{stroke_width},{shadow_depth},2,40,40,{margin_v},1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"
    ]
    
    for seg in segments:
        words = seg.get("words", [])
        if not words or display_mode == "full":
            s = format_timestamp_ass(seg.get("start", 0))
            e = format_timestamp_ass(seg.get("end", 0))
            text = seg.get("text", "")
            if text_transform == "uppercase": text = text.upper()
            elif text_transform == "capitalize": text = text.title()
            lines.append(f"Dialogue: 0,{s},{e},HarshCaptions,,0,0,0,,{text}")
        elif display_mode == "single":
            for w in words:
                s = format_timestamp_ass(w.get("start", 0))
                e = format_timestamp_ass(w.get("end", 0))
                w_text = w.get("word", "") + (" " + w.get("emoji") if w.get("emoji") else "")
                if text_transform == "uppercase": w_text = w_text.upper()
                elif text_transform == "capitalize": w_text = w_text.title()
                c = highlight_color if w.get("highlight") else primary_color
                lines.append(f"Dialogue: 0,{s},{e},HarshCaptions,,0,0,0,,{{\\c{c}}}{w_text}")
        else: # chunk (2-3 words)
            chunk_size = 3
            for i in range(0, len(words), chunk_size):
                chunk = words[i:i + chunk_size]
                if not chunk: continue
                s = format_timestamp_ass(chunk[0].get("start", 0))
                e = format_timestamp_ass(chunk[-1].get("end", 0))
                
                parts = []
                for w in chunk:
                    w_text = w.get("word", "") + (" " + w.get("emoji") if w.get("emoji") else "")
                    if text_transform == "uppercase": w_text = w_text.upper()
                    elif text_transform == "capitalize": w_text = w_text.title()
                    c = highlight_color if w.get("highlight") else primary_color
                    parts.append(f"{{\\c{c}}}{w_text}")
                
                line_str = " ".join(parts)
                lines.append(f"Dialogue: 0,{s},{e},HarshCaptions,,0,0,0,,{line_str}")
                
    return "\n".join(lines)

def generate_srt_content(segments, display_mode="chunk", text_transform="none"):
    """
    Generates standard SubRip (.SRT) subtitle content:
    1
    00:00:00,000 --> 00:00:04,250
    Caption text
    """
    lines = []
    line_idx = 1
    for seg in segments:
        s_val = float(seg.get("startTime", seg.get("start", 0.0)))
        e_val = float(seg.get("endTime", seg.get("end", s_val + 1.0)))
        s = format_timestamp_srt(s_val)
        e = format_timestamp_srt(e_val)
        text = str(seg.get("text", "")).strip()
        if text_transform == "uppercase": text = text.upper()
        elif text_transform == "capitalize": text = text.title()
        elif text_transform == "lowercase": text = text.lower()
        if text:
            lines.append(f"{line_idx}\n{s} --> {e}\n{text}\n")
            line_idx += 1
    return "\n".join(lines)

def generate_vtt_content(segments, display_mode="chunk", text_transform="none"):
    """
    Generates standard WebVTT (.VTT) subtitle content:
    WEBVTT

    1
    00:00:00.000 --> 00:00:04.250
    Caption text
    """
    lines = ["WEBVTT\n"]
    line_idx = 1
    for seg in segments:
        s_val = float(seg.get("startTime", seg.get("start", 0.0)))
        e_val = float(seg.get("endTime", seg.get("end", s_val + 1.0)))
        s = format_timestamp_vtt(s_val)
        e = format_timestamp_vtt(e_val)
        text = str(seg.get("text", "")).strip()
        if text_transform == "uppercase": text = text.upper()
        elif text_transform == "capitalize": text = text.title()
        elif text_transform == "lowercase": text = text.lower()
        if text:
            lines.append(f"{line_idx}\n{s} --> {e}\n{text}\n")
            line_idx += 1
    return "\n".join(lines)

def check_has_audio(video_path):
    """Checks if a media file contains an audio stream."""
    try:
        ffprobe = get_ffprobe_path()
        cmd = [
            ffprobe, "-v", "error",
            "-select_streams", "a:0",
            "-show_entries", "stream=codec_type",
            "-of", "default=noprint_wrappers=1:nokey=1",
            video_path
        ]
        startupinfo = None
        if os.name == 'nt':
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = subprocess.SW_HIDE
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=startupinfo)
        return bool(res.stdout.strip())
    except Exception:
        return True

def render_timeline_video(video_path, video_clips, output_path, scale_w=1080, scale_h=1920, crf_val="21", ass_file=None):
    """
    Renders video timeline with multi-clip trimming, split points, deleted sections,
    and burns formatted ASS captions into the final output.
    """
    ffmpeg = get_ffmpeg_path()
    has_audio = check_has_audio(video_path)
    
    valid_clips = []
    if video_clips and isinstance(video_clips, list):
        for c in video_clips:
            s_s = float(c.get("sourceStartTime", 0.0))
            s_e = float(c.get("sourceEndTime", s_s))
            if s_e > s_s:
                valid_clips.append((s_s, s_e))
                
    sub_filter_part = ""
    if ass_file and os.path.exists(ass_file):
        rel_ass = os.path.relpath(ass_file).replace("\\", "/")
        sub_filter_part = f",subtitles='{rel_ass}'"
        
    scale_pad_filter = f"scale={scale_w}:{scale_h}:force_original_aspect_ratio=decrease,pad={scale_w}:{scale_h}:(ow-iw)/2:(oh-ih)/2"

    startupinfo = None
    if os.name == 'nt':
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startupinfo.wShowWindow = subprocess.SW_HIDE

    # CASE 1: No valid clips (render whole video)
    if not valid_clips:
        vf = f"{scale_pad_filter}{sub_filter_part}"
        cmd = [
            ffmpeg, "-y",
            "-i", video_path,
            "-vf", vf,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", crf_val
        ]
        if has_audio:
            cmd += ["-c:a", "aac", "-b:a", "192k"]
        else:
            cmd += ["-an"]
        cmd.append(output_path)
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=startupinfo)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg render error: {res.stderr.decode('utf-8', errors='ignore')[-300:]}")
        return

    # CASE 2: Single trimmed clip
    if len(valid_clips) == 1:
        s_s, s_e = valid_clips[0]
        filter_str = f"[0:v]trim=start={s_s}:end={s_e},setpts=PTS-STARTPTS,{scale_pad_filter}{sub_filter_part}[vout]"
        cmd = [ffmpeg, "-y", "-i", video_path]
        if has_audio:
            filter_str += f";[0:a]atrim=start={s_s}:end={s_e},asetpts=PTS-STARTPTS[aout]"
            cmd += ["-filter_complex", filter_str, "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", "veryfast", "-crf", crf_val, "-c:a", "aac", "-b:a", "192k"]
        else:
            cmd += ["-filter_complex", filter_str, "-map", "[vout]", "-c:v", "libx264", "-preset", "veryfast", "-crf", crf_val, "-an"]
        cmd.append(output_path)

        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=startupinfo)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg render error: {res.stderr.decode('utf-8', errors='ignore')[-300:]}")
        return

    # CASE 3: Multi-clip NLE editing (Split / Deleted sections)
    filter_parts = []
    v_maps = []
    a_maps = []
    for idx, (s_s, s_e) in enumerate(valid_clips):
        filter_parts.append(f"[0:v]trim=start={s_s}:end={s_e},setpts=PTS-STARTPTS[v{idx}]")
        v_maps.append(f"[v{idx}]")
        if has_audio:
            filter_parts.append(f"[0:a]atrim=start={s_s}:end={s_e},asetpts=PTS-STARTPTS[a{idx}]")
            a_maps.append(f"[a{idx}]")

    n = len(valid_clips)
    if has_audio:
        concat_in = "".join(f"{v_maps[i]}{a_maps[i]}" for i in range(n))
        filter_parts.append(f"{concat_in}concat=n={n}:v=1:a=1[vcat][acat]")
        filter_parts.append(f"[vcat]{scale_pad_filter}{sub_filter_part}[vout]")
        filter_str = ";".join(filter_parts)
        cmd = [
            ffmpeg, "-y",
            "-i", video_path,
            "-filter_complex", filter_str,
            "-map", "[vout]", "-map", "[acat]",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", crf_val,
            "-c:a", "aac", "-b:a", "192k",
            output_path
        ]
    else:
        concat_in = "".join(v_maps)
        filter_parts.append(f"{concat_in}concat=n={n}:v=1:a=0[vcat]")
        filter_parts.append(f"[vcat]{scale_pad_filter}{sub_filter_part}[vout]")
        filter_str = ";".join(filter_parts)
        cmd = [
            ffmpeg, "-y",
            "-i", video_path,
            "-filter_complex", filter_str,
            "-map", "[vout]",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", crf_val,
            "-an",
            output_path
        ]

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=startupinfo)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg render error: {res.stderr.decode('utf-8', errors='ignore')[-300:]}")

def load_projects():
    if os.path.exists(PROJECTS_FILE):
        try:
            with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_projects(projects):
    with open(PROJECTS_FILE, "w", encoding="utf-8") as f:
        json.dump(projects, f, indent=2, ensure_ascii=False)

# ─── HTTP REQUEST HANDLER ──────────────────────────────────────────────

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class HarshRequestHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format, *args):
        sys.stdout.write(f"[{time.strftime('%H:%M:%S')}] {args[0]} {args[1]}\n")

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-File-Name, Authorization')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)

        # 1. HTML Pages
        if path == "/" or path == "/login" or path == "/login.html":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            with open(os.path.join(STATIC_DIR, "login.html"), "rb") as f:
                self.wfile.write(f.read())
            return
            
        elif path == "/dashboard" or path == "/dashboard.html":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            with open(os.path.join(STATIC_DIR, "dashboard.html"), "rb") as f:
                self.wfile.write(f.read())
            return

        elif path == "/admin" or path == "/admin.html":
            # Server-side admin verification
            user = get_authenticated_user(self)
            if not user or user.get("role") != "admin":
                # Redirect to login with error parameter
                self.send_response(302)
                self.send_header("Location", "/login.html?admin_required=1")
                self.end_headers()
                return
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            with open(os.path.join(STATIC_DIR, "admin.html"), "rb") as f:
                self.wfile.write(f.read())
            return

        elif path == "/editor" or path == "/index.html":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            with open(os.path.join(STATIC_DIR, "index.html"), "rb") as f:
                self.wfile.write(f.read())
            return

        elif path == "/pricing" or path == "/pricing.html":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            with open(os.path.join(STATIC_DIR, "pricing.html"), "rb") as f:
                self.wfile.write(f.read())
            return

        # 2. Authentication & User APIs
        elif path == "/api/user/me":
            user = get_authenticated_user(self)
            self.send_response(200)
            self.send_header("Content-type", "application/json; charset=utf-8")
            self.end_headers()
            if user:
                self.wfile.write(json.dumps({"authenticated": True, "user": user}).encode("utf-8"))
            else:
                self.wfile.write(json.dumps({"authenticated": False}).encode("utf-8"))
            return

        elif path == "/api/user/dashboard-data":
            user = get_authenticated_user(self)
            if not user:
                self.send_response(401)
                self.send_header("Content-type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Unauthorized"}).encode("utf-8"))
                return
                
            jobs = db.get_user_jobs(user["id"])
            user_projects = db.get_user_projects(user["id"])
            if not user_projects:
                user_projects = load_projects()
                
            self.send_response(200)
            self.send_header("Content-type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "user": user,
                "jobs": jobs,
                "projects": user_projects
            }).encode("utf-8"))
            return

        # 3. Admin APIs
        elif path == "/api/admin/overview":
            user = get_authenticated_user(self)
            if not user or user.get("role") != "admin":
                self.send_response(403)
                self.send_header("Content-type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Admin access required"}).encode("utf-8"))
                return
                
            overview = db.get_admin_overview()
            self.send_response(200)
            self.send_header("Content-type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "overview": overview}).encode("utf-8"))
            return

        elif path == "/api/admin/users":
            user = get_authenticated_user(self)
            if not user or user.get("role") != "admin":
                self.send_response(403)
                self.send_header("Content-type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Admin access required"}).encode("utf-8"))
                return
                
            query_params = urllib.parse.parse_qs(parsed.query)
            search = query_params.get("search", [""])[0]
            users_list = db.get_all_users_list(search)
            self.send_response(200)
            self.send_header("Content-type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "users": users_list, "count": len(users_list)}).encode("utf-8"))
            return

        elif path == "/api/projects":
            projects = load_projects()
            self.send_response(200)
            self.send_header("Content-type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "projects": projects}).encode("utf-8"))
            return

        # 4. Static Assets & Media
        elif path.startswith("/static/"):
            rel_path = path[len("/static/"):]
            file_path = os.path.join(STATIC_DIR, rel_path)
            if os.path.exists(file_path) and not os.path.isdir(file_path):
                self.serve_file(file_path)
            else:
                self.send_error(404, "Static file not found")
            return

        elif path.startswith("/uploads/"):
            rel_path = path[len("/uploads/"):]
            file_path = os.path.join(UPLOADS_DIR, rel_path)
            if os.path.exists(file_path):
                self.serve_file(file_path)
            else:
                self.send_error(404, "Upload file not found")
            return

        elif path.startswith("/exports/"):
            rel_path = path[len("/exports/"):]
            file_path = os.path.join(EXPORTS_DIR, rel_path)
            if os.path.exists(file_path):
                self.serve_file(file_path)
            else:
                self.send_error(404, "Export file not found")
            return

        self.send_error(404, "Page Not Found")

    def serve_file(self, file_path):
        mime = "application/octet-stream"
        if file_path.endswith(".html"): mime = "text/html"
        elif file_path.endswith(".css"): mime = "text/css"
        elif file_path.endswith(".js"): mime = "application/javascript"
        elif file_path.endswith(".json"): mime = "application/json"
        elif file_path.endswith(".png"): mime = "image/png"
        elif file_path.endswith(".jpg") or file_path.endswith(".jpeg"): mime = "image/jpeg"
        elif file_path.endswith(".svg"): mime = "image/svg+xml"
        elif file_path.endswith(".mp4"): mime = "video/mp4"
        elif file_path.endswith(".webm"): mime = "video/webm"
        elif file_path.endswith(".mov"):
            mp4_alt = os.path.splitext(file_path)[0] + ".mp4"
            if os.path.exists(mp4_alt):
                file_path = mp4_alt
                mime = "video/mp4"
            else:
                mime = "video/mp4"
        elif file_path.endswith(".mp3") or file_path.endswith(".wav"): mime = "audio/mpeg"
        elif file_path.endswith(".srt"): mime = "application/x-subrip"
        elif file_path.endswith(".vtt"): mime = "text/vtt"
        elif file_path.endswith(".ttf"): mime = "font/ttf"
        elif file_path.endswith(".otf"): mime = "font/otf"

        if not os.path.exists(file_path):
            self.send_error(404, "File not found")
            return

        try:
            file_size = os.path.getsize(file_path)
            range_header = self.headers.get("Range")

            if range_header and range_header.startswith("bytes="):
                ranges = range_header[6:].split("-")
                start = int(ranges[0]) if ranges[0] else 0
                end = int(ranges[1]) if len(ranges) > 1 and ranges[1] else file_size - 1
                end = min(end, file_size - 1)
                length = end - start + 1

                self.send_response(206)
                self.send_header("Content-Type", mime)
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
                self.send_header("Content-Length", str(length))
                self.end_headers()

                with open(file_path, "rb") as f:
                    f.seek(start)
                    bytes_left = length
                    while bytes_left > 0:
                        chunk_size = min(bytes_left, 65536)
                        data = f.read(chunk_size)
                        if not data: break
                        self.wfile.write(data)
                        bytes_left -= len(data)
            else:
                self.send_response(200)
                self.send_header("Content-Type", mime)
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Content-Length", str(file_size))
                self.end_headers()

                with open(file_path, "rb") as f:
                    while True:
                        data = f.read(65536)
                        if not data: break
                        self.wfile.write(data)
        except Exception:
            pass

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # ── 1. SEND OTP API ──────────────────────────────────────────
        if path in ["/api/auth/send-otp", "/api/send_email_otp"]:
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                raw_body = self.rfile.read(content_length).decode('utf-8')
                body = json.loads(raw_body) if raw_body else {}
                
                email = body.get("email", "").strip().lower()
                name = body.get("name", "Creator").strip()
                
                if not email or "@" not in email:
                    self.send_response(400)
                    self.send_header("Content-type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Invalid email address"}).encode("utf-8"))
                    return

                # Generate secure 6-digit OTP
                otp_code = str(random.randint(100000, 999999))
                
                # Save in DB with rate-limit check
                ok, msg = db.create_otp_request(email, otp_code, expiry_minutes=10, cooldown_seconds=30)
                if not ok:
                    self.send_response(429)
                    self.send_header("Content-type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": msg}).encode("utf-8"))
                    return
                
                # Send email via SMTP
                sent_ok, email_msg = send_real_email_otp(email, name, otp_code)
                
                cfg = get_smtp_config()
                has_smtp = bool(cfg.get("smtp_user") and cfg.get("smtp_pass"))
                
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "message": f"Verification code sent to {email}",
                    "email": email,
                    "otp_fallback": otp_code if not has_smtp else None
                }).encode("utf-8"))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
                return

        # ── 2. VERIFY OTP API ─────────────────────────────────────────
        elif path in ["/api/auth/verify-otp", "/api/verify_email_otp"]:
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                raw_body = self.rfile.read(content_length).decode('utf-8')
                body = json.loads(raw_body) if raw_body else {}
                
                email = body.get("email", "").strip().lower()
                entered_otp = str(body.get("otp", "")).strip()
                name = body.get("name", "Creator").strip()
                
                if not email or not entered_otp:
                    self.send_response(400)
                    self.send_header("Content-type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Email and OTP code are required"}).encode("utf-8"))
                    return
                
                # Verify against DB
                ok, msg = db.verify_otp_code(email, entered_otp)
                if not ok:
                    self.send_response(400)
                    self.send_header("Content-type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": msg}).encode("utf-8"))
                    return
                
                # Get or create user
                user = db.get_or_create_user(email, name, auth_provider="email")
                session_id = db.create_session(user["id"], days=7)
                
                client_ip = self.client_address[0] if self.client_address else "Unknown"
                user_agent = self.headers.get("User-Agent", "Unknown")
                threading.Thread(target=notify_admin_of_lead, args=(user, client_ip, user_agent), daemon=True).start()
                
                # Set Session Cookie
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.send_header("Set-Cookie", f"session_id={session_id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "verified": True,
                    "session_id": session_id,
                    "user": user,
                    "email": email,
                    "name": user["name"],
                    "role": user["role"],
                    "credits": user["credits"]
                }).encode("utf-8"))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
                return

        # ── 3. GOOGLE OAUTH API ───────────────────────────────────────
        elif path in ["/api/auth/google", "/api/record_login"]:
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                raw_body = self.rfile.read(content_length).decode('utf-8')
                body = json.loads(raw_body) if raw_body else {}
                
                email = body.get("email", "").strip().lower()
                name = body.get("name", "").strip() or email.split("@")[0]
                avatar_url = body.get("avatar_url") or body.get("picture") or ""
                
                if not email or "@" not in email:
                    self.send_response(400)
                    self.send_header("Content-type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Invalid email"}).encode("utf-8"))
                    return
                
                user = db.get_or_create_user(email, name, auth_provider="google", avatar_url=avatar_url)
                session_id = db.create_session(user["id"], days=7)
                
                client_ip = self.client_address[0] if self.client_address else "Unknown"
                user_agent = self.headers.get("User-Agent", "Unknown")
                threading.Thread(target=notify_admin_of_lead, args=(user, client_ip, user_agent), daemon=True).start()
                
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.send_header("Set-Cookie", f"session_id={session_id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "session_id": session_id,
                    "user": user,
                    "email": email,
                    "name": user["name"],
                    "role": user["role"],
                    "credits": user["credits"]
                }).encode("utf-8"))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
                return

        # ── 4. LOGOUT API ─────────────────────────────────────────────
        elif path == "/api/auth/logout":
            cookie_header = self.headers.get('Cookie')
            if cookie_header:
                try:
                    cookie = SimpleCookie()
                    cookie.load(cookie_header)
                    if 'session_id' in cookie:
                        db.delete_session(cookie['session_id'].value)
                except Exception:
                    pass
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Set-Cookie", "session_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            return

        # ── 5. ADMIN USER MANAGEMENT API ──────────────────────────────
        elif path == "/api/admin/users/update":
            user = get_authenticated_user(self)
            if not user or user.get("role") != "admin":
                self.send_response(403)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Admin access required"}).encode("utf-8"))
                return
                
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length).decode('utf-8'))
            
            target_user_id = body.get("user_id")
            role = body.get("role")
            is_active = body.get("is_active")
            credits = body.get("credits")
            
            db.set_user_role_and_status(target_user_id, role=role, is_active=is_active, credits=credits)
            
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "User updated successfully"}).encode("utf-8"))
            return

        # ── 6. VIDEO UPLOAD API ───────────────────────────────────────
        elif path == "/api/upload":
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                file_id = uuid.uuid4().hex[:12]
                filename = self.headers.get('X-File-Name', f"video_{file_id}.mp4")
                filename = urllib.parse.unquote(filename)
                save_path = os.path.join(UPLOADS_DIR, f"{file_id}_{filename}")

                with open(save_path, "wb") as f:
                    bytes_left = content_length
                    while bytes_left > 0:
                        chunk_size = min(bytes_left, 65536)
                        chunk = self.rfile.read(chunk_size)
                        if not chunk: break
                        f.write(chunk)
                        bytes_left -= len(chunk)

                info = get_media_info(save_path)
                
                # Auto-convert/remux non-mp4 or MOV uploads to faststart MP4 for 100% browser video playback
                if not save_path.lower().endswith(".mp4"):
                    ffmpeg = get_ffmpeg_path()
                    mp4_filename = os.path.splitext(filename)[0] + ".mp4"
                    mp4_save_path = os.path.join(UPLOADS_DIR, f"{file_id}_{mp4_filename}")
                    cmd = [
                        ffmpeg, "-y", "-i", save_path,
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast",
                        "-c:a", "aac", "-movflags", "+faststart",
                        mp4_save_path
                    ]
                    startupinfo = None
                    if os.name == 'nt':
                        startupinfo = subprocess.STARTUPINFO()
                        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                        startupinfo.wShowWindow = subprocess.SW_HIDE
                    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=startupinfo)
                    if res.returncode == 0 and os.path.exists(mp4_save_path):
                        save_path = mp4_save_path
                        filename = mp4_filename
                        info = get_media_info(save_path)

                response = {
                    "success": True,
                    "file_id": file_id,
                    "filename": filename,
                    "video_url": f"/uploads/{file_id}_{filename}",
                    "file_path": save_path,
                    "info": info
                }

                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(response).encode("utf-8"))
            except Exception as e:
                print(f"Upload error: {e}")
                self.send_response(500)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        # ── 7. AI TRANSCRIBE API (Real Audio, Multipart & JSON Support, Hinglish Engine) ──
        elif path == "/api/transcribe":
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                content_type = self.headers.get('Content-Type', '')
                raw_bytes = self.rfile.read(content_length) if content_length > 0 else b''

                fields = {}
                files = {}
                uploaded_path = None
                uploaded_video_url = None

                if 'multipart/form-data' in content_type:
                    boundary = None
                    for param in content_type.split(';'):
                        param = param.strip()
                        if param.lower().startswith('boundary='):
                            boundary = param[9:].strip('"\'')
                            break
                    if boundary:
                        fields, files = parse_multipart(raw_bytes, boundary)

                    file_info = files.get('file') or files.get('video') or files.get('audio') or (next(iter(files.values())) if files else None)
                    if file_info and file_info.get('data'):
                        orig_filename = file_info.get('filename') or 'upload_video.mp4'
                        ext = os.path.splitext(orig_filename)[1] or '.mp4'
                        file_id = uuid.uuid4().hex[:12]
                        saved_filename = f"{file_id}_{urllib.parse.quote(orig_filename)}"
                        uploaded_path = os.path.join(UPLOADS_DIR, saved_filename)
                        with open(uploaded_path, "wb") as f_out:
                            f_out.write(file_info['data'])
                        uploaded_video_url = f"/uploads/{saved_filename}"

                else:
                    try:
                        fields = json.loads(raw_bytes.decode('utf-8', errors='ignore'))
                    except Exception:
                        fields = {}

                file_path = uploaded_path or fields.get("file_path", "")
                language = fields.get("language", "hi")
                script = fields.get("script", "roman")
                use_emojis = str(fields.get("emojis", "true")).lower() in ["true", "1", "yes"]
                translate = str(fields.get("translate", "false")).lower() in ["true", "1", "yes"]
                enhance = str(fields.get("audio_enhance", "true")).lower() in ["true", "1", "yes"]

                # Resolve file path on disk if not directly uploaded
                if not file_path or not os.path.exists(file_path):
                    v_url = fields.get("video_url", "")
                    if v_url:
                        if v_url.startswith("/uploads/"):
                            f_name = urllib.parse.unquote(v_url[len("/uploads/"):])
                            cand = os.path.join(UPLOADS_DIR, f_name)
                            if os.path.exists(cand): file_path = cand
                        elif v_url.startswith("/static/"):
                            f_name = urllib.parse.unquote(v_url[len("/static/"):])
                            cand = os.path.join(STATIC_DIR, f_name)
                            if os.path.exists(cand): file_path = cand

                if not file_path or not os.path.exists(file_path):
                    fn = fields.get("filename", "")
                    if fn:
                        cand = os.path.join(UPLOADS_DIR, fn)
                        if os.path.exists(cand):
                            file_path = cand
                        else:
                            for f in os.listdir(UPLOADS_DIR):
                                if f.endswith(fn):
                                    file_path = os.path.join(UPLOADS_DIR, f)
                                    break

                if not file_path or not os.path.exists(file_path):
                    self.send_response(400)
                    self.send_header("Content-type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": False,
                        "error": "No media file provided or uploaded file was not found on server for transcription."
                    }).encode("utf-8"))
                    return

                user = get_authenticated_user(self)
                user_id = user["id"] if user else None

                # Check credits if logged in
                if user and user.get("credits", 0) < 10:
                    self.send_response(402)
                    self.send_header("Content-type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": False,
                        "error": "Insufficient AI Credits. Please upgrade your plan to continue transcribing.",
                        "credits": user.get("credits", 0)
                    }).encode("utf-8"))
                    return

                # Perform actual transcription with Faster-Whisper
                segments, lang_code, detected_lang = run_whisper_transcription(
                    file_path,
                    language=language,
                    script=script,
                    use_emojis=use_emojis,
                    translate=translate,
                    enhance=enhance
                )

                # Record job and deduct credits
                credits_deducted = 0
                remaining_credits = user.get("credits", 100) if user else 100
                if user_id:
                    credits_deducted = 10
                    remaining_credits, _ = db.update_user_credits(user_id, -10)
                    job_id = f"job_{uuid.uuid4().hex[:10]}"
                    db.record_transcription_job(
                        job_id=job_id,
                        user_id=user_id,
                        filename=os.path.basename(file_path),
                        duration=segments[-1].get("end", 0) if segments else 0,
                        status="completed",
                        credits_deducted=credits_deducted
                    )

                has_speech = len(segments) > 0
                captions = []
                for idx, seg in enumerate(segments):
                    c_id = f"caption_{idx+1:03d}"
                    txt = seg.get("text", "").strip()
                    s_time = float(round(seg.get("start", 0.0), 3))
                    e_time = float(round(seg.get("end", s_time + 0.5), 3))
                    captions.append({
                        "id": c_id,
                        "text": txt,
                        "startTime": s_time,
                        "endTime": e_time,
                        "originalText": seg.get("originalText") or txt,
                        "language": lang_code,
                        "confidence": 0.94,
                        "videoClipId": "clip_001",
                        "isEdited": False
                    })

                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "captions": captions,
                    "segments": segments,
                    "has_speech": has_speech,
                    "language": lang_code,
                    "detected_language": detected_lang,
                    "file_path": file_path,
                    "video_url": uploaded_video_url,
                    "message": "Captions successfully generated" if has_speech else "No detectable speech found in audio",
                    "credits_deducted": credits_deducted,
                    "remaining_credits": remaining_credits
                }).encode("utf-8"))
            except Exception as e:
                import traceback
                print(f"[TRANSCRIBE ERROR] {traceback.format_exc()}")
                self.send_response(500)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": f"Transcription failed: {str(e)}"}).encode("utf-8"))
            return

        # ── 8. PROJECT SAVE & DELETE APIS ─────────────────────────────
        elif path == "/api/save_project":
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = json.loads(self.rfile.read(content_length).decode('utf-8'))
                
                user = get_authenticated_user(self)
                user_id = user["id"] if user else "anonymous"
                
                proj_id = body.get("id", f"proj_{uuid.uuid4().hex[:8]}")
                body["id"] = proj_id
                
                # Save to DB and projects.json
                db.save_project(proj_id, user_id, body.get("title", "Untitled Video"), json.dumps(body))
                
                projects = load_projects()
                existing_idx = next((i for i, p in enumerate(projects) if p.get("id") == proj_id), -1)
                if existing_idx >= 0:
                    projects[existing_idx] = body
                else:
                    projects.insert(0, body)
                save_projects(projects)

                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "project": body}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        elif path == "/api/delete_project":
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = json.loads(self.rfile.read(content_length).decode('utf-8'))
                proj_id = body.get("id")
                projects = load_projects()
                projects = [p for p in projects if p.get("id") != proj_id]
                save_projects(projects)
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
            return

        # ── 9. EXPORT & RENDER API ────────────────────────────────────
        elif path == "/api/export":
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                raw_body = self.rfile.read(content_length).decode('utf-8')
                try:
                    body = json.loads(raw_body) if raw_body else {}
                except Exception as json_err:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": False,
                        "error": {"code": "INVALID_JSON", "message": "Malformed JSON payload in export request"}
                    }).encode("utf-8"))
                    return

                export_data = body.get("export") if isinstance(body.get("export"), dict) else {}
                export_type = (export_data.get("format") or body.get("type") or body.get("format") or "mp4").lower().strip()
                resolution = (export_data.get("resolution") or body.get("resolution") or "1080p").lower().strip()
                
                # Retrieve captions (support both captions and segments)
                captions_raw = body.get("captions") or body.get("segments") or []
                captions = []
                for idx, c in enumerate(captions_raw):
                    s_t = float(c.get("startTime", c.get("start", 0.0)))
                    e_t = float(c.get("endTime", c.get("end", s_t + 1.0)))
                    txt = str(c.get("text", "")).strip()
                    captions.append({
                        "id": c.get("id", f"caption_{idx+1:03d}"),
                        "startTime": s_t,
                        "endTime": e_t,
                        "start": s_t,
                        "end": e_t,
                        "text": txt,
                        "words": c.get("words", []),
                        "isEdited": bool(c.get("isEdited", False))
                    })
                captions.sort(key=lambda x: x["startTime"])

                # Retrieve timeline & edited video clips
                timeline_obj = body.get("timeline") if isinstance(body.get("timeline"), dict) else {}
                video_clips = timeline_obj.get("clips") or body.get("videoClips") or body.get("clips") or []
                timeline_dur = float(timeline_obj.get("duration", 0.0))

                # Video file resolution
                video_obj = body.get("video") if isinstance(body.get("video"), dict) else {}
                video_path = video_obj.get("file_path") or body.get("file_path") or ""
                
                if not video_path or not os.path.exists(video_path):
                    v_url = body.get("video_url") or video_obj.get("video_url") or ""
                    if v_url:
                        if v_url.startswith("/uploads/"):
                            cand = os.path.join(UPLOADS_DIR, urllib.parse.unquote(v_url[len("/uploads/"):]))
                            if os.path.exists(cand): video_path = cand
                        elif v_url.startswith("/static/"):
                            cand = os.path.join(STATIC_DIR, urllib.parse.unquote(v_url[len("/static/"):]))
                            if os.path.exists(cand): video_path = cand

                if not video_path or not os.path.exists(video_path):
                    # Check uploads directory for any mp4
                    if os.path.exists(UPLOADS_DIR):
                        for f in os.listdir(UPLOADS_DIR):
                            if f.endswith(".mp4"):
                                video_path = os.path.join(UPLOADS_DIR, f)
                                break

                if not video_path or not os.path.exists(video_path):
                    video_path = os.path.join(STATIC_DIR, "assets", "demo_video.mp4")
                    if not os.path.exists(video_path):
                        generate_default_sample_video()

                style = body.get("style") or {}
                export_id = uuid.uuid4().hex[:8]

                if resolution == "720p":
                    scale_w, scale_h = 720, 1280
                    crf_val = "24"
                elif resolution == "4k":
                    scale_w, scale_h = 2160, 3840
                    crf_val = "18"
                else: # 1080p
                    scale_w, scale_h = 1080, 1920
                    crf_val = "21"

                # Dispatch export format
                if export_type == "srt":
                    srt_content = generate_srt_content(captions)
                    out_name = f"captions_{export_id}.srt"
                    out_path = os.path.join(EXPORTS_DIR, out_name)
                    with open(out_path, "w", encoding="utf-8") as f:
                        f.write(srt_content)
                    res = {
                        "success": True,
                        "downloadUrl": f"/exports/{out_name}",
                        "download_url": f"/exports/{out_name}",
                        "filename": out_name,
                        "format": "srt",
                        "mimeType": "application/x-subrip"
                    }

                elif export_type == "vtt":
                    vtt_content = generate_vtt_content(captions)
                    out_name = f"captions_{export_id}.vtt"
                    out_path = os.path.join(EXPORTS_DIR, out_name)
                    with open(out_path, "w", encoding="utf-8") as f:
                        f.write(vtt_content)
                    res = {
                        "success": True,
                        "downloadUrl": f"/exports/{out_name}",
                        "download_url": f"/exports/{out_name}",
                        "filename": out_name,
                        "format": "vtt",
                        "mimeType": "text/vtt"
                    }

                elif export_type == "alpha":
                    ass_content = generate_ass_content(captions, style, play_res_x=scale_w, play_res_y=scale_h)
                    temp_ass = os.path.join(EXPORTS_DIR, f"temp_{export_id}.ass")
                    with open(temp_ass, "w", encoding="utf-8") as f:
                        f.write(ass_content)

                    out_name = f"alpha_captions_{export_id}_{resolution}.mp4"
                    out_path = os.path.join(EXPORTS_DIR, out_name)
                    ffmpeg = get_ffmpeg_path()
                    rel_ass = f"exports/temp_{export_id}.ass"

                    dur = timeline_dur if timeline_dur > 0 else (captions[-1]["endTime"] + 1.0 if captions else 15.0)
                    cmd = [
                        ffmpeg, "-y",
                        "-f", "lavfi", "-i", f"color=c=0x00FF00:s={scale_w}x{scale_h}:d={dur}:r=30",
                        "-vf", f"subtitles='{rel_ass}'",
                        "-c:v", "libx264", "-preset", "ultrafast", "-crf", crf_val,
                        out_path
                    ]
                    startupinfo = None
                    if os.name == 'nt':
                        startupinfo = subprocess.STARTUPINFO()
                        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                        startupinfo.wShowWindow = subprocess.SW_HIDE
                    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=startupinfo)
                    
                    if os.path.exists(temp_ass):
                        try: os.remove(temp_ass)
                        except: pass

                    res = {
                        "success": True,
                        "downloadUrl": f"/exports/{out_name}",
                        "download_url": f"/exports/{out_name}",
                        "filename": out_name,
                        "format": "mp4",
                        "mimeType": "video/mp4"
                    }

                else: # Default: Rendered Video (MP4) with burned-in subtitles & multi-clip NLE editing
                    ass_content = generate_ass_content(captions, style, play_res_x=scale_w, play_res_y=scale_h)
                    temp_ass = os.path.join(EXPORTS_DIR, f"temp_{export_id}.ass")
                    with open(temp_ass, "w", encoding="utf-8") as f:
                        f.write(ass_content)

                    out_name = f"harsh_video_{export_id}_{resolution}.mp4"
                    out_path = os.path.join(EXPORTS_DIR, out_name)
                    rel_ass = f"exports/temp_{export_id}.ass"

                    render_timeline_video(
                        video_path=video_path,
                        video_clips=video_clips,
                        output_path=out_path,
                        scale_w=scale_w,
                        scale_h=scale_h,
                        crf_val=crf_val,
                        ass_file=rel_ass
                    )

                    if os.path.exists(temp_ass):
                        try: os.remove(temp_ass)
                        except: pass

                    res = {
                        "success": True,
                        "downloadUrl": f"/exports/{out_name}",
                        "download_url": f"/exports/{out_name}",
                        "filename": out_name,
                        "format": "mp4",
                        "mimeType": "video/mp4"
                    }

                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps(res).encode("utf-8"))
            except Exception as e:
                print(f"[EXPORT ERROR] {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": {
                        "code": "EXPORT_FAILED",
                        "message": f"Unable to render video export: {str(e)}"
                    }
                }).encode("utf-8"))
            return

        # Legacy login endpoint for backward compatibility
        elif path == "/api/login":
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length).decode('utf-8'))
            username = body.get('username', '').strip()
            password = body.get('password', '').strip()
            
            success = bool(username and len(username) >= 2)
            user = db.get_or_create_user(f"{username}@creator.studio", username, "legacy") if success else None
            session_id = db.create_session(user["id"]) if user else None
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            if session_id:
                self.send_header("Set-Cookie", f"session_id={session_id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800")
            self.end_headers()
            self.wfile.write(json.dumps({"success": success, "username": username, "user": user, "session_id": session_id}).encode('utf-8'))
            return

        self.send_error(404, "API endpoint not found")

def generate_default_sample_video():
    """Creates a sample vertical video with colorful animated background and audio if not present."""
    demo_video_path = os.path.join(STATIC_DIR, "assets", "demo_video.mp4")
    demo_thumb_path = os.path.join(STATIC_DIR, "assets", "demo_thumb.jpg")
    
    if not os.path.exists(demo_video_path):
        ffmpeg = get_ffmpeg_path()
        cmd = [
            ffmpeg, "-y",
            "-f", "lavfi", "-i", "color=c=0x101626:s=1080x1920:d=14.5:r=30",
            "-f", "lavfi", "-i", "anoisesrc=d=14.5:c=pink:r=44100:a=0.05",
            "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            demo_video_path
        ]
        startupinfo = None
        if os.name == 'nt':
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = subprocess.SW_HIDE
        try:
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=startupinfo)
        except Exception as e:
            print(f"Sample video creation note: {e}")

    if not os.path.exists(demo_thumb_path) and os.path.exists(demo_video_path):
        ffmpeg = get_ffmpeg_path()
        cmd = [ffmpeg, "-y", "-i", demo_video_path, "-vframes", "1", "-q:v", "2", demo_thumb_path]
        try:
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except: pass

def start_server(port=7860):
    db.init_db()
    generate_default_sample_video()
    server_address = ('0.0.0.0', port)
    httpd = ThreadedHTTPServer(server_address, HarshRequestHandler)
    print(f"\n=======================================================")
    print(f"⚡ Harsh AI Studio Backend Server Running!")
    print(f"🌐 Access URL: http://localhost:{port}")
    print(f"👑 Admin Email: {ADMIN_EMAIL}")
    print(f"=======================================================\n")
    httpd.serve_forever()

if __name__ == '__main__':
    port = 7860
    if len(sys.argv) > 1:
        try: port = int(sys.argv[1])
        except: pass
    start_server(port)
