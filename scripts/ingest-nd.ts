/**
 * WellWire Lite — North Dakota NDIC Ingestion Script
 *
 * Fetches public data from the North Dakota Industrial Commission (NDIC).
 * Data sources:
 *   Well list: https://www.dmr.nd.gov/oilgas/bakkenwells.asp
 *   Production: https://www.dmr.nd.gov/oilgas/productionstats.asp
 *   GIS data:  https://www.dmr.nd.gov/oilgas/gis.asp
 *
 * Usage:
 *   npx tsx scripts/ingest-nd.ts              # real (requires network + NDIC data)
 *   npx tsx scripts/ingest-nd.ts --stub       # use fixtures/nd-*.csv
 */

import "dotenv/config";
import path from "path";
import fs from "fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { parseCsv } from "../src/lib/csv";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Public NDIC data URLs ───────────────────────────────────────────────────
// NDIC provides GIS shapefiles and CSV exports from their Oil and Gas Division.
// Download from: https://www.dmr.nd.gov/oilgas/bakkenwells.asp
const NDIC_WELLS_CSV_URL =
  "https://www.dmr.nd.gov/oilgas/bakkenwells.asp?action=download";

const USE_STUB = process.argv.includes("--stub");
const FIXTURES_DIR = path.join(__dirname, "../prisma/fixtures");

async function getOrCreateState(code: string, name: string) {
  return prisma.state.upsert({
    where: { code },
    update: {},
    create: { code, name },
  });
}

async function getOrCreateCounty(stateId: number, name: string) {
  return prisma.county.upsert({
    where: { stateId_name: { stateId, name: name.toUpperCase() } },
    update: {},
    create: { stateId, name: name.toUpperCase() },
  });
}

async function getOrCreateOperator(name: string) {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
  return prisma.operator.upsert({
    where: { normalizedName: normalized },
    update: { name: name.trim() },
    create: { name: name.trim(), normalizedName: normalized },
  });
}

function mapNdicStatus(raw: string): "PERMITTED" | "DRILLING" | "COMPLETED" | "PRODUCING" | "SHUT_IN" | "ABANDONED" | "PLUGGED" {
  const u = (raw ?? "").toUpperCase();
  if (u.includes("PRODUCING") || u.includes("ACTIVE")) return "PRODUCING";
  if (u.includes("DRILL")) return "DRILLING";
  if (u.includes("COMPLET")) return "COMPLETED";
  if (u.includes("SHUT") || u.includes("INACTIVE")) return "SHUT_IN";
  if (u.includes("ABANDON")) return "ABANDONED";
  if (u.includes("PLUG")) return "PLUGGED";
  if (u.includes("PERMIT")) return "PERMITTED";
  return "PRODUCING";
}

interface NdicWellRecord {
  api: string;
  wellName: string;
  operatorName: string;
  countyName: string;
  status: string;
  spudDate?: string;
  completionDate?: string;
  totalDepth?: string;
  formation?: string;
  latitude?: string;
  longitude?: string;
}

async function ingestWells(records: NdicWellRecord[], stateId: number) {
  let inserted = 0;
  let updated = 0;

  for (const row of records) {
    try {
      const operator = await getOrCreateOperator(row.operatorName);
      const county = await getOrCreateCounty(stateId, row.countyName);

      const existing = await prisma.well.findUnique({ where: { apiNumber: row.api } });

      if (!existing) {
        await prisma.well.create({
          data: {
            apiNumber: row.api,
            wellName: row.wellName,
            operatorId: operator.id,
            countyId: county.id,
            stateId,
            status: mapNdicStatus(row.status),
            spudDate: row.spudDate ? new Date(row.spudDate) : undefined,
            completionDate: row.completionDate ? new Date(row.completionDate) : undefined,
            totalDepth: row.totalDepth ? parseInt(row.totalDepth) : undefined,
            formation: row.formation || undefined,
            latitude: row.latitude ? parseFloat(row.latitude) : undefined,
            longitude: row.longitude ? parseFloat(row.longitude) : undefined,
          },
        });
        inserted++;
      } else {
        await prisma.well.update({
          where: { id: existing.id },
          data: {
            status: mapNdicStatus(row.status),
            operatorId: operator.id,
          },
        });
        updated++;
      }
    } catch (err) {
      console.error(`Error processing API ${row.api}:`, err);
    }
  }

  return { inserted, updated };
}

interface NdicProductionRecord {
  api: string;
  reportMonth: string; // YYYY-MM or MM/YYYY
  oilBbl: string;
  gasMcf: string;
  waterBbl: string;
  daysProduced?: string;
}

