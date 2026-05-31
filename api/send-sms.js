// Vercel Serverless Function for sending emergency SMS via Twilio
// Keeps API keys completely hidden from client-side browsers and avoids CORS blocks

export default async function handler(req, res) {
  // 1. Enable CORS for local/production requests
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { userName, mapsLink, time, contacts } = req.body || {};
  
  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ success: false, error: 'No contacts provided' });
  }

  // Get credentials securely from environment variables
  const sid = process.env.TWILIO_SID;
  const auth = process.env.TWILIO_AUTH;
  const from = process.env.TWILIO_PHONE_NO;

  if (!sid || !auth || !from) {
    console.error('[SMS API] Twilio credentials missing in Vercel environment variables');
    return res.status(500).json({
      success: false,
      error: 'SMS service is not fully configured (missing Vercel Environment Variables)',
    });
  }

  console.log(`[SMS API] Dispatching SOS for ${userName} to ${contacts.length} recipients...`);

  const results = [];

  // Dispatch SMS in parallel
  const smsPromises = contacts.map(async (c) => {
    if (!c.phone) return { phone: c.phone, success: false, error: 'Missing phone' };

    // Format phone to international standard (defaulting to +91 India if 10-digit)
    let formattedPhone = c.phone.trim();
    if (formattedPhone.length === 10) {
      formattedPhone = `+91${formattedPhone}`;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+${formattedPhone}`;
    }

    const textMessage = `🆘 EMERGENCY ALERT from RoadSOS!\n\n${userName} needs HELP immediately.\n📍 Location: ${mapsLink}\n⏰ Time: ${time}\n\nPlease check on them now!`;

    try {
      const authHeader = 'Basic ' + Buffer.from(`${sid}:${auth}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', formattedPhone);
      params.append('From', from.trim());
      params.append('Body', textMessage);

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }
      );

      const data = await twilioRes.json();

      if (twilioRes.ok) {
        return { phone: formattedPhone, success: true, sid: data.sid };
      } else {
        return { phone: formattedPhone, success: false, error: data.message || 'Twilio rejected request' };
      }
    } catch (err) {
      return { phone: formattedPhone, success: false, error: err.message };
    }
  });

  try {
    const outputs = await Promise.all(smsPromises);
    const successful = outputs.filter((o) => o.success).length;

    console.log(`[SMS API] Completed: ${successful}/${outputs.length} successful transmissions.`);
    return res.status(200).json({
      success: true,
      delivered: successful,
      total: outputs.length,
      details: outputs,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
