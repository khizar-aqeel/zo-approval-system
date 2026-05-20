exports.handler = async (event) => {
  const { email, action, name } = event.queryStringParameters || {};

  if (!email || !action) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html' },
      body: '<h2>Invalid request</h2>'
    };
  }

  const NETLIFY_TOKEN = process.env.NETLIFY_API_TOKEN;
  const SITE_ID = process.env.NETLIFY_SITE_ID;

  try {
    if (action === 'approve') {
      // Save approved email to Netlify Blobs
      const res = await fetch(
        `https://api.netlify.com/api/v1/blobs/${SITE_ID}/zo-approved/${encodeURIComponent(email)}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${NETLIFY_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, approved: true, date: new Date().toISOString() })
        }
      );

      if (!res.ok) {
        throw new Error('Failed to save: ' + res.status + ' ' + await res.text());
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <html><body style="font-family:Arial;text-align:center;padding:60px;max-width:500px;margin:0 auto">
            <div style="font-size:60px;margin-bottom:20px">✅</div>
            <h2 style="color:#000">Approved!</h2>
            <p><strong>${name || email}</strong> has been approved for ZO® products.</p>
            <p style="color:#777;font-size:13px">They can now purchase ZO® products on essentialslondon.com.</p>
            <div style="margin-top:30px;padding:15px;background:#f9f9f9;border:1px solid #eee;font-size:13px">
              <strong>Customer:</strong> ${name}<br/>
              <strong>Email:</strong> ${email}
            </div>
          </body></html>`
      };

    } else if (action === 'disapprove') {
      // Remove from approved list
      await fetch(
        `https://api.netlify.com/api/v1/blobs/${SITE_ID}/zo-approved/${encodeURIComponent(email)}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${NETLIFY_TOKEN}` }
        }
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <html><body style="font-family:Arial;text-align:center;padding:60px;max-width:500px;margin:0 auto">
            <div style="font-size:60px;margin-bottom:20px">❌</div>
            <h2 style="color:#c0392b">Disapproved</h2>
            <p><strong>${name || email}</strong> has been disapproved for ZO® products.</p>
          </body></html>`
      };
    }

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `<html><body style="font-family:Arial;padding:40px"><h2>❌ Error</h2><p>${err.message}</p></body></html>`
    };
  }
};