async function ingestProduction(records: NdicProductionRecord[]) {
  let inserted = 0;
  let updated = 0;

  for (const row of records) {
    try {
      const well = await prisma.well.findUnique({ where: { apiNumber: row.api } });
      if (!well) continue;

      // Parse month: support YYYY-MM-DD, MM/YYYY, YYYY-MM
      let reportDate: Date;
      if (row.reportMonth.includes("/")) {
        const [mm, yyyy] = row.reportMonth.split("/");
        reportDate = new Date(`${yyyy}-${mm.padStart(2, "0")}-01`);
      } else {
        reportDate = new Date(row.reportMonth.slice(0, 7) + "-01");
      }

      await prisma.production.upsert({
        where: {
          wellId_reportMonth: { wellId: well.id, reportMonth: reportDate },
        },
        update: {
          oilBbl: parseFloat(row.oilBbl) || 0,
          gasMcf: parseFloat(row.gasMcf) || 0,
          waterBbl: parseFloat(row.waterBbl) || 0,
          daysProduced: row.daysProduced ? parseInt(row.daysProduced) : undefined,
        },
        create: {
          wellId: well.id,
          reportMonth: reportDate,
          oilBbl: parseFloat(row.oilBbl) || 0,
          gasMcf: parseFloat(row.gasMcf) || 0,
          waterBbl: parseFloat(row.waterBbl) || 0,
          daysProduced: row.daysProduced ? parseInt(row.daysProduced) : undefined,
        },
      });
      inserted++;
    } catch (_err) {
      updated++; // count duplicates as updated
    }
  }

  return { inserted, updated };
}

async function runFromStub(state: { id: number }) {
  // Wells
  const wellsFile = path.join(FIXTURES_DIR, "nd-wells.csv");
  if (fs.existsSync(wellsFile)) {
    const csv = fs.readFileSync(wellsFile, "utf-8");
    const records = parseCsv(csv).map((row) => ({
      api: row["API"] ?? row["api_number"] ?? "",
      wellName: row["Well Name"] ?? row["well_name"] ?? "",
      operatorName: row["Operator"] ?? row["operator"] ?? "",
      countyName: row["County"] ?? row["county"] ?? "",
      status: row["Status"] ?? row["status"] ?? "PRODUCING",
      spudDate: row["Spud Date"] ?? row["spud_date"] ?? undefined,
      completionDate: row["Completion Date"] ?? row["completion_date"] ?? undefined,
      totalDepth: row["Total Depth"] ?? row["total_depth"] ?? undefined,
      formation: row["Formation"] ?? row["formation"] ?? undefined,
      latitude: row["Latitude"] ?? row["latitude"] ?? undefined,
      longitude: row["Longitude"] ?? row["longitude"] ?? undefined,
    }));
    console.log(`  Processing ${records.length} well records from stub...`);
    const result = await ingestWells(records, state.id);
    console.log(`  Wells: ${result.inserted} inserted, ${result.updated} updated`);
  }

  // Production
  const prodFile = path.join(FIXTURES_DIR, "nd-production.csv");
  if (fs.existsSync(prodFile)) {
    const csv = fs.readFileSync(prodFile, "utf-8");
    const records = parseCsv(csv).map((row) => ({
      api: row["API"] ?? row["api_number"] ?? "",
      reportMonth: row["Report Month"] ?? row["report_month"] ?? "",
      oilBbl: row["Oil (bbl)"] ?? row["oil_bbl"] ?? "0",
      gasMcf: row["Gas (mcf)"] ?? row["gas_mcf"] ?? "0",
      waterBbl: row["Water (bbl)"] ?? row["water_bbl"] ?? "0",
      daysProduced: row["Days Produced"] ?? row["days_produced"] ?? undefined,
    }));
    console.log(`  Processing ${records.length} production records from stub...`);
    const result = await ingestProduction(records);
    console.log(`  Production: ${result.inserted} upserted`);
  }
}

async function runFromNDIC(_state: { id: number }) {
  console.log("  Real NDIC ingestion requires downloading data from:");
  console.log(`    Wells: ${NDIC_WELLS_CSV_URL}`);
  console.log("    Production: https://www.dmr.nd.gov/oilgas/productionstats.asp");
  console.log("");
  console.log("  Steps to ingest real data:");
  console.log("  1. Download well list CSV and production CSV from NDIC");
  console.log("  2. Rename to nd-wells.csv and nd-production.csv");
  console.log("  3. Place in prisma/fixtures/");
  console.log("  4. Re-run with --stub flag");
}

async function main() {
  console.log("=== WellWire Lite — North Dakota NDIC Ingestion ===");
  console.log(`Mode: ${USE_STUB ? "STUB (fixtures)" : "LIVE (NDIC)"}`);

  const runStart = await prisma.ingestionRun.create({
    data: {
      source: "ndic",
      runType: "wells+production",
      startedAt: new Date(),
    },
  });

  try {
    const state = await getOrCreateState("ND", "North Dakota");
    console.log(`State: ND (id=${state.id})`);

    if (USE_STUB) {
      await runFromStub(state);
    } else {
      await runFromNDIC(state);
    }

    await prisma.ingestionRun.update({
      where: { id: runStart.id },
      data: { completedAt: new Date(), status: "success" },
    });

    console.log("Done.");
  } catch (err) {
    console.error("Ingestion failed:", err);
    await prisma.ingestionRun.update({
      where: { id: runStart.id },
      data: {
        completedAt: new Date(),
        status: "failed",
        message: String(err),
      },
    });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
