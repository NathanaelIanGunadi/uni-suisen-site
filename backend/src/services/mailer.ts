import nodemailer, { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function ensureTransport(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT
    ? Number(process.env.SMTP_PORT)
    : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port) {
    console.warn("[mailer] SMTP not configured — emails will be skipped.");
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: Boolean(process.env.SMTP_SECURE === "true"),
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter;
}

export type MailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
};

export async function sendMail(input: MailInput): Promise<void> {
  const tx = ensureTransport();
  if (!tx) return; // no-op if not configured

  const from = input.from || process.env.EMAIL_FROM || "noreply@example.com";

  try {
    await tx.sendMail({ from, ...input });
  } catch (err) {
    console.error("[mailer] sendMail error:", err);
  }
}
