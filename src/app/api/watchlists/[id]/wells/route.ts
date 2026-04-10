import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDemoUserId } from "@/lib/demo-user";

// POST /api/watchlists/:id/wells — add well to watchlist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = getDemoUserId();

  try {
    const body = await request.json();
    const { wellId } = body as { wellId: number };

    if (!wellId) {
      return NextResponse.json({ error: "wellId is required" }, { status: 400 });
    }

    // Verify the watchlist belongs to demo user
    const wl = await prisma.watchlist.findFirst({
      where: { id: parseInt(id), userId },
    });
    if (!wl) {
      return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
    }

    const ww = await prisma.watchlistWell.upsert({
      where: { watchlistId_wellId: { watchlistId: parseInt(id), wellId } },
      update: {},
      create: { watchlistId: parseInt(id), wellId },
    });

    return NextResponse.json(ww, { status: 201 });
  } catch (err) {
    console.error("[POST /api/watchlists/:id/wells]", err);
    return NextResponse.json({ error: "Failed to add well" }, { status: 500 });
  }
}

// DELETE /api/watchlists/:id/wells?wellId=X — remove well from watchlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = getDemoUserId();
  const wellId = parseInt(request.nextUrl.searchParams.get("wellId") ?? "0");

  if (!wellId) {
    return NextResponse.json({ error: "wellId is required" }, { status: 400 });
  }

  try {
    const wl = await prisma.watchlist.findFirst({
      where: { id: parseInt(id), userId },
    });
    if (!wl) {
      return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
    }

    await prisma.watchlistWell.delete({
      where: { watchlistId_wellId: { watchlistId: parseInt(id), wellId } },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/watchlists/:id/wells]", err);
    return NextResponse.json({ error: "Failed to remove well" }, { status: 500 });
  }
}
