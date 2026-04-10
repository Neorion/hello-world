import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
const mockWatchlistFindMany = vi.fn();
const mockAlertFindFirst = vi.fn();
const mockAlertCreate = vi.fn();
const mockAlertUpdateMany = vi.fn();
const mockAlertCount = vi.fn();

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    watchlist: { findMany: (...a: unknown[]) => mockWatchlistFindMany(...a) },
    alert: {
      findFirst: (...a: unknown[]) => mockAlertFindFirst(...a),
      create: (...a: unknown[]) => mockAlertCreate(...a),
      updateMany: (...a: unknown[]) => mockAlertUpdateMany(...a),
      count: (...a: unknown[]) => mockAlertCount(...a),
    },
  },
}));

import { evaluateAlerts, markAlertsEmailSent, getUnreadAlertCount } from "../src/lib/alerts";

// ─── Test Data Helpers ────────────────────────────────────────────────────────

function makeWell(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    apiNumber: "42-329-00001-0000",
    wellName: "PIONEER WOLF 1H",
    status: "PRODUCING",
    permits: [],
    production: [],
    ...overrides,
  };
}

function makeWatchlist(rules: unknown[], wells: unknown[]) {
  return {
    id: 1,
    alertRules: rules,
    wells: wells.map((w) => ({ well: w })),
  };
}

describe("evaluateAlerts — NEW_PERMIT", () => {
  beforeEach(() => {
    mockWatchlistFindMany.mockReset();
    mockAlertFindFirst.mockReset();
    mockAlertCreate.mockReset();
    mockAlertCreate.mockResolvedValue({});
  });

  it("creates alert when a permit was issued within 48h", async () => {
    const recentPermit = {
      id: 10,
      permitType: "ORIGINAL",
      issuedDate: new Date(Date.now() - 6 * 3600 * 1000), // 6 hours ago
    };
    const well = makeWell({ permits: [recentPermit] });
    const watchlist = makeWatchlist(
      [{ ruleType: "NEW_PERMIT", isActive: true }],
      [well]
    );

    mockWatchlistFindMany.mockResolvedValue([watchlist]);
    mockAlertFindFirst.mockResolvedValue(null); // no existing alert

    const result = await evaluateAlerts();
    expect(result.created).toBe(1);
    expect(mockAlertCreate).toHaveBeenCalledOnce();
    const createCall = mockAlertCreate.mock.calls[0][0].data;
    expect(createCall.ruleType).toBe("NEW_PERMIT");
    expect(createCall.wellId).toBe(well.id);
  });

  it("skips when permit is older than 48h", async () => {
    const oldPermit = {
      id: 10,
      permitType: "ORIGINAL",
      issuedDate: new Date(Date.now() - 72 * 3600 * 1000), // 3 days ago
    };
    const well = makeWell({ permits: [oldPermit] });
    const watchlist = makeWatchlist(
      [{ ruleType: "NEW_PERMIT", isActive: true }],
      [well]
    );

    mockWatchlistFindMany.mockResolvedValue([watchlist]);
    mockAlertFindFirst.mockResolvedValue(null);

    const result = await evaluateAlerts();
    expect(result.created).toBe(0);
    expect(mockAlertCreate).not.toHaveBeenCalled();
  });

  it("skips when alert already exists for same permit window", async () => {
    const recentPermit = {
      id: 10,
      permitType: "ORIGINAL",
      issuedDate: new Date(Date.now() - 3600 * 1000),
    };
    const well = makeWell({ permits: [recentPermit] });
    const watchlist = makeWatchlist(
      [{ ruleType: "NEW_PERMIT", isActive: true }],
      [well]
    );

    mockWatchlistFindMany.mockResolvedValue([watchlist]);
    mockAlertFindFirst.mockResolvedValue({ id: 999 }); // already exists

    const result = await evaluateAlerts();
    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(mockAlertCreate).not.toHaveBeenCalled();
  });
});

