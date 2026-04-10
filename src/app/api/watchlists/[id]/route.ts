import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDemoUserId } from "@/lib/demo-user";

// GET /api/watchlists/:id — full watchlist with wells, alert rules, recent alerts
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = getDemoUserId();

  try {
    const wl = await prisma.watchlist.findFirst({
      where: { id: parseInt(id), userId },
      include: {
        alertRules: true,
        wells: {
          include: {
            well: {
              include: {
                operator: { select: { name: true } },
                county: { select: { name: true } },
                state: { select: { code: true } },
                production: { orderBy: { reportMonth: "desc" }, take: 1 },
              },
            },
          },
          orderBy: { addedAt: "desc" },
        },
        alerts: {
          orderBy: { triggeredAt: "desc" },
          take: 20,
          include: { well: { select: { wellName: true, apiNumber: true } } },
        },
      },
    });

    if (!wl) {
      return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: wl.id,
      name: wl.name,
      description: wl.description,
      createdAt: wl.createdAt.toISOString(),
      alertRules: wl.alertRules.map((r) => ({
        id: r.id,
        ruleType: r.ruleType,
        threshold: r.threshold ? Number(r.threshold) : null,
        targetStatus: r.targetStatus,
        isActive: r.isActive,
      })),
      wells: wl.wells.map((ww) => {
        const w = ww.well;
        const latestProd = w.production[0];
        return {
          id: w.id,
          apiNumber: w.apiNumber,
          wellName: w.wellName,
          operatorName: w.operator.name,
          county: w.county.name,
          state: w.state.code,
          status: w.status,
          wellType: w.wellType,
          addedAt: ww.addedAt.toISOString(),
          latestOilBbl: latestProd ? Number(latestProd.oilBbl) : null,
          latestGasMcf: latestProd ? Number(latestProd.gasMcf) : null,
          latestProdMonth: latestProd
            ? latestProd.reportMonth.toISOString().split("T")[0]
            : null,
        };
      }),
      alerts: wl.alerts.map((a) => ({
        id: a.id,
        ruleType: a.ruleType,
        message: a.message,
        isRead: a.isRead,
        triggeredAt: a.triggeredAt.toISOString(),
        wellName: a.well?.wellName ?? null,
        apiNumber: a.well?.apiNumber ?? null,
      })),
    });
  } catch (err) {
    console.error("[GET /api/watchlists/:id]", err);
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }
}

// PATCH /api/watchlists/:id — update name/description
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = getDemoUserId();

  try {
    const body = await request.json();
    const { name, description } = body as { name?: string; description?: string };

    const updated = await prisma.watchlist.updateMany({
      where: { id: parseInt(id), userId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() } : {}),
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/watchlists/:id]", err);
    return NextResponse.json({ error: "Failed to update watchlist" }, { status: 500 });
  }
}

// DELETE /api/watchlists/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = getDemoUserId();

  try {
    const deleted = await prisma.watchlist.deleteMany({
      where: { id: parseInt(id), userId },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/watchlists/:id]", err);
    return NextResponse.json({ error: "Failed to delete watchlist" }, { status: 500 });
  }
}
