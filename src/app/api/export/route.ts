import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDemoUserId } from "@/lib/demo-user";
import { wellsToCsv, productionToCsv } from "@/lib/csv";
import { searchWells } from "@/lib/search";

/**
 * GET /api/export
 *
 * Query params:
 *   type=wells|production          (required)
 *   watchlistId=N                  (export watchlist wells)
 *   OR search params (q, state, county, etc.)  (export search results)
 *
 * Returns CSV file download.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") ?? "wells";
  const watchlistId = sp.has("watchlistId")
    ? parseInt(sp.get("watchlistId")!)
    : null;

  try {
    if (type === "wells") {
      let wells: Array<{
        apiNumber: string;
        wellName: string;
        operatorName: string;
        county: string;
        state: string;
        status: string;
        wellType: string;
        spudDate: string | null;
        latitude: number | null;
        longitude: number | null;
      }>;

      if (watchlistId) {
        const userId = getDemoUserId();
        const wl = await prisma.watchlist.findFirst({
          where: { id: watchlistId, userId },
          include: {
            wells: {
              include: {
                well: {
                  include: {
                    operator: { select: { name: true } },
                    county: { select: { name: true } },
                    state: { select: { code: true } },
                  },
                },
              },
            },
          },
        });

        if (!wl) {
          return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
        }

        wells = wl.wells.map((ww) => ({
          apiNumber: ww.well.apiNumber,
          wellName: ww.well.wellName,
          operatorName: ww.well.operator.name,
          county: ww.well.county.name,
          state: ww.well.state.code,
          status: ww.well.status,
          wellType: ww.well.wellType,
          spudDate: ww.well.spudDate?.toISOString().split("T")[0] ?? null,
          latitude: ww.well.latitude ? Number(ww.well.latitude) : null,
          longitude: ww.well.longitude ? Number(ww.well.longitude) : null,
        }));
      } else {
        const result = await searchWells({
          q: sp.get("q") ?? undefined,
          apiNumber: sp.get("apiNumber") ?? undefined,
          operatorName: sp.get("operatorName") ?? undefined,
          county: sp.get("county") ?? undefined,
          state: sp.get("state") ?? undefined,
          status: sp.get("status") ?? undefined,
          page: 1,
          pageSize: 1000, // max export
        });
        wells = result.wells;
      }

      const csv = wellsToCsv(wells);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="wellwire-wells-${Date.now()}.csv"`,
        },
      });
    }

    if (type === "production") {
      const wellId = sp.has("wellId") ? parseInt(sp.get("wellId")!) : null;
      if (!wellId) {
        return NextResponse.json({ error: "wellId is required for production export" }, { status: 400 });
      }

      const well = await prisma.well.findUnique({
        where: { id: wellId },
        include: {
          production: { orderBy: { reportMonth: "desc" } },
        },
      });

      if (!well) {
        return NextResponse.json({ error: "Well not found" }, { status: 404 });
      }

      const rows = well.production.map((p) => ({
        apiNumber: well.apiNumber,
        wellName: well.wellName,
        reportMonth: p.reportMonth.toISOString().split("T")[0],
        oilBbl: p.oilBbl.toString(),
        gasMcf: p.gasMcf.toString(),
        waterBbl: p.waterBbl.toString(),
        daysProduced: p.daysProduced,
      }));

      const csv = productionToCsv(rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="wellwire-production-${well.apiNumber}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("[/api/export]", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