describe("evaluateAlerts — STATUS_CHANGE", () => {
  beforeEach(() => {
    mockWatchlistFindMany.mockReset();
    mockAlertFindFirst.mockReset();
    mockAlertCreate.mockReset();
    mockAlertCreate.mockResolvedValue({});
  });

  it("creates alert when well status matches targetStatus", async () => {
    const well = makeWell({ status: "PRODUCING" });
    const watchlist = makeWatchlist(
      [{ ruleType: "STATUS_CHANGE", isActive: true, targetStatus: "PRODUCING" }],
      [well]
    );

    mockWatchlistFindMany.mockResolvedValue([watchlist]);
    mockAlertFindFirst.mockResolvedValue(null);

    const result = await evaluateAlerts();
    expect(result.created).toBe(1);
    const data = mockAlertCreate.mock.calls[0][0].data;
    expect(data.ruleType).toBe("STATUS_CHANGE");
    expect(data.message).toContain("PRODUCING");
  });

  it("skips when well status does not match targetStatus", async () => {
    const well = makeWell({ status: "DRILLING" });
    const watchlist = makeWatchlist(
      [{ ruleType: "STATUS_CHANGE", isActive: true, targetStatus: "PRODUCING" }],
      [well]
    );

    mockWatchlistFindMany.mockResolvedValue([watchlist]);

    const result = await evaluateAlerts();
    expect(result.created).toBe(0);
    expect(mockAlertCreate).not.toHaveBeenCalled();
  });

  it("matches any status in comma-separated targetStatus", async () => {
    const well = makeWell({ status: "COMPLETED" });
    const watchlist = makeWatchlist(
      [{ ruleType: "STATUS_CHANGE", isActive: true, targetStatus: "PRODUCING,COMPLETED" }],
      [well]
    );

    mockWatchlistFindMany.mockResolvedValue([watchlist]);
    mockAlertFindFirst.mockResolvedValue(null);

    const result = await evaluateAlerts();
    expect(result.created).toBe(1);
  });
});

describe("evaluateAlerts — FIRST_PRODUCTION", () => {
  beforeEach(() => {
    mockWatchlistFindMany.mockReset();
    mockAlertFindFirst.mockReset();
    mockAlertCreate.mockReset();
    mockAlertCreate.mockResolvedValue({});
  });

  it("creates alert when well has production for the first time", async () => {
    const well = makeWell({
      production: [
        {
          reportMonth: new Date("2025-03-01"),
          oilBbl: 45000,
          gasMcf: 54000,
        },
      ],
    });
    const watchlist = makeWatchlist(
      [{ ruleType: "FIRST_PRODUCTION", isActive: true }],
      [well]
    );

    mockWatchlistFindMany.mockResolvedValue([watchlist]);
    mockAlertFindFirst.mockResolvedValue(null); // no prior first-production alert

    const result = await evaluateAlerts();
    expect(result.created).toBe(1);
    const data = mockAlertCreate.mock.calls[0][0].data;
    expect(data.ruleType).toBe("FIRST_PRODUCTION");
    expect(data.message).toContain("first production");
  });

  it("skips when well has no production data", async () => {
    const well = makeWell({ production: [] });
    const watchlist = makeWatchlist(
      [{ ruleType: "FIRST_PRODUCTION", isActive: true }],
      [well]
    );

    mockWatchlistFindMany.mockResolvedValue([watchlist]);

    const result = await evaluateAlerts();
    expect(result.created).toBe(0);
    expect(mockAlertCreate).not.toHaveBeenCalled();
  });

  it("skips if first_production alert already fired", async () => {
    const well = makeWell({
      production: [{ reportMonth: new Date("2025-03-01"), oilBbl: 45000, gasMcf: 54000 }],
    });
    const watchlist = makeWatchlist(
      [{ ruleType: "FIRST_PRODUCTION", isActive: true }],
      [well]
    );

    mockWatchlistFindMany.mockResolvedValue([watchlist]);
    mockAlertFindFirst.mockResolvedValue({ id: 88 }); // already fired

    const result = await evaluateAlerts();
    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
  });
});

