let nodemailer: typeof import('nodemailer') | null = null;

try {
  nodemailer = require('nodemailer');
} catch {
  // nodemailer not installed — email disabled
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transporter: any = null;

function getTransporter(): typeof transporter {
  if (transporter) return transporter;
  if (!nodemailer) return null;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !from) return null;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter;
}

export async function sendEmail(subject: string, body: string): Promise<boolean> {
  const transport = getTransporter();
  const to = process.env.SMTP_TO;

  if (!transport || !to) return false;

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: `[PM2 Orbit] ${subject}`,
      text: body,
      html: `<p>${body}</p>`,
    });
    return true;
  } catch {
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return !!nodemailer && !!process.env.SMTP_HOST && !!process.env.SMTP_FROM && !!process.env.SMTP_TO;
}

export function resetTransporter(): void {
  transporter = null;
}
