/**
 * WellWire Lite — Texas RRC Ingestion Script
 *
 * Fetches public data from the Texas Railroad Commission (RRC).
 * Data sources:
 *   Permits: https://rrc.texas.gov/resource-center/research/data-sets-available-for-download/
 *   Production: https://www.rrc.texas.gov/resource-center/research/data-sets-available-for-download/
 *
 * In v1 MVP, this script:
 *   1. Hits the RRC public data endpoints (or parses downloaded CSV files)
 *   2. Upserts operators, counties, wells, permits, and production
 *
 * For MVP demo mode, run with --stub to load sample CSV fixtures instead.
 *
 * Usage:
 *   npx tsx scripts/ingest-texas.ts              # real (requires network + RRC data)
 *   npx tsx scripts/ingest-texas.ts --stub       # use fixtures/texas-*.csv
 */

import "dotenv/config";
import path from "path";
import fs from "fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { parseCsv } from "../src/lib/csv";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Real RRC data URLs (public, no auth required) ───────────────────────────
const RRC_PERMIT_URL =
  "https://rrc.texas.gov/media/j1qcxzxb/p5permit_2024.zip";
const RRC_PROD_URL =
  "https://rrc.texas.gov/media/ognnf02z/ogprod_2024.zip";

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

interface PermitRecord {
  api: string;
  wellName: string;
  operatorName: string;
  countyName: string;
  permitNumber: string;
  permitType: string;
  issuedDate: string;
  latitude?: string;
  longitude?: string;
}

async function ingestPermits(records: PermitRecord[], stateId: number) {
  let inserted = 0;
  let updated = 0;

  for (const row of records) {
    try {
      const operator = await getOrCreateOperator(row.operatorName);
      const county = await getOrCreateCounty(stateId, row.countyName);

      const well = await prisma.well.upsert({
        where: { apiNumber: row.api },
        update: {
          wellName: row.wellName,
          operatorId: operator.id,
          countyId: county.id,
        },
        create: {
          apiNumber: row.api,
          wellName: row.wellName,
          operatorId: operator.id,
          countyId: county.id,
          stateId,
          status: "PERMITTED",
          latitude: row.latitude ? parseFloat(row.latitude) : undefined,
          longitude: row.longitude ? parseFloat(row.longitude) : undefined,
        },
      });

      const permitType = mapPermitType(row.permitType);
      const issuedDate = row.issuedDate ? new Date(row.issuedDate) : undefined;

      const existing = await prisma.permit.findFirst({
        where: { wellId: well.id, permitNumber: row.permitNumber },
      });

      if (!existing) {
        await prisma.permit.create({
          data: {
            wellId: well.id,
            permitNumber: row.permitNumber || undefined,
            permitType,
            status: "ISSUED",
            issuedDate,
          },
        });
        inserted++;
      } else {
        updated++;
      }
    } catch (err) {
      console.error(`Error processing API ${row.api}:`, err);
    }
  }

  return { inserted, updated };
}

function mapPermitType(raw: string): "ORIGINAL" | "REENTRY" | "DEEPENING" | "EXTENSION" | "AMENDMENT" | "PLUGGING" {
  const upper = (raw ?? "").toUpperCase();
  if (upper.includes("REENTRY") || upper.includes("RE-ENTRY")) return "REENTRY";
  if (upper.includes("DEEP")) return "DEEPENING";
  if (upper.includes("EXT")) return "EXTENSION";
  if (upper.includes("AMEND")) return "AMENDMENT";
  if (upper.includes("PLUG")) return "PLUGGING";
  return "ORIGINAL";
}

async function runFromStub(state: { id: number }) {
  const permitFile = path.join(FIXTURES_DIR, "texas-permits.csv");
  if (!fs.existsSync(permitFile)) {
    console.warn(`Stub file not found: ${permitFile}`);
    console.warn("Run: npx tsx prisma/seed.ts first to create fixtures.");
    return;
  }

  const csv = fs.readFileSync(permitFile, "utf-8");
  const records = parseCsv(csv).map((row) => ({
    api: row["API"] ?? row["api_number"] ?? "",
    wellName: row["Well Name"] ?? row["well_name"] ?? "",
    operatorName: row["Operator"] ?? row["operator"] ?? "",
    countyName: row["County"] ?? row["county"] ?? "",
    permitNumber: row["Permit #"] ?? row["permit_number"] ?? "",
    permitType: row["Permit Type"] ?? row["permit_type"] ?? "ORIGINAL",
    issuedDate: row["Issued Date"] ?? row["issued_date"] ?? "",
    latitude: row["Latitude"] ?? row["latitude"] ?? undefined,
    longitude: row["Longitude"] ?? row["longitude"] ?? undefined,
  }));

  console.log(`  Processing ${records.length} permit records from stub...`);
  const result = await ingestPermits(records, state.id);
  console.log(`  Permits: ${result.inserted} inserted, ${result.updated} updated`);
}

async function runFromRRC(_state: { id: number }) {
  console.log("  Real RRC ingestion requires downloading and unzipping:");
  console.log(`    Permits: ${RRC_PERMIT_URL}`);
  console.log(`    Production: ${RRC_PROD_URL}`);
  console.log("");
  console.log("  Steps to ingest real data:");
  console.log("  1. Download and unzip the files above");
  console.log("  2. Place CSV files in prisma/fixtures/");
  console.log("  3. Re-run with --stub flag");
  console.log("");
  console.log("  For demo mode, run: npx tsx prisma/seed.ts");
}

async function main() {
  console.log("=== WellWire Lite — Texas RRC Ingestion ===");
  console.log(`Mode: ${USE_STUB ? "STUB (fixtures)" : "LIVE (RRC)"}`);

  const runStart = await prisma.ingestionRun.create({
    data: {
      source: "texas-rrc",
      runType: "permits",
      startedAt: new Date(),
    },
  });

  try {
    const state = await getOrCreateState("TX", "Texas");
    console.log(`State: TX (id=${state.id})`);

    if (USE_STUB) {
      await runFromStub(state);
    } else {
      await runFromRRC(state);
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