describe("evaluateAlerts — PRODUCTION_THRESHOLD", () => {
  beforeEach(() => {
    mockWatchlistFindMany.mockReset();
    mockAlertFindFirst.mockReset();
    mockAlertCreate.mockReset();
    mockAlertCreate.mockResolvedValue({});
  });

  it("creates alert when oil + gas/6 exceeds threshold", async () => {
    // 48000 bbl oil + 54000/6 = 57000 BOE — exceeds 50000 threshold
    const well = makeWell({
      production: [
        {
          reportMonth: new Date("2025-03-01"),
          oilBbl: 48000,
          gasMcf: 54000,
        },
      ],
    });
    const watchlist = makeWatchlist(
      [{ ruleType: "PRODUCTION_THRESHOLD", isActive: true, threshold: 50000 }],
      [well]
    );

    mockWatchlistFindMany.mockResolvedValue([watchlist]);
    mockAlertFindFirst.mockResolvedValue(null);

    const result = await evaluateAlerts();
    expect(result.created).toBe(1);
    const data = mockAlertCreate.mock.calls[0][0].data;
    expect(data.ruleType).toBe("PRODUCTION_THRESHOLD");
    expect(data.message).toContain("exceeded threshold");
  });

  it("skips when production is below threshold", async () => {
    // 10000 bbl + 12000/6 = 12000 BOE — below 50000 threshold
    const well = makeWell({
      production: [
        {
          reportMonth: new Date("2025-03-01"),
          oilBbl: 10000,
          gasMcf: 12000,
        },
      ],
    });
    const watchlist = makeWatchlist(
      [{ ruleType: "PRODUCTION_THRESHOLD", isActive: true, threshold: 50000 }],
      [well]
    );

    mockWatchlistFindMany.mockResolvedValue([watchlist]);

    const result = await evaluateAlerts();
    expect(result.created).toBe(0);
    expect(mockAlertCreate).not.toHaveBeenCalled();
  });

  it("skips when no threshold is set", async () => {
    const well = makeWell({
      production: [
        { reportMonth: new Date("2025-03-01"), oilBbl: 100000, gasMcf: 100000 },
      ],
    });
    const watchlist = makeWatchlist(
      [{ ruleType: "PRODUCTION_THRESHOLD", isActive: true, threshold: null }],
      [well]
    );

    mockWatchlistFindMany.mockResolvedValue([watchlist]);

    const result = await evaluateAlerts();
    expect(result.created).toBe(0);
  });
});

describe("evaluateAlerts — multiple rules and wells", () => {
  it("evaluates all rules across all wells", async () => {
    mockWatchlistFindMany.mockReset();
    mockAlertFindFirst.mockReset();
    mockAlertCreate.mockReset();
    mockAlertCreate.mockResolvedValue({});
    mockAlertFindFirst.mockResolvedValue(null);

    const wells = [
      makeWell({ id: 1, production: [] }),
      makeWell({ id: 2, production: [{ reportMonth: new Date(), oilBbl: 1000, gasMcf: 1200 }] }),
    ];
    const watchlist = makeWatchlist(
      [
        { ruleType: "FIRST_PRODUCTION", isActive: true },
        { ruleType: "STATUS_CHANGE", isActive: true, targetStatus: "PRODUCING" },
      ],
      wells
    );

    mockWatchlistFindMany.mockResolvedValue([watchlist]);

    const result = await evaluateAlerts();
    // Well 1: FIRST_PRODUCTION=no, STATUS_CHANGE=yes → 1
    // Well 2: FIRST_PRODUCTION=yes, STATUS_CHANGE=yes → 2
    expect(result.created).toBe(3);
  });
});

describe("markAlertsEmailSent", () => {
  it("calls updateMany with correct args", async () => {
    mockAlertUpdateMany.mockResolvedValue({ count: 3 });
    await markAlertsEmailSent([1, 2, 3]);
    expect(mockAlertUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2, 3] } },
      data: { emailSent: true },
    });
  });

  it("does nothing for empty array", async () => {
    mockAlertUpdateMany.mockReset();
    await markAlertsEmailSent([]);
    expect(mockAlertUpdateMany).not.toHaveBeenCalled();
  });
});

describe("getUnreadAlertCount", () => {
  it("returns count of unread alerts", async () => {
    mockAlertCount.mockResolvedValue(5);
    const count = await getUnreadAlertCount(1);
    expect(count).toBe(5);
    expect(mockAlertCount).toHaveBeenCalledWith({
      where: { watchlistId: 1, isRead: false },
    });
  });
});
