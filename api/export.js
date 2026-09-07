// Vercel Serverless Function: /api/export
// Handles subtitle exports (.srt, .vtt) and server-side fallback metadata

function formatSRTTime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function formatVTTTime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'ok', service: 'Harsh AI Studio Export Engine' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const exportType = (body.type || body.format || body.export?.format || 'mp4').toLowerCase();
    const captions = Array.isArray(body.captions) ? body.captions : (Array.isArray(body.segments) ? body.segments : []);
    const title = (body.title || body.video?.filename || 'video_captions').replace(/\.[^/.]+$/, "");

    // 1. SRT Export
    if (exportType === 'srt') {
      const srtText = captions.map((c, i) => {
        const start = c.startTime !== undefined ? c.startTime : (c.start || 0);
        const end = c.endTime !== undefined ? c.endTime : (c.end || start + 2);
        return `${i + 1}\n${formatSRTTime(start)} --> ${formatSRTTime(end)}\n${c.text || ''}\n`;
      }).join('\n');

      res.setHeader('Content-Type', 'application/x-subrip; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${title}.srt"`);
      return res.status(200).send(srtText);
    }

    // 2. VTT Export
    if (exportType === 'vtt') {
      let vttText = "WEBVTT\n\n";
      vttText += captions.map((c, i) => {
        const start = c.startTime !== undefined ? c.startTime : (c.start || 0);
        const end = c.endTime !== undefined ? c.endTime : (c.end || start + 2);
        return `${i + 1}\n${formatVTTTime(start)} --> ${formatVTTTime(end)}\n${c.text || ''}\n`;
      }).join('\n');

      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${title}.vtt"`);
      return res.status(200).send(vttText);
    }

    // 3. MP4 / Video Export (Handled on client-side for zero-timeout GPU canvas rendering)
    return res.status(200).json({
      success: true,
      mode: 'client_canvas',
      format: exportType,
      message: 'Client-side hardware accelerated video rendering active.'
    });

  } catch (err) {
    console.error('[EXPORT API ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
