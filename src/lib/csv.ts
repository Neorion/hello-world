import { stringify } from "csv-stringify/sync";

export interface WellRow {
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

export interface ProductionRow {
  apiNumber: string;
  wellName: string;
  reportMonth: string;
  oilBbl: string;
  gasMcf: string;
  waterBbl: string;
  daysProduced: number | null;
}

export function wellsToCsv(wells: WellRow[]): string {
  return stringify(wells, {
    header: true,
    columns: [
      { key: "apiNumber", header: "API Number" },
      { key: "wellName", header: "Well Name" },
      { key: "operatorName", header: "Operator" },
      { key: "county", header: "County" },
      { key: "state", header: "State" },
      { key: "status", header: "Status" },
      { key: "wellType", header: "Well Type" },
      { key: "spudDate", header: "Spud Date" },
      { key: "latitude", header: "Latitude" },
      { key: "longitude", header: "Longitude" },
    ],
  });
}

export function productionToCsv(rows: ProductionRow[]): string {
  return stringify(rows, {
    header: true,
    columns: [
      { key: "apiNumber", header: "API Number" },
      { key: "wellName", header: "Well Name" },
      { key: "reportMonth", header: "Report Month" },
      { key: "oilBbl", header: "Oil (bbl)" },
      { key: "gasMcf", header: "Gas (mcf)" },
      { key: "waterBbl", header: "Water (bbl)" },
      { key: "daysProduced", header: "Days Produced" },
    ],
  });
}

/**
 * Parse a simple CSV string into an array of objects.
 * Used by ingestion scripts.
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse CSV text into array of record objects using first row as headers.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = values[i] ?? "";
    });
    return record;
  });
}
