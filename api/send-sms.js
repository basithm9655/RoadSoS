// Vercel Serverless Function: Secure Google Form SOS Dispatch for Email Automation
// Submits emergency data to Google Forms securely, bypassing CORS restrictions

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

  // Google Form Action URL matching the public submission format
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSf1ZQdEm-3BoaWsoru6nVELnGgiP7lEX28FaGEA7P8ihTNSHA/formResponse";

  console.log(`[Google Form SOS] Submitting emergency data for ${userName} to ${contacts.length} recipients...`);

  const promises = contacts.map(async (c) => {
    if (!c.email) return { email: c.email, success: false, error: 'Missing email address' };

    try {
      // Build form-urlencoded request body matching Google Form DOM inputs
      const formParams = new URLSearchParams();
      formParams.append('entry.2005620554', time || new Date().toLocaleTimeString()); // time field
      formParams.append('entry.1745558313', `Emergency SOS alert triggered by ${userName || 'User'}`); // location details
      formParams.append('entry.1851319683', mapsLink || 'Location details pending live GPS lock'); // map link field
      formParams.append('entry.128770266', c.email.trim()); // email field

      // Technical Form Metadata from HTML DOM
      formParams.append('fvv', '1');
      formParams.append('pageHistory', '0');
      formParams.append('fbzx', '4438593293222363487');

      const response = await fetch(formUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formParams.toString()
      });

      // Google Forms typically returns 200 OK with HTML upon success
      if (response.ok) {
        return { email: c.email, success: true };
      } else {
        throw new Error(`Google Form returned status ${response.status}`);
      }
    } catch (err) {
      return { email: c.email, success: false, error: err.message };
    }
  });

  try {
    const outputs = await Promise.all(promises);
    const successful = outputs.filter((o) => o.success).length;

    console.log(`[Google Form SOS] Completed: ${successful}/${outputs.length} successful submissions.`);
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
