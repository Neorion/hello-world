import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
// We mock the prisma module to test search logic without a real DB connection.
const mockFindMany = vi.fn();
const mockCount = vi.fn();

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    well: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

import { searchWells } from "../src/lib/search";

// Helper: create a mock well row matching the shape returned by Prisma
function mockWell(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    apiNumber: "42-329-00001-0000",
    wellName: "PIONEER WOLF 1H",
    status: "PRODUCING",
    wellType: "OIL",
    spudDate: new Date("2024-01-15"),
    latitude: 31.997,
    longitude: -101.962,
    operator: { name: "Pioneer Natural Resources" },
    county: { name: "MIDLAND" },
    state: { code: "TX" },
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("searchWells", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockCount.mockReset();
  });

  it("returns paginated results", async () => {
    const wells = [mockWell(), mockWell({ id: 2, apiNumber: "42-329-00002-0000" })];
    mockFindMany.mockResolvedValue(wells);
    mockCount.mockResolvedValue(2);

    const result = await searchWells({ page: 1, pageSize: 25 });

    expect(result.wells).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
    expect(result.totalPages).toBe(1);
  });

  it("calculates total pages correctly", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(75);

    const result = await searchWells({ page: 1, pageSize: 25 });
    expect(result.totalPages).toBe(3);
  });

  it("applies free-text query as OR filter", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await searchWells({ q: "pioneer" });

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.OR).toBeDefined();
    expect(callArgs.where.OR).toHaveLength(4); // api, name, operator, county
  });

  it("applies state filter", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await searchWells({ state: "TX" });

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.state).toEqual({ code: "TX" });
  });

  it("applies state filter case-insensitively", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await searchWells({ state: "tx" });

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.state).toEqual({ code: "TX" });
  });

  it("applies status filter", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await searchWells({ status: "PRODUCING" });

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.status).toBe("PRODUCING");
  });

  it("applies operator name filter", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await searchWells({ operatorName: "Pioneer" });

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.operator).toEqual({
      name: { contains: "Pioneer", mode: "insensitive" },
    });
  });

  it("clamps pageSize to max 100", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await searchWells({ pageSize: 9999 });

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.take).toBe(100);
  });

  it("clamps pageSize to min 1", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await searchWells({ pageSize: 0 });

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.take).toBe(1);
  });

  it("clamps page to min 1", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await searchWells({ page: -5 });

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.skip).toBe(0);
  });

  it("calculates correct skip for page 3, size 25", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await searchWells({ page: 3, pageSize: 25 });

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.skip).toBe(50);
  });

  it("maps well data to summary shape", async () => {
    const w = mockWell({
      latitude: "31.99700",
      longitude: "-101.96200",
    });
    mockFindMany.mockResolvedValue([w]);
    mockCount.mockResolvedValue(1);

    const result = await searchWells({});
    const well = result.wells[0];

    expect(well.apiNumber).toBe("42-329-00001-0000");
    expect(well.wellName).toBe("PIONEER WOLF 1H");
    expect(well.operatorName).toBe("Pioneer Natural Resources");
    expect(well.county).toBe("MIDLAND");
    expect(well.state).toBe("TX");
    expect(well.status).toBe("PRODUCING");
    expect(well.spudDate).toBe("2024-01-15");
    expect(typeof well.latitude).toBe("number");
  });

  it("handles null latitude/longitude", async () => {
    const w = mockWell({ latitude: null, longitude: null });
    mockFindMany.mockResolvedValue([w]);
    mockCount.mockResolvedValue(1);

    const result = await searchWells({});
    expect(result.wells[0].latitude).toBeNull();
    expect(result.wells[0].longitude).toBeNull();
  });

  it("handles null spudDate", async () => {
    const w = mockWell({ spudDate: null });
    mockFindMany.mockResolvedValue([w]);
    mockCount.mockResolvedValue(1);

    const result = await searchWells({});
    expect(result.wells[0].spudDate).toBeNull();
  });

  it("does not apply OR filter for empty query", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await searchWells({ q: "  " });

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.OR).toBeUndefined();
  });
});
