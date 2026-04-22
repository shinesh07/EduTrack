const nodemailer = require('nodemailer');
const axios = require('axios');

function createTransporter() {
  if (process.env.BREVO_API_KEY) {
    // Custom transporter that uses Brevo API
    return {
      sendMail: async (mailOptions) => {
        const payload = {
          sender: { email: mailOptions.from, name: 'EduTrack' },
          to: [{ email: mailOptions.to }],
          subject: mailOptions.subject,
          htmlContent: mailOptions.html,
        };

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
          headers: { 'api-key': process.env.BREVO_API_KEY },
        });

        return { messageId: response.data.messageId || 'brevo-api-sent' };
      },
    };
  }

  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
    });
  }

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      'Email configuration is missing. Set BREVO_API_KEY or RESEND_API_KEY or EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in backend/.env.'
    );
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });
}

function getFrom() {
  if (process.env.BREVO_API_KEY) {
    return process.env.EMAIL_FROM || 'no-reply@brevo.com';
  }
  if (process.env.RESEND_API_KEY) {
    return process.env.EMAIL_FROM || 'EduTrack <onboarding@resend.dev>';
  }
  return process.env.EMAIL_FROM || `EduTrack <${process.env.EMAIL_USER}>`;
}

function baseTemplate(bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#f0f2f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f7;padding:40px 0;">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0"
    style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(10,22,40,0.08);">
    <tr>
      <td style="background:#0a1628;padding:28px 40px;text-align:center;">
        <div style="font-size:28px;margin-bottom:6px;">🎓</div>
        <h1 style="color:#f0a500;margin:0;font-size:22px;font-weight:700;">EduTrack</h1>
        <p style="color:#9fb2d9;margin:4px 0 0;font-size:12px;">Student Management System</p>
      </td>
    </tr>
    <tr><td style="padding:32px 40px;">${bodyHtml}</td></tr>
    <tr>
      <td style="background:#f8f9fa;border-top:1px solid #e8edf5;padding:16px 40px;text-align:center;">
        <p style="color:#aaa;font-size:12px;margin:0;">
          If you didn't expect this email, you can safely ignore it.
        </p>
      </td>
    </tr>
  </table>
  </td></tr></table></body></html>`;
}

function verifyButton(url) {
  return `
    <div style="text-align:center;margin:24px 0;">
      <a href="${url}" style="display:inline-block;background:#f0a500;color:#0a1628;font-weight:700;
         font-size:15px;text-decoration:none;padding:14px 36px;border-radius:10px;">
        ✓ Verify My Email
      </a>
    </div>
    <p style="color:#888;font-size:12px;margin:0 0 6px;">Or copy this link:</p>
    <p style="color:#3452a0;font-size:12px;word-break:break-all;margin:0 0 20px;">${url}</p>
    <div style="background:#fff8e6;border:1px solid #f0a500;border-radius:10px;padding:12px 16px;">
      <p style="color:#b07a00;font-size:13px;margin:0;">⚠️ This link expires in <strong>24 hours</strong>.</p>
    </div>`;
}

function resetButton(url) {
  return `
    <div style="text-align:center;margin:24px 0;">
      <a href="${url}" style="display:inline-block;background:#0a1628;color:#ffffff;font-weight:700;
         font-size:15px;text-decoration:none;padding:14px 36px;border-radius:10px;">
        Reset My Password
      </a>
    </div>
    <p style="color:#888;font-size:12px;margin:0 0 6px;">Or copy this link:</p>
    <p style="color:#3452a0;font-size:12px;word-break:break-all;margin:0 0 20px;">${url}</p>
    <div style="background:#eef3fb;border:1px solid #c9d6f0;border-radius:10px;padding:12px 16px;">
      <p style="color:#26457c;font-size:13px;margin:0;">This link expires in <strong>1 hour</strong>.</p>
    </div>`;
}

function getAppUrl(baseUrl) {
  return (process.env.CLIENT_URL || baseUrl || 'http://localhost:3000').replace(/\/$/, '');
}

// Sent when a user self-registers via signup page
async function sendVerificationEmail({ toEmail, name, token, role, baseUrl }) {
  const url = `${getAppUrl(baseUrl)}/verify-email?token=${token}`;
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  const body = `
    <p style="color:#0a1628;font-size:20px;font-weight:600;margin:0 0 8px;">Welcome, ${name}! 👋</p>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
      You registered as a <strong>${roleLabel}</strong> on EduTrack.
      Click below to verify your email and activate your account.
    </p>
    ${verifyButton(url)}`;

  await createTransporter().sendMail({
    from: getFrom(),
    to: toEmail,
    subject: '[EduTrack] Verify your email address',
    html: baseTemplate(body),
  });
}

// Sent when admin creates a teacher/student account
async function sendAdminCreatedEmail({ toEmail, name, token, role, tempPassword, baseUrl }) {
  const url = `${getAppUrl(baseUrl)}/verify-email?token=${token}`;
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  const body = `
    <p style="color:#0a1628;font-size:20px;font-weight:600;margin:0 0 8px;">Hello ${name}! 👋</p>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Your <strong>${roleLabel}</strong> account was created by the administrator.
      Verify your email to activate it and log in.
    </p>
    <div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:12px;padding:18px 22px;margin-bottom:22px;">
      <p style="color:#666;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 10px;">
        Your Login Credentials
      </p>
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="color:#888;font-size:13px;padding:3px 0;width:80px;">Email</td>
          <td style="color:#0a1628;font-size:13px;font-weight:600;">${toEmail}</td>
        </tr>
        <tr>
          <td style="color:#888;font-size:13px;padding:3px 0;">Password</td>
          <td style="color:#0a1628;font-size:13px;font-weight:600;font-family:monospace;">${tempPassword}</td>
        </tr>
      </table>
    </div>
    ${verifyButton(url)}`;

  await createTransporter().sendMail({
    from: getFrom(),
    to: toEmail,
    subject: `[EduTrack] Your ${roleLabel} account is ready`,
    html: baseTemplate(body),
  });
}

async function sendPasswordResetEmail({ toEmail, name, token, baseUrl }) {
  const url = `${getAppUrl(baseUrl)}/reset-password?token=${token}`;

  const body = `
    <p style="color:#0a1628;font-size:20px;font-weight:600;margin:0 0 8px;">Hello ${name},</p>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
      We received a request to reset your EduTrack password. Use the secure link below to choose a new one.
    </p>
    ${resetButton(url)}`;

  await createTransporter().sendMail({
    from: getFrom(),
    to: toEmail,
    subject: '[EduTrack] Reset your password',
    html: baseTemplate(body),
  });
}

module.exports = { sendVerificationEmail, sendAdminCreatedEmail, sendPasswordResetEmail };
