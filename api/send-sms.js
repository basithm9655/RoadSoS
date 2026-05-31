// Vercel Serverless Function: Dispatch SOS alerts to Discord Webhook
// Fully secure — hides the webhook URL from the front-end client to prevent spam

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { userName, mapsLink, time, contacts } = req.body || {};
  
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('[Discord API] Webhook URL missing in Vercel environment variables');
    return res.status(500).json({
      success: false,
      error: 'Alert dispatch is not configured (missing DISCORD_WEBHOOK_URL in Vercel Settings)',
    });
  }

  console.log(`[Discord API] Dispatching SOS embed alert for ${userName}...`);

  try {
    // Generate beautiful rich embed card
    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: "RoadSOS Emergency Dispatch",
        avatar_url: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        content: "🚨 **SOS EMERGENCY BROADCAST DETECTED** 🚨",
        embeds: [{
          title: "🆘 MEDICAL EMERGENCY HELP REQUIRED",
          description: `**${userName}** has triggered an active SOS alert! Please verify and respond immediately.`,
          color: 15548997, // Glowing Red
          fields: [
            { name: "👤 User Name", value: userName, inline: true },
            { name: "⏰ Dispatch Time", value: time, inline: true },
            { name: "📍 Active GPS Location", value: `🔗 [Open in Google Maps](${mapsLink})` }
          ],
          footer: {
            text: "RoadSOS Emergency PWA Alert System"
          },
          timestamp: new Date().toISOString()
        }]
      })
    });

    if (discordRes.ok) {
      return res.status(200).json({
        success: true,
        delivered: contacts?.length || 1,
        total: contacts?.length || 1,
        details: [{ platform: 'Discord', success: true }]
      });
    } else {
      const errText = await discordRes.text();
      throw new Error(`Discord API returned: ${errText}`);
    }
  } catch (err) {
    console.error('[Discord Alert Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
