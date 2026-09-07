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

    // ─── 1. TIER & PERMISSION VALIDATION ───
    const plan = (body.plan || body.tier || req.headers['x-user-plan'] || 'free').toString().trim().toLowerCase();
    const resolution = (body.resolution || body.res || '1080p').toString().trim().toLowerCase();
    const userCredits = Number(body.credits !== undefined ? body.credits : 10);

    // Free tier rule: Free users can only export in 720p
    if (plan === 'free') {
      if (resolution === '1080p' || resolution === '4k') {
        return res.status(403).json({
          success: false,
          error: `403 Forbidden: ${resolution.toUpperCase()} export is reserved for Pro users. Free users can only export in 720p.`,
          required_plan: 'pro',
          upgrade_url: '/pricing'
        });
      }
    }

    // ─── 2. CREDIT DEDUCTION CHECK ───
    // If Pro user, verify available credits
    if (plan === 'pro' && userCredits < 1) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient AI credits to export. Please recharge your credits.',
        remaining_credits: 0
      });
    }

    // Calculate remaining credits after 1 credit deduction (only Pro users use credits)
    const remainingCredits = plan === 'pro' ? Math.max(0, userCredits - 1) : userCredits;

    // 3. SRT Export
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

    // 4. VTT Export
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

    // 5. MP4 / Video Export (Handled on client-side canvas with backend authorization)
    return res.status(200).json({
      success: true,
      mode: 'client_canvas',
      format: exportType,
      resolution: resolution,
      plan: plan,
      deducted_credits: plan === 'pro' ? 1 : 0,
      remaining_credits: remainingCredits,
      message: 'Client-side hardware accelerated video rendering authorized.'
    });

  } catch (err) {
    console.error('[EXPORT API ERROR]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
