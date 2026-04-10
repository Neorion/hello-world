import { NextRequest, NextResponse } from "next/server";
import { evaluateAlerts } from "@/lib/alerts";

/**
 * POST /api/alerts/check
 * Called by cron job or manually to evaluate all alert rules.
 * Protect with CRON_SECRET in production.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await evaluateAlerts();
    return NextResponse.json({
      ok: true,
      alertsCreated: result.created,
      alertsSkipped: result.skipped,
    });
  } catch (err) {
    console.error("[POST /api/alerts/check]", err);
    return NextResponse.json({ error: "Alert check failed" }, { status: 500 });
  }
}
