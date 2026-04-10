import { prisma } from "./prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface SearchParams {
  q?: string;           // free text: well name, operator, API#, county
  apiNumber?: string;
  operatorName?: string;
  county?: string;
  state?: string;       // TX or ND
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  wells: WellSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WellSummary {
  id: number;
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
}

export async function searchWells(params: SearchParams): Promise<SearchResult> {
  const { q, apiNumber, operatorName, county, state, status } = params;
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
  const skip = (page - 1) * pageSize;

  const where: Prisma.WellWhereInput = {};

  // Free-text query: searches API#, well name, operator name, county
  if (q && q.trim()) {
    const term = q.trim();
    where.OR = [
      { apiNumber: { contains: term, mode: "insensitive" } },
      { wellName: { contains: term, mode: "insensitive" } },
      { operator: { name: { contains: term, mode: "insensitive" } } },
      { county: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  if (apiNumber) {
    where.apiNumber = { contains: apiNumber, mode: "insensitive" };
  }
  if (operatorName) {
    where.operator = { name: { contains: operatorName, mode: "insensitive" } };
  }
  if (county) {
    where.county = { name: { contains: county, mode: "insensitive" } };
  }
  if (state) {
    where.state = { code: state.toUpperCase() };
  }
  if (status) {
    where.status = status.toUpperCase() as Prisma.EnumWellStatusFilter;
  }

  const [wells, total] = await Promise.all([
    prisma.well.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        apiNumber: true,
        wellName: true,
        status: true,
        wellType: true,
        spudDate: true,
        latitude: true,
        longitude: true,
        operator: { select: { name: true } },
        county: { select: { name: true } },
        state: { select: { code: true } },
      },
    }),
    prisma.well.count({ where }),
  ]);

  return {
    wells: wells.map((w) => ({
      id: w.id,
      apiNumber: w.apiNumber,
      wellName: w.wellName,
      operatorName: w.operator.name,
      county: w.county.name,
      state: w.state.code,
      status: w.status,
      wellType: w.wellType,
      spudDate: w.spudDate?.toISOString().split("T")[0] ?? null,
      latitude: w.latitude ? Number(w.latitude) : null,
      longitude: w.longitude ? Number(w.longitude) : null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
