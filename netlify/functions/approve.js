const nodemailer = require('nodemailer');

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
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'shop@essentialslondon.com';

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  try {
    if (action === 'approve') {
      // Save to Netlify Blobs
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

      // Send approval email to customer
      await transporter.sendMail({
        from: `"Essentials London" <${SMTP_USER}>`,
        to: email,
        subject: 'Your ZO® Consultation Has Been Approved',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;color:#333">
            <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:20px;margin-bottom:30px">
              <h1 style="font-size:20px;letter-spacing:2px;text-transform:uppercase">Essentials London</h1>
            </div>
            <div style="text-align:center;margin-bottom:30px">
              <div style="font-size:50px">✅</div>
              <h2 style="font-size:22px;margin:15px 0">You're Approved!</h2>
              <p style="color:#555;font-size:15px">Dear <strong>${name || email}</strong>,</p>
              <p style="color:#555;font-size:15px">Your ZO® Skin Health consultation form has been reviewed and approved by our team.</p>
              <p style="color:#555;font-size:15px">You can now browse and purchase ZO® products on our website.</p>
            </div>
            <div style="text-align:center;margin:30px 0">
              <a href="https://essentialslondon.com/collections/zo-skin-health" 
                 style="display:inline-block;background:#000;color:#fff;padding:15px 40px;text-decoration:none;font-weight:600;letter-spacing:1px;text-transform:uppercase;font-size:14px;">
                Shop ZO® Products
              </a>
            </div>
            <p style="color:#777;font-size:12px;text-align:center;margin-top:30px;border-top:1px solid #eee;padding-top:20px">
              Essentials London | shop@essentialslondon.com
            </p>
          </div>
        `
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <html><body style="font-family:Arial;text-align:center;padding:60px;max-width:500px;margin:0 auto">
            <div style="font-size:60px;margin-bottom:20px">✅</div>
            <h2 style="color:#000">Approved!</h2>
            <p><strong>${name || email}</strong> has been approved for ZO® products.</p>
            <p style="color:#777;font-size:13px">Approval email has been sent to <strong>${email}</strong>.<br/>They can now purchase ZO® products on essentialslondon.com.</p>
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

      // Send rejection email to customer
      await transporter.sendMail({
        from: `"Essentials London" <${SMTP_USER}>`,
        to: email,
        subject: 'Update on Your ZO® Consultation',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;color:#333">
            <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:20px;margin-bottom:30px">
              <h1 style="font-size:20px;letter-spacing:2px;text-transform:uppercase">Essentials London</h1>
            </div>
            <div style="margin-bottom:30px">
              <h2 style="font-size:20px;margin:15px 0">Update on Your ZO® Consultation</h2>
              <p style="color:#555;font-size:15px">Dear <strong>${name || email}</strong>,</p>
              <p style="color:#555;font-size:15px">Thank you for submitting your ZO® Skin Health consultation form. After reviewing your information, we are unable to approve your application at this time.</p>
              <p style="color:#555;font-size:15px">If you have any questions or would like further information, please do not hesitate to contact us.</p>
            </div>
            <div style="text-align:center;margin:30px 0">
              <a href="mailto:shop@essentialslondon.com" 
                 style="display:inline-block;background:#000;color:#fff;padding:15px 40px;text-decoration:none;font-weight:600;letter-spacing:1px;text-transform:uppercase;font-size:14px;">
                Contact Us
              </a>
            </div>
            <p style="color:#777;font-size:12px;text-align:center;margin-top:30px;border-top:1px solid #eee;padding-top:20px">
              Essentials London | shop@essentialslondon.com
            </p>
          </div>
        `
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <html><body style="font-family:Arial;text-align:center;padding:60px;max-width:500px;margin:0 auto">
            <div style="font-size:60px;margin-bottom:20px">❌</div>
            <h2 style="color:#c0392b">Disapproved</h2>
            <p><strong>${name || email}</strong> has been disapproved.</p>
            <p style="color:#777;font-size:13px">Rejection email has been sent to <strong>${email}</strong>.</p>
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
