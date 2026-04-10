import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDemoUserId } from "@/lib/demo-user";
import type { AlertRuleType } from "@/generated/prisma/client";

// POST /api/watchlists/:id/alert-rules — add alert rule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = getDemoUserId();

  try {
    const body = await request.json();
    const { ruleType, threshold, targetStatus } = body as {
      ruleType: AlertRuleType;
      threshold?: number;
      targetStatus?: string;
    };

    const wl = await prisma.watchlist.findFirst({
      where: { id: parseInt(id), userId },
    });
    if (!wl) {
      return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
    }

    const rule = await prisma.alertRule.create({
      data: {
        watchlistId: parseInt(id),
        ruleType,
        threshold: threshold ?? null,
        targetStatus: targetStatus ?? null,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    console.error("[POST /api/watchlists/:id/alert-rules]", err);
    return NextResponse.json({ error: "Failed to create alert rule" }, { status: 500 });
  }
}

// DELETE /api/watchlists/:id/alert-rules?ruleId=X
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = getDemoUserId();
  const ruleId = parseInt(request.nextUrl.searchParams.get("ruleId") ?? "0");

  if (!ruleId) {
    return NextResponse.json({ error: "ruleId is required" }, { status: 400 });
  }

  try {
    const wl = await prisma.watchlist.findFirst({
      where: { id: parseInt(id), userId },
    });
    if (!wl) {
      return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
    }

    await prisma.alertRule.delete({ where: { id: ruleId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/watchlists/:id/alert-rules]", err);
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}
