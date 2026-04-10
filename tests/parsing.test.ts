import { describe, it, expect } from "vitest";
import { parseCsvLine, parseCsv, wellsToCsv, productionToCsv } from "../src/lib/csv";

describe("parseCsvLine", () => {
  it("parses a simple comma-separated line", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted fields", () => {
    expect(parseCsvLine('"hello world",foo,bar')).toEqual(["hello world", "foo", "bar"]);
  });

  it("handles escaped quotes inside quoted field", () => {
    expect(parseCsvLine('"say ""hello"",test"')).toEqual(['say "hello",test']);
  });

  it("trims whitespace around values", () => {
    expect(parseCsvLine("  a  ,  b  ,  c  ")).toEqual(["a", "b", "c"]);
  });

  it("returns empty string for empty fields", () => {
    expect(parseCsvLine("a,,c")).toEqual(["a", "", "c"]);
  });

  it("handles single column", () => {
    expect(parseCsvLine("hello")).toEqual(["hello"]);
  });

  it("handles commas inside quotes", () => {
    expect(parseCsvLine('"Dallas, TX",OPERATOR')).toEqual(["Dallas, TX", "OPERATOR"]);
  });
});

describe("parseCsv", () => {
  it("parses CSV text into array of objects", () => {
    const csv = `API,Well Name,Operator
42-329-00001-0000,PIONEER WOLF 1H,Pioneer Natural Resources
42-329-00002-0000,PIONEER WOLF 2H,Pioneer Natural Resources`;

    const result = parseCsv(csv);
    expect(result).toHaveLength(2);
    expect(result[0]["API"]).toBe("42-329-00001-0000");
    expect(result[0]["Well Name"]).toBe("PIONEER WOLF 1H");
    expect(result[1]["Operator"]).toBe("Pioneer Natural Resources");
  });

  it("returns empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("returns empty array for header-only input", () => {
    expect(parseCsv("API,Name")).toEqual([]);
  });

  it("handles Windows-style CRLF line endings", () => {
    const csv = "API,Name\r\n42-001-00001-0000,Well 1\r\n42-001-00002-0000,Well 2";
    const result = parseCsv(csv);
    expect(result).toHaveLength(2);
    expect(result[0]["API"]).toBe("42-001-00001-0000");
  });

  it("skips blank lines", () => {
    const csv = "API,Name\n42-001-00001-0000,Well 1\n\n42-001-00002-0000,Well 2";
    const result = parseCsv(csv);
    expect(result).toHaveLength(2);
  });
});

describe("wellsToCsv", () => {
  it("produces correct CSV header", () => {
    const csv = wellsToCsv([]);
    expect(csv).toContain("API Number");
    expect(csv).toContain("Well Name");
    expect(csv).toContain("Operator");
    expect(csv).toContain("County");
    expect(csv).toContain("State");
    expect(csv).toContain("Status");
  });

  it("serializes a well row correctly", () => {
    const wells = [
      {
        apiNumber: "42-329-00001-0000",
        wellName: "PIONEER WOLF 1H",
        operatorName: "Pioneer Natural Resources",
        county: "MIDLAND",
        state: "TX",
        status: "PRODUCING",
        wellType: "OIL",
        spudDate: "2024-01-15",
        latitude: 31.997,
        longitude: -101.962,
      },
    ];
    const csv = wellsToCsv(wells);
    expect(csv).toContain("42-329-00001-0000");
    expect(csv).toContain("PIONEER WOLF 1H");
    expect(csv).toContain("PRODUCING");
    expect(csv).toContain("2024-01-15");
  });

  it("handles null optional fields", () => {
    const wells = [
      {
        apiNumber: "42-329-00007-0000",
        wellName: "DBE WOLF A 2H",
        operatorName: "Diamondback Energy",
        county: "MIDLAND",
        state: "TX",
        status: "PERMITTED",
        wellType: "OIL",
        spudDate: null,
        latitude: null,
        longitude: null,
      },
    ];
    const csv = wellsToCsv(wells);
    expect(csv).toContain("DBE WOLF A 2H");
    expect(csv).toContain("PERMITTED");
  });
});

describe("productionToCsv", () => {
  it("produces correct headers", () => {
    const csv = productionToCsv([]);
    expect(csv).toContain("Report Month");
    expect(csv).toContain("Oil (bbl)");
    expect(csv).toContain("Gas (mcf)");
    expect(csv).toContain("Water (bbl)");
    expect(csv).toContain("Days Produced");
  });

  it("serializes production data correctly", () => {
    const rows = [
      {
        apiNumber: "42-329-00001-0000",
        wellName: "PIONEER WOLF 1H",
        reportMonth: "2025-01-01",
        oilBbl: "48000",
        gasMcf: "57600",
        waterBbl: "24000",
        daysProduced: 28,
      },
    ];
    const csv = productionToCsv(rows);
    expect(csv).toContain("48000");
    expect(csv).toContain("57600");
    expect(csv).toContain("2025-01-01");
  });
});

describe("API number format validation", () => {
  const TX_API_PATTERN = /^42-\d{3}-\d{5}-\d{4}$/;
  const ND_API_PATTERN = /^33-\d{3}-\d{5}-\d{4}$/;

  it("validates Texas API number format", () => {
    expect("42-329-00001-0000").toMatch(TX_API_PATTERN);
    expect("42-383-00005-0000").toMatch(TX_API_PATTERN);
  });

  it("validates North Dakota API number format", () => {
    expect("33-061-00001-0000").toMatch(ND_API_PATTERN);
    expect("33-053-00004-0000").toMatch(ND_API_PATTERN);
  });

  it("rejects invalid API formats", () => {
    expect("1234567890").not.toMatch(TX_API_PATTERN);
    expect("42-329-1-0").not.toMatch(TX_API_PATTERN);
    expect("99-329-00001-0000").not.toMatch(TX_API_PATTERN);
  });
});
