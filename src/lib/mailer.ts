import nodemailer from "nodemailer";

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email. Falls back to console.log if SMTP is not configured.
 * Configure via env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */
export async function sendMail(options: MailOptions): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;

  if (!smtpHost) {
    // Dev/demo mode: log to console
    console.log("[MAILER] Would send email:");
    console.log(`  To:      ${options.to}`);
    console.log(`  Subject: ${options.subject}`);
    console.log(`  Body:    ${options.text}`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "alerts@wellwire.app",
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

/**
 * Format alert data into a plain-text email body.
 */
export function formatAlertEmail(alerts: Array<{
  wellName: string;
  message: string;
  ruleType: string;
  triggeredAt: Date;
}>): { subject: string; text: string; html: string } {
  const count = alerts.length;
  const subject = `WellWire: ${count} new alert${count > 1 ? "s" : ""}`;

  const lines = alerts.map(
    (a) =>
      `• [${a.ruleType}] ${a.message} (${a.triggeredAt.toLocaleDateString()})`
  );

  const text = [
    "WellWire Lite — Alert Notification",
    "",
    `You have ${count} new alert${count > 1 ? "s" : ""}:`,
    "",
    ...lines,
    "",
    "Log in to WellWire to view details and manage your watchlists.",
  ].join("\n");

  const html = `
    <h2>WellWire Lite — Alert Notification</h2>
    <p>You have <strong>${count} new alert${count > 1 ? "s" : ""}</strong>:</p>
    <ul>
      ${alerts.map((a) => `<li><strong>[${a.ruleType}]</strong> ${a.message} <em>(${a.triggeredAt.toLocaleDateString()})</em></li>`).join("")}
    </ul>
    <p>Log in to WellWire to view details and manage your watchlists.</p>
  `;

  return { subject, text, html };
}
