// Vercel Serverless Function: Direct Google Apps Script SOS Web App Dispatch
// Securely submits JSON SOS alert payloads directly to the user's Google Web App endpoint

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

  // Active Google Apps Script Web App URL provided by the user
  const scriptUrl = "https://script.google.com/macros/s/AKfycbzBw_8gRcNHRoRrOqy7yRsrGOshjzGsMR8ThBSef5yJqcY7XETIAh_EjvdXpow9rI0_Ww/exec";

  console.log(`[Google Apps Script] Sending SOS alerts for ${userName} to ${contacts.length} recipients...`);

  const promises = contacts.map(async (c) => {
    if (!c.email) return { email: c.email, success: false, error: 'Missing email address' };

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userName: userName || 'Unknown User',
          mapsLink: mapsLink || 'Location Details Pending Live GPS Lock',
          time: time || new Date().toLocaleTimeString(),
          email: c.email.trim()
        }),
        redirect: 'follow' // Follow Google Apps Script 302 redirects automatically
      });

      const text = await response.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { raw: text };
      }

      if (response.ok) {
        return { email: c.email, success: true, details: data };
      } else {
        throw new Error(`Google Web App rejected with status ${response.status}`);
      }
    } catch (err) {
      return { email: c.email, success: false, error: err.message };
    }
  });

  try {
    const outputs = await Promise.all(promises);
    const successful = outputs.filter((o) => o.success).length;

    console.log(`[Google Apps Script] Completed: ${successful}/${outputs.length} successful transmissions.`);
    return res.status(200).json({
      success: true,
      delivered: successful,
      total: outputs.length,
      details: outputs
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
