const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'shop@essentialslondon.com';
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const BASE_URL = process.env.URL || 'https://your-site.netlify.app';

  // Build approve/disapprove URLs
  const approveUrl = `${BASE_URL}/.netlify/functions/approve?email=${encodeURIComponent(data.email)}&action=approve&name=${encodeURIComponent(data.firstName + ' ' + data.lastName)}`;
  const disapproveUrl = `${BASE_URL}/.netlify/functions/approve?email=${encodeURIComponent(data.email)}&action=disapprove&name=${encodeURIComponent(data.firstName + ' ' + data.lastName)}`;

  // Check if any screening question is YES
  const screeningYes = [];
  const s = data.screening;
  if (s.accutane === 'Yes') screeningYes.push('Used Accutane/retinoid in last 3 months');
  if (s.retinol === 'Yes') screeningYes.push('Used retinol in past week');
  if (s.aspirin === 'Yes') screeningYes.push('Allergic/sensitive to aspirin');
  if (s.chemo === 'Yes') screeningYes.push('Currently undergoing radiation/chemotherapy');
  if (s.herpes === 'Yes') screeningYes.push('Has herpes or cold sores');
  if (s.waxing === 'Yes') screeningYes.push('Had facial waxing/electrolysis in last week');
  if (s.autoimmune === 'Yes') screeningYes.push('Has autoimmune condition');

  const allergyYes = Object.entries(s.allergies).filter(([,v]) => v === 'Yes').map(([k]) => k);
  const procedureYes = Object.entries(s.procedures).filter(([,v]) => v === 'Yes').map(([k]) => k);

  const hasFlags = screeningYes.length > 0 || allergyYes.length > 0 || procedureYes.length > 0;

  // Build email HTML
  const flagBanner = hasFlags
    ? `<div style="background:#fff3cd;border:1px solid #ffc107;padding:14px;margin-bottom:20px;border-radius:4px;">
        <strong>⚠️ FLAGS DETECTED — Please review carefully before approving</strong>
        <ul style="margin:8px 0 0 16px">
          ${screeningYes.map(f => `<li>${f}</li>`).join('')}
          ${allergyYes.length ? `<li>Ingredient allergies: ${allergyYes.join(', ')}</li>` : ''}
          ${procedureYes.length ? `<li>Recent procedures: ${procedureYes.join(', ')}</li>` : ''}
        </ul>
      </div>`
    : `<div style="background:#d4edda;border:1px solid #28a745;padding:14px;margin-bottom:20px;border-radius:4px;">
        <strong>✅ No screening flags — All questions answered No</strong>
      </div>`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:20px;color:#333">

  <div style="text-align:center;padding:20px 0;border-bottom:2px solid #000;margin-bottom:25px">
    <h1 style="font-size:22px;letter-spacing:2px;text-transform:uppercase;margin:0">ZO® Consultation Form</h1>
    <p style="color:#777;font-size:13px;margin:4px 0 0">New application received — Essentials London</p>
  </div>

  ${flagBanner}

  <!-- Approve / Disapprove Buttons -->
  <div style="text-align:center;margin:25px 0">
    <a href="${approveUrl}" style="display:inline-block;background:#000;color:#fff;padding:14px 35px;text-decoration:none;font-weight:bold;font-size:15px;letter-spacing:1px;margin-right:12px">✅ APPROVE</a>
    <a href="${disapproveUrl}" style="display:inline-block;background:#c0392b;color:#fff;padding:14px 35px;text-decoration:none;font-weight:bold;font-size:15px;letter-spacing:1px">❌ DISAPPROVE</a>
  </div>

  <hr style="border:none;border-top:1px solid #eee;margin:25px 0"/>

  <!-- Personal Details -->
  <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #eee;padding-bottom:8px">Personal Details</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <tr><td style="padding:7px 0;color:#777;width:40%">Full Name</td><td><strong>${data.firstName} ${data.lastName}</strong></td></tr>
    <tr style="background:#f9f9f9"><td style="padding:7px 0;color:#777">Date of Birth</td><td>${data.dob}</td></tr>
    <tr><td style="padding:7px 0;color:#777">Email</td><td>${data.email}</td></tr>
    <tr style="background:#f9f9f9"><td style="padding:7px 0;color:#777">Address</td><td>${data.address}</td></tr>
  </table>

  <!-- Medical Info -->
  <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #eee;padding-bottom:8px">Medical & Skin Information</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <tr><td style="padding:7px 0;color:#777;width:40%">Medical Conditions</td><td>${data.medicalConditions}</td></tr>
    <tr style="background:#f9f9f9"><td style="padding:7px 0;color:#777">Allergies</td><td>${data.allergies}</td></tr>
    <tr><td style="padding:7px 0;color:#777">Pregnant/Breastfeeding</td><td>${data.pregnant}</td></tr>
    <tr style="background:#f9f9f9"><td style="padding:7px 0;color:#777">Current Products</td><td>${data.currentProducts}</td></tr>
    <tr><td style="padding:7px 0;color:#777">Skin Sensitivity</td><td>${data.skinSensitivity}</td></tr>
    <tr style="background:#f9f9f9"><td style="padding:7px 0;color:#777">Used ZO Before</td><td>${data.usedZO}</td></tr>
    <tr><td style="padding:7px 0;color:#777">Skincare Goals</td><td>${data.skincareGoals}</td></tr>
  </table>

  <!-- Screening -->
  <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #eee;padding-bottom:8px">Screening Questions</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <tr><td style="padding:7px 0;color:#777;width:70%">Used Accutane/retinoid in last 3 months</td><td><strong style="color:${s.accutane==='Yes'?'red':'green'}">${s.accutane}</strong></td></tr>
    <tr style="background:#f9f9f9"><td style="padding:7px 0;color:#777">Used retinol in past week</td><td><strong style="color:${s.retinol==='Yes'?'red':'green'}">${s.retinol}</strong></td></tr>
    <tr><td style="padding:7px 0;color:#777">Allergic to aspirin</td><td><strong style="color:${s.aspirin==='Yes'?'red':'green'}">${s.aspirin}</strong></td></tr>
    <tr style="background:#f9f9f9"><td style="padding:7px 0;color:#777">Undergoing radiation/chemo</td><td><strong style="color:${s.chemo==='Yes'?'red':'green'}">${s.chemo}</strong></td></tr>
    <tr><td style="padding:7px 0;color:#777">Has herpes/cold sores</td><td><strong style="color:${s.herpes==='Yes'?'red':'green'}">${s.herpes}</strong></td></tr>
    <tr style="background:#f9f9f9"><td style="padding:7px 0;color:#777">Facial waxing/electrolysis in last week</td><td><strong style="color:${s.waxing==='Yes'?'red':'green'}">${s.waxing}</strong></td></tr>
    <tr><td style="padding:7px 0;color:#777">Has autoimmune condition</td><td><strong style="color:${s.autoimmune==='Yes'?'red':'green'}">${s.autoimmune}</strong></td></tr>
  </table>

  <!-- Ingredient Allergies -->
  <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #eee;padding-bottom:8px">Ingredient Allergies</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    ${Object.entries(s.allergies).map(([k,v],i) => `<tr ${i%2?'style="background:#f9f9f9"':''}><td style="padding:7px 0;color:#777;width:70%">${k}</td><td><strong style="color:${v==='Yes'?'red':'green'}">${v}</strong></td></tr>`).join('')}
  </table>

  <!-- Procedures -->
  <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #eee;padding-bottom:8px">Recent Procedures</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    ${Object.entries(s.procedures).map(([k,v],i) => `<tr ${i%2?'style="background:#f9f9f9"':''}><td style="padding:7px 0;color:#777;width:70%">${k}</td><td><strong style="color:${v==='Yes'?'red':'green'}">${v}</strong></td></tr>`).join('')}
  </table>

  <!-- Photo -->
  <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #eee;padding-bottom:8px">Photo</h2>
  <div style="margin:15px 0 25px">
    <img src="${data.photo}" style="max-width:220px;border:1px solid #ddd;" alt="Customer Photo"/>
  </div>

  <!-- Approve/Disapprove again at bottom -->
  <div style="text-align:center;margin:20px 0 10px">
    <a href="${approveUrl}" style="display:inline-block;background:#000;color:#fff;padding:14px 35px;text-decoration:none;font-weight:bold;font-size:15px;letter-spacing:1px;margin-right:12px">✅ APPROVE</a>
    <a href="${disapproveUrl}" style="display:inline-block;background:#c0392b;color:#fff;padding:14px 35px;text-decoration:none;font-weight:bold;font-size:15px;letter-spacing:1px">❌ DISAPPROVE</a>
  </div>

  <p style="text-align:center;font-size:11px;color:#aaa;margin-top:20px">Essentials London — ZO® Approval System</p>
</body>
</html>`;

  // Send email
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  try {
    await transporter.sendMail({
      from: `"ZO Approval System" <${SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject: `🆕 ZO Form Submission — ${data.firstName} ${data.lastName}${hasFlags ? ' ⚠️ FLAGS' : ''}`,
      html: emailHtml
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('Email error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Email failed' }) };
  }
};
