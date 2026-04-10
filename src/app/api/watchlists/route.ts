import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDemoUserId } from "@/lib/demo-user";
import { getUnreadAlertCount } from "@/lib/alerts";

// GET /api/watchlists — list all watchlists for demo user
export async function GET() {
  const userId = getDemoUserId();
  try {
    const watchlists = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        _count: { select: { wells: true, alertRules: true } },
        alertRules: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const result = await Promise.all(
      watchlists.map(async (wl) => ({
        id: wl.id,
        name: wl.name,
        description: wl.description,
        wellCount: wl._count.wells,
        alertRuleCount: wl._count.alertRules,
        unreadAlerts: await getUnreadAlertCount(wl.id),
        createdAt: wl.createdAt.toISOString(),
      }))
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/watchlists]", err);
    return NextResponse.json({ error: "Failed to fetch watchlists" }, { status: 500 });
  }
}

// POST /api/watchlists — create new watchlist
export async function POST(request: NextRequest) {
  const userId = getDemoUserId();
  try {
    const body = await request.json();
    const { name, description } = body as { name: string; description?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const watchlist = await prisma.watchlist.create({
      data: { userId, name: name.trim(), description: description?.trim() },
    });

    return NextResponse.json(watchlist, { status: 201 });
  } catch (err) {
    console.error("[POST /api/watchlists]", err);
    return NextResponse.json({ error: "Failed to create watchlist" }, { status: 500 });
  }
}
