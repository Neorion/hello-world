/**
 * WellWire Lite — Alert Notification Job
 *
 * 1. Evaluates all alert rules for all watchlists
 * 2. Creates Alert records for any triggered rules
 * 3. Sends email digest to watchlist owners for new (unsent) alerts
 *
 * Designed to run as a cron job:
 *   crontab: 0 6 * * * cd /app && npx tsx scripts/send-alerts.ts
 *
 * Usage:
 *   npx tsx scripts/send-alerts.ts
 *   DRY_RUN=true npx tsx scripts/send-alerts.ts   # evaluate but don't send email
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { evaluateAlerts, markAlertsEmailSent } from "../src/lib/alerts";
import { sendMail, formatAlertEmail } from "../src/lib/mailer";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.env.DRY_RUN === "true";

async function main() {
  console.log("=== WellWire Lite — Alert Job ===");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`Time: ${new Date().toISOString()}`);

  // Step 1: Evaluate rules and create new alert records
  console.log("\n[1/3] Evaluating alert rules...");
  const evalResult = await evaluateAlerts();
  console.log(`  Created: ${evalResult.created}, Skipped: ${evalResult.skipped}`);

  if (evalResult.created === 0) {
    console.log("\nNo new alerts. Exiting.");
    await prisma.$disconnect();
    return;
  }

  // Step 2: Load unsent alerts grouped by watchlist owner
  console.log("\n[2/3] Loading unsent alerts...");
  const unsentAlerts = await prisma.alert.findMany({
    where: { emailSent: false },
    include: {
      watchlist: {
        include: { user: true },
      },
      well: { select: { wellName: true, apiNumber: true } },
    },
    orderBy: { triggeredAt: "desc" },
  });

  console.log(`  Found ${unsentAlerts.length} unsent alerts`);

  if (unsentAlerts.length === 0) {
    await prisma.$disconnect();
    return;
  }

  // Group by user email
  const byUser = new Map<
    string,
    {
      email: string;
      alerts: Array<{
        id: number;
        wellName: string;
        message: string;
        ruleType: string;
        triggeredAt: Date;
      }>;
    }
  >();

  for (const alert of unsentAlerts) {
    const email = alert.watchlist.user.email;
    if (!byUser.has(email)) {
      byUser.set(email, { email, alerts: [] });
    }
    byUser.get(email)!.alerts.push({
      id: alert.id,
      wellName: alert.well?.wellName ?? "Unknown Well",
      message: alert.message,
      ruleType: alert.ruleType,
      triggeredAt: alert.triggeredAt,
    });
  }

  // Step 3: Send emails
  console.log("\n[3/3] Sending email notifications...");
  const toEmail = process.env.ALERT_EMAIL_TO;
  const sentAlertIds: number[] = [];

  for (const [email, data] of byUser.entries()) {
    const recipientEmail = toEmail ?? email; // override in demo mode
    const { subject, text, html } = formatAlertEmail(data.alerts);

    console.log(`  → ${recipientEmail} (${data.alerts.length} alerts)`);

    if (!DRY_RUN) {
      try {
        await sendMail({ to: recipientEmail, subject, text, html });
        sentAlertIds.push(...data.alerts.map((a) => a.id));
      } catch (err) {
        console.error(`    Failed to send to ${recipientEmail}:`, err);
      }
    } else {
      console.log(`    [DRY RUN] Would send: ${subject}`);
      sentAlertIds.push(...data.alerts.map((a) => a.id));
    }
  }

  // Mark as sent
  if (sentAlertIds.length > 0) {
    await markAlertsEmailSent(sentAlertIds);
    console.log(`\n  Marked ${sentAlertIds.length} alerts as email-sent.`);
  }

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Alert job failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
