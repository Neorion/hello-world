import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ api: string }> }
) {
  const { api } = await params;

  try {
    const well = await prisma.well.findUnique({
      where: { apiNumber: api },
      include: {
        operator: true,
        county: true,
        state: true,
        permits: { orderBy: { issuedDate: "desc" } },
        production: { orderBy: { reportMonth: "desc" }, take: 36 },
      },
    });

    if (!well) {
      return NextResponse.json({ error: "Well not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: well.id,
      apiNumber: well.apiNumber,
      wellName: well.wellName,
      status: well.status,
      wellType: well.wellType,
      operator: {
        id: well.operator.id,
        name: well.operator.name,
        phone: well.operator.phone,
        address: well.operator.address,
      },
      county: well.county.name,
      state: well.state.code,
      latitude: well.latitude ? Number(well.latitude) : null,
      longitude: well.longitude ? Number(well.longitude) : null,
      spudDate: well.spudDate?.toISOString().split("T")[0] ?? null,
      completionDate: well.completionDate?.toISOString().split("T")[0] ?? null,
      totalDepth: well.totalDepth,
      formation: well.formation,
      section: well.section,
      township: well.township,
      range: well.range,
      permits: well.permits.map((p) => ({
        id: p.id,
        permitNumber: p.permitNumber,
        permitType: p.permitType,
        status: p.status,
        issuedDate: p.issuedDate?.toISOString().split("T")[0] ?? null,
        expiresDate: p.expiresDate?.toISOString().split("T")[0] ?? null,
        approvedDate: p.approvedDate?.toISOString().split("T")[0] ?? null,
        notes: p.notes,
      })),
      production: well.production.map((p) => ({
        reportMonth: p.reportMonth.toISOString().split("T")[0],
        oilBbl: Number(p.oilBbl),
        gasMcf: Number(p.gasMcf),
        waterBbl: Number(p.waterBbl),
        daysProduced: p.daysProduced,
      })),
    });
  } catch (err) {
    console.error("[/api/wells/:api]", err);
    return NextResponse.json({ error: "Failed to fetch well" }, { status: 500 });
  }
}
