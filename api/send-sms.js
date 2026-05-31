// Vercel Serverless Function: Dispatch Emergency Alerts via Meta WhatsApp Cloud API
// Safely reads credentials from environment variables to keep them hidden from the web browser client

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
  
  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ success: false, error: 'No contacts provided' });
  }

  // Retrieve credentials from Vercel Environment Variables securely
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.error('[WhatsApp API] Credentials missing in Vercel environment variables');
    return res.status(500).json({
      success: false,
      error: 'WhatsApp API is not configured (missing WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID in Vercel Settings)',
    });
  }

  console.log(`[WhatsApp API] Dispatching SOS to ${contacts.length} recipients...`);

  const results = [];

  const promises = contacts.map(async (c) => {
    if (!c.phone) return { phone: c.phone, success: false, error: 'Missing phone' };

    // Format phone number: WhatsApp requires international code without '+' or spaces (e.g. 919876543210)
    let formattedPhone = c.phone.trim().replace(/\D/g, ''); // strip spaces, brackets, dashes
    if (formattedPhone.length === 10) {
      formattedPhone = `91${formattedPhone}`; // Default to India country code 91 if 10-digit
    }

    try {
      // Dispatch Meta Cloud API message
      // NOTE: We use Meta's default pre-approved template 'hello_world' to ensure instant test delivery!
      const waRes = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: 'hello_world', // Pre-approved template for instant testing
            language: { code: 'en_US' }
          }
        }),
      });

      const data = await waRes.json();

      if (waRes.ok) {
        return { phone: formattedPhone, success: true, messageId: data.messages?.[0]?.id };
      } else {
        return { phone: formattedPhone, success: false, error: data.error?.message || 'Meta API rejected dispatch' };
      }
    } catch (err) {
      return { phone: formattedPhone, success: false, error: err.message };
    }
  });

  try {
    const outputs = await Promise.all(promises);
    const successful = outputs.filter((o) => o.success).length;

    console.log(`[WhatsApp API] Completed: ${successful}/${outputs.length} successful transmissions.`);
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
