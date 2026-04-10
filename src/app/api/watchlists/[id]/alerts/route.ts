import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDemoUserId } from "@/lib/demo-user";

// PATCH /api/watchlists/:id/alerts — mark all alerts as read
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = getDemoUserId();

  try {
    const wl = await prisma.watchlist.findFirst({
      where: { id: parseInt(id), userId },
    });
    if (!wl) {
      return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
    }

    await prisma.alert.updateMany({
      where: { watchlistId: parseInt(id), isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/watchlists/:id/alerts]", err);
    return NextResponse.json({ error: "Failed to mark alerts read" }, { status: 500 });
  }
}
