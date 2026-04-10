/**
 * WellWire Lite — Database Seed
 *
 * Populates the database with realistic demo data:
 * - 2 states (TX, ND)
 * - 8 counties
 * - 8 operators
 * - 50 wells (30 TX, 20 ND)
 * - Permits and production history
 * - 1 demo user with 2 watchlists and alert rules
 * - Sample triggered alerts
 *
 * Run: npx tsx prisma/seed.ts
 *      npx prisma migrate dev (includes seed via package.json script)
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Helpers to generate realistic API numbers
function txApiNumber(county: number, seq: number) {
  return `42-${String(county).padStart(3, "0")}-${String(seq).padStart(5, "0")}-0000`;
}
function ndApiNumber(county: number, seq: number) {
  return `33-${String(county).padStart(3, "0")}-${String(seq).padStart(5, "0")}-0000`;
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// Production profile: high early, declining curve
function oilProfile(month: number, peak: number): number {
  if (month === 0) return peak;
  const decline = Math.pow(0.85, month);
  return Math.round(peak * decline * (0.9 + Math.random() * 0.2));
}

async function main() {
  console.log("Seeding WellWire Lite database...");

  // ─── States ───────────────────────────────────────────────────────────────
  const tx = await prisma.state.upsert({
    where: { code: "TX" },
    update: {},
    create: { code: "TX", name: "Texas" },
  });
  const nd = await prisma.state.upsert({
    where: { code: "ND" },
    update: {},
    create: { code: "ND", name: "North Dakota" },
  });

  console.log("  States seeded");

  // ─── Counties ─────────────────────────────────────────────────────────────
  const txCounties = await Promise.all([
    prisma.county.upsert({ where: { stateId_name: { stateId: tx.id, name: "MIDLAND" } }, update: {}, create: { stateId: tx.id, name: "MIDLAND", fipsCode: "48329" } }),
    prisma.county.upsert({ where: { stateId_name: { stateId: tx.id, name: "REEVES" } }, update: {}, create: { stateId: tx.id, name: "REEVES", fipsCode: "48383" } }),
    prisma.county.upsert({ where: { stateId_name: { stateId: tx.id, name: "KARNES" } }, update: {}, create: { stateId: tx.id, name: "KARNES", fipsCode: "48255" } }),
    prisma.county.upsert({ where: { stateId_name: { stateId: tx.id, name: "DEWITT" } }, update: {}, create: { stateId: tx.id, name: "DEWITT", fipsCode: "48123" } }),
  ]);
  const ndCounties = await Promise.all([
    prisma.county.upsert({ where: { stateId_name: { stateId: nd.id, name: "MOUNTRAIL" } }, update: {}, create: { stateId: nd.id, name: "MOUNTRAIL", fipsCode: "38061" } }),
    prisma.county.upsert({ where: { stateId_name: { stateId: nd.id, name: "MCKENZIE" } }, update: {}, create: { stateId: nd.id, name: "MCKENZIE", fipsCode: "38053" } }),
    prisma.county.upsert({ where: { stateId_name: { stateId: nd.id, name: "WILLIAMS" } }, update: {}, create: { stateId: nd.id, name: "WILLIAMS", fipsCode: "38105" } }),
    prisma.county.upsert({ where: { stateId_name: { stateId: nd.id, name: "DUNN" } }, update: {}, create: { stateId: nd.id, name: "DUNN", fipsCode: "38025" } }),
  ]);

  console.log("  Counties seeded");

  // ─── Operators ────────────────────────────────────────────────────────────
  const operators = await Promise.all([
    prisma.operator.upsert({ where: { normalizedName: "pioneer natural resources" }, update: {}, create: { name: "Pioneer Natural Resources", normalizedName: "pioneer natural resources", phone: "432-683-4768", address: "5205 N O'Connor Blvd, Irving, TX 75039" } }),
    prisma.operator.upsert({ where: { normalizedName: "diamondback energy" }, update: {}, create: { name: "Diamondback Energy", normalizedName: "diamondback energy", phone: "432-221-7400", address: "500 West Texas Ave, Midland, TX 79701" } }),
    prisma.operator.upsert({ where: { normalizedName: "coterra energy" }, update: {}, create: { name: "Coterra Energy", normalizedName: "coterra energy", phone: "713-496-3200", address: "840 Gessner, Suite 1400, Houston, TX 77024" } }),
    prisma.operator.upsert({ where: { normalizedName: "eog resources" }, update: {}, create: { name: "EOG Resources", normalizedName: "eog resources", phone: "713-651-7000", address: "1111 Bagby, Sky Lobby 2, Houston, TX 77002" } }),
    prisma.operator.upsert({ where: { normalizedName: "continental resources" }, update: {}, create: { name: "Continental Resources", normalizedName: "continental resources", phone: "405-234-9000", address: "9 E 9th St, Oklahoma City, OK 73104" } }),
    prisma.operator.upsert({ where: { normalizedName: "whiting petroleum" }, update: {}, create: { name: "Whiting Petroleum", normalizedName: "whiting petroleum", phone: "303-837-1661", address: "1700 Lincoln St, Suite 4700, Denver, CO 80203" } }),
    prisma.operator.upsert({ where: { normalizedName: "oasis petroleum" }, update: {}, create: { name: "Oasis Petroleum", normalizedName: "oasis petroleum", phone: "281-404-9500", address: "1001 Fannin Street, Suite 1500, Houston, TX 77002" } }),
    prisma.operator.upsert({ where: { normalizedName: "sm energy" }, update: {}, create: { name: "SM Energy", normalizedName: "sm energy", phone: "303-861-8140", address: "1775 Sherman Street, Suite 1200, Denver, CO 80203" } }),
  ]);

  console.log("  Operators seeded");

  // ─── Texas Wells ──────────────────────────────────────────────────────────
  const txWellDefs = [
    // Midland Basin (Permian)
    { api: txApiNumber(329, 1), name: "PIONEER WOLF 1H", op: 0, county: txCounties[0], lat: 31.997, lon: -101.962, status: "PRODUCING", spud: monthsAgo(24), completion: monthsAgo(22), depth: 10850, form: "Wolfcamp A" },
    { api: txApiNumber(329, 2), name: "PIONEER WOLF 2H", op: 0, county: txCounties[0], lat: 31.998, lon: -101.965, status: "PRODUCING", spud: monthsAgo(22), completion: monthsAgo(20), depth: 10920, form: "Wolfcamp A" },
    { api: txApiNumber(329, 3), name: "PIONEER WOLF 3H", op: 0, county: txCounties[0], lat: 32.001, lon: -101.971, status: "PRODUCING", spud: monthsAgo(18), completion: monthsAgo(16), depth: 11050, form: "Wolfcamp B" },
    { api: txApiNumber(329, 4), name: "DBE SPRB 1H", op: 1, county: txCounties[0], lat: 31.985, lon: -101.988, status: "PRODUCING", spud: monthsAgo(30), completion: monthsAgo(28), depth: 10200, form: "Spraberry" },
    { api: txApiNumber(329, 5), name: "DBE SPRB 2H", op: 1, county: txCounties[0], lat: 31.986, lon: -101.990, status: "PRODUCING", spud: monthsAgo(28), completion: monthsAgo(26), depth: 10300, form: "Spraberry" },
    { api: txApiNumber(329, 6), name: "DBE WOLF A 1H", op: 1, county: txCounties[0], lat: 32.010, lon: -101.943, status: "DRILLING", spud: daysAgo(45), depth: null, form: "Wolfcamp A" },
    { api: txApiNumber(329, 7), name: "DBE WOLF A 2H", op: 1, county: txCounties[0], lat: 32.011, lon: -101.945, status: "PERMITTED", spud: null, depth: null, form: null },
    { api: txApiNumber(329, 8), name: "COTERRA PERM 1H", op: 2, county: txCounties[0], lat: 32.020, lon: -101.920, status: "PRODUCING", spud: monthsAgo(36), completion: monthsAgo(34), depth: 9800, form: "Wolfcamp A" },

    // Reeves County (Delaware Basin)
    { api: txApiNumber(383, 1), name: "COTERRA DEL 1H", op: 2, county: txCounties[1], lat: 31.430, lon: -103.701, status: "PRODUCING", spud: monthsAgo(20), completion: monthsAgo(18), depth: 13200, form: "Bone Spring" },
    { api: txApiNumber(383, 2), name: "COTERRA DEL 2H", op: 2, county: txCounties[1], lat: 31.432, lon: -103.705, status: "PRODUCING", spud: monthsAgo(18), completion: monthsAgo(16), depth: 13400, form: "Bone Spring" },
    { api: txApiNumber(383, 3), name: "EOG BONES 1H", op: 3, county: txCounties[1], lat: 31.445, lon: -103.680, status: "PRODUCING", spud: monthsAgo(15), completion: monthsAgo(13), depth: 13100, form: "2nd Bone Spring" },
    { api: txApiNumber(383, 4), name: "EOG BONES 2H", op: 3, county: txCounties[1], lat: 31.448, lon: -103.683, status: "PRODUCING", spud: monthsAgo(12), completion: monthsAgo(10), depth: 13250, form: "3rd Bone Spring" },
    { api: txApiNumber(383, 5), name: "EOG WBUFF 1H", op: 3, county: txCounties[1], lat: 31.460, lon: -103.710, status: "COMPLETED", spud: monthsAgo(6), completion: monthsAgo(3), depth: 14100, form: "Wolfcamp" },
    { api: txApiNumber(383, 6), name: "PIONEER DEL 1H", op: 0, county: txCounties[1], lat: 31.412, lon: -103.695, status: "DRILLING", spud: daysAgo(30), depth: null, form: null },
    { api: txApiNumber(383, 7), name: "PIONEER DEL 2H", op: 0, county: txCounties[1], lat: 31.414, lon: -103.698, status: "PERMITTED", spud: null, depth: null, form: null },

    // Karnes County (Eagle Ford)
    { api: txApiNumber(255, 1), name: "EOG EF 1H", op: 3, county: txCounties[2], lat: 28.910, lon: -97.901, status: "PRODUCING", spud: monthsAgo(40), completion: monthsAgo(38), depth: 11200, form: "Eagle Ford" },
    { api: txApiNumber(255, 2), name: "EOG EF 2H", op: 3, county: txCounties[2], lat: 28.912, lon: -97.904, status: "PRODUCING", spud: monthsAgo(38), completion: monthsAgo(36), depth: 11350, form: "Eagle Ford" },
    { api: txApiNumber(255, 3), name: "EOG EF 3H", op: 3, county: txCounties[2], lat: 28.915, lon: -97.908, status: "PRODUCING", spud: monthsAgo(35), completion: monthsAgo(33), depth: 11400, form: "Eagle Ford" },
    { api: txApiNumber(255, 4), name: "SM EF 1H", op: 7, county: txCounties[2], lat: 28.925, lon: -97.880, status: "PRODUCING", spud: monthsAgo(30), completion: monthsAgo(28), depth: 11100, form: "Eagle Ford" },
    { api: txApiNumber(255, 5), name: "SM EF 2H", op: 7, county: txCounties[2], lat: 28.928, lon: -97.883, status: "PRODUCING", spud: monthsAgo(25), completion: monthsAgo(23), depth: 11250, form: "Eagle Ford" },
    { api: txApiNumber(255, 6), name: "SM EF 3H", op: 7, county: txCounties[2], lat: 28.930, lon: -97.886, status: "SHUT_IN", spud: monthsAgo(20), completion: monthsAgo(18), depth: 11300, form: "Eagle Ford" },

    // DeWitt County (Eagle Ford)
    { api: txApiNumber(123, 1), name: "EOG DEWITT 1H", op: 3, county: txCounties[3], lat: 29.065, lon: -97.358, status: "PRODUCING", spud: monthsAgo(45), completion: monthsAgo(43), depth: 10900, form: "Eagle Ford" },
    { api: txApiNumber(123, 2), name: "EOG DEWITT 2H", op: 3, county: txCounties[3], lat: 29.068, lon: -97.361, status: "PRODUCING", spud: monthsAgo(42), completion: monthsAgo(40), depth: 11000, form: "Eagle Ford" },
    { api: txApiNumber(123, 3), name: "COTERRA EF 1H", op: 2, county: txCounties[3], lat: 29.070, lon: -97.370, status: "PRODUCING", spud: monthsAgo(48), completion: monthsAgo(46), depth: 10800, form: "Eagle Ford" },
    { api: txApiNumber(123, 4), name: "COTERRA EF 2H", op: 2, county: txCounties[3], lat: 29.072, lon: -97.373, status: "ABANDONED", spud: monthsAgo(60), completion: monthsAgo(58), depth: 10500, form: "Eagle Ford" },
  ];

  const ndWellDefs = [
    // Mountrail County (Bakken)
    { api: ndApiNumber(61, 1), name: "CONTINENTAL BAKK 1H", op: 4, county: ndCounties[0], lat: 48.220, lon: -102.504, status: "PRODUCING", spud: monthsAgo(36), completion: monthsAgo(34), depth: 11800, form: "Bakken" },
    { api: ndApiNumber(61, 2), name: "CONTINENTAL BAKK 2H", op: 4, county: ndCounties[0], lat: 48.222, lon: -102.508, status: "PRODUCING", spud: monthsAgo(33), completion: monthsAgo(31), depth: 11900, form: "Bakken" },
    { api: ndApiNumber(61, 3), name: "CONTINENTAL THREE FORKS 1H", op: 4, county: ndCounties[0], lat: 48.225, lon: -102.512, status: "PRODUCING", spud: monthsAgo(30), completion: monthsAgo(28), depth: 12100, form: "Three Forks" },
    { api: ndApiNumber(61, 4), name: "WHITING BAKK 1H", op: 5, county: ndCounties[0], lat: 48.231, lon: -102.520, status: "PRODUCING", spud: monthsAgo(48), completion: monthsAgo(46), depth: 11700, form: "Bakken" },
    { api: ndApiNumber(61, 5), name: "WHITING BAKK 2H", op: 5, county: ndCounties[0], lat: 48.233, lon: -102.524, status: "SHUT_IN", spud: monthsAgo(42), completion: monthsAgo(40), depth: 11750, form: "Bakken" },

    // McKenzie County (Bakken)
    { api: ndApiNumber(53, 1), name: "WHITING MCK 1H", op: 5, county: ndCounties[1], lat: 47.745, lon: -103.425, status: "PRODUCING", spud: monthsAgo(24), completion: monthsAgo(22), depth: 11600, form: "Bakken" },
    { api: ndApiNumber(53, 2), name: "CONTINENTAL MCK 1H", op: 4, county: ndCounties[1], lat: 47.748, lon: -103.430, status: "PRODUCING", spud: monthsAgo(21), completion: monthsAgo(19), depth: 11650, form: "Bakken" },
    { api: ndApiNumber(53, 3), name: "OASIS MCK 1H", op: 6, county: ndCounties[1], lat: 47.752, lon: -103.438, status: "PRODUCING", spud: monthsAgo(18), completion: monthsAgo(16), depth: 11500, form: "Bakken" },
    { api: ndApiNumber(53, 4), name: "OASIS MCK 2H", op: 6, county: ndCounties[1], lat: 47.755, lon: -103.442, status: "PRODUCING", spud: monthsAgo(15), completion: monthsAgo(13), depth: 11550, form: "Three Forks" },
    { api: ndApiNumber(53, 5), name: "OASIS MCK 3H", op: 6, county: ndCounties[1], lat: 47.758, lon: -103.445, status: "DRILLING", spud: daysAgo(60), depth: null, form: null },
    { api: ndApiNumber(53, 6), name: "CONTINENTAL TF 1H", op: 4, county: ndCounties[1], lat: 47.762, lon: -103.450, status: "PERMITTED", spud: null, depth: null, form: null },

    // Williams County (Bakken)
    { api: ndApiNumber(105, 1), name: "WHITING WILL 1H", op: 5, county: ndCounties[2], lat: 48.170, lon: -103.621, status: "PRODUCING", spud: monthsAgo(40), completion: monthsAgo(38), depth: 11400, form: "Bakken" },
    { api: ndApiNumber(105, 2), name: "OASIS WILL 1H", op: 6, county: ndCounties[2], lat: 48.172, lon: -103.625, status: "PRODUCING", spud: monthsAgo(38), completion: monthsAgo(36), depth: 11450, form: "Bakken" },
    { api: ndApiNumber(105, 3), name: "CONTINENTAL WILL 1H", op: 4, county: ndCounties[2], lat: 48.175, lon: -103.630, status: "COMPLETED", spud: monthsAgo(4), completion: monthsAgo(2), depth: 11550, form: "Bakken" },
    { api: ndApiNumber(105, 4), name: "CONTINENTAL WILL 2H", op: 4, county: ndCounties[2], lat: 48.178, lon: -103.635, status: "DRILLING", spud: daysAgo(50), depth: null, form: null },

    // Dunn County
    { api: ndApiNumber(25, 1), name: "WHITING DUNN 1H", op: 5, county: ndCounties[3], lat: 47.350, lon: -102.730, status: "PRODUCING", spud: monthsAgo(55), completion: monthsAgo(53), depth: 12000, form: "Bakken" },
    { api: ndApiNumber(25, 2), name: "WHITING DUNN 2H", op: 5, county: ndCounties[3], lat: 47.352, lon: -102.734, status: "PRODUCING", spud: monthsAgo(52), completion: monthsAgo(50), depth: 12100, form: "Three Forks" },
    { api: ndApiNumber(25, 3), name: "OASIS DUNN 1H", op: 6, county: ndCounties[3], lat: 47.355, lon: -102.740, status: "SHUT_IN", spud: monthsAgo(48), completion: monthsAgo(46), depth: 11900, form: "Bakken" },
    { api: ndApiNumber(25, 4), name: "OASIS DUNN 2H", op: 6, county: ndCounties[3], lat: 47.358, lon: -102.745, status: "PLUGGED", spud: monthsAgo(72), completion: monthsAgo(70), depth: 11850, form: "Bakken" },
    { api: ndApiNumber(25, 5), name: "CONTINENTAL DUNN 1H", op: 4, county: ndCounties[3], lat: 47.362, lon: -102.750, status: "PERMITTED", spud: null, depth: null, form: null },
  ];

  // Create all wells
  const allWellDefs = [
    ...txWellDefs.map((w) => ({ ...w, stateId: tx.id })),
    ...ndWellDefs.map((w) => ({ ...w, stateId: nd.id })),
  ];

  console.log(`  Creating ${allWellDefs.length} wells...`);

  const createdWells: Array<{ id: number; api: string; status: string; spud: Date | null | undefined; completion: Date | null | undefined }> = [];

  for (const w of allWellDefs) {
    const well = await prisma.well.upsert({
      where: { apiNumber: w.api },
      update: {},
      create: {
        apiNumber: w.api,
        wellName: w.name,
        operatorId: operators[w.op].id,
        countyId: w.county.id,
        stateId: w.stateId,
        latitude: w.lat,
        longitude: w.lon,
        status: w.status as "PERMITTED" | "DRILLING" | "COMPLETED" | "PRODUCING" | "SHUT_IN" | "ABANDONED" | "PLUGGED",
        wellType: "OIL",
        spudDate: w.spud ?? undefined,
        completionDate: w.completion ?? undefined,
        totalDepth: w.depth ?? undefined,
        formation: w.form ?? undefined,
      },
    });
    createdWells.push({ id: well.id, api: w.api, status: w.status, spud: w.spud, completion: w.completion });
  }

  console.log(`  Wells seeded`);

  // ─── Permits ──────────────────────────────────────────────────────────────
  console.log("  Creating permits...");
  let permitCount = 0;

  for (const w of createdWells) {
    const well = await prisma.well.findUnique({ where: { id: w.id } });
    if (!well) continue;

    // Original permit (all wells)
    const spudOrNow = w.spud ?? new Date();
    const permitIssued = new Date(spudOrNow.getTime() - 30 * 24 * 3600 * 1000);
    await prisma.permit.upsert({
      where: {
        id: (await prisma.permit.findFirst({ where: { wellId: w.id, permitType: "ORIGINAL" } }))?.id ?? 0,
      },
      update: {},
      create: {
        wellId: w.id,
        permitType: "ORIGINAL",
        permitNumber: `P-${w.api.replace(/-/g, "").slice(0, 10)}`,
        status: "ISSUED",
        issuedDate: permitIssued,
        approvedDate: new Date(permitIssued.getTime() - 7 * 24 * 3600 * 1000),
      },
    });
    permitCount++;

    // Add amendment/extension for some wells
    if (w.status === "PRODUCING" || w.status === "COMPLETED") {
      const completionOrNow = w.completion ?? new Date();
      await prisma.permit.create({
        data: {
          wellId: w.id,
          permitType: "AMENDMENT",
          permitNumber: `PA-${w.api.replace(/-/g, "").slice(0, 10)}`,
          status: "APPROVED",
          issuedDate: new Date(completionOrNow.getTime() - 10 * 24 * 3600 * 1000),
          notes: "Wellbore deviation approved",
        },
      });
      permitCount++;
    }

    // Recent permit for PERMITTED/DRILLING wells (within 48h for alert demo)
    if (w.status === "PERMITTED") {
      await prisma.permit.create({
        data: {
          wellId: w.id,
          permitType: "ORIGINAL",
          permitNumber: `PN-${w.api.replace(/-/g, "").slice(0, 10)}`,
          status: "ISSUED",
          issuedDate: daysAgo(1), // triggers NEW_PERMIT alert
        },
      });
      permitCount++;
    }
  }

  console.log(`  ${permitCount} permits seeded`);

  // ─── Production ───────────────────────────────────────────────────────────
  console.log("  Creating production history...");
  let prodCount = 0;

  const producingWells = createdWells.filter((w) =>
    ["PRODUCING", "SHUT_IN"].includes(w.status) && w.completion
  );

  for (const w of producingWells) {
    const monthsSinceCompletion = Math.floor(
      (Date.now() - (w.completion as Date).getTime()) / (30 * 24 * 3600 * 1000)
    );
    const prodMonths = Math.min(monthsSinceCompletion, 24);

    // Determine peak based on state/formation
    const isND = w.api.startsWith("33-");
    const peakOil = isND
      ? 2000 + Math.round(Math.random() * 1500)  // Bakken peak ~2000-3500 bbl/day -> monthly
      : 3000 + Math.round(Math.random() * 4000); // Permian/Eagle Ford peak ~3000-7000
    const peakMonthlyOil = peakOil * 25; // ~25 producing days

    for (let m = 0; m < prodMonths; m++) {
      const reportMonth = monthsAgo(m);
      const oilBbl = oilProfile(m, peakMonthlyOil);
      const gasMcf = Math.round(oilBbl * (isND ? 0.8 : 1.2) * (0.9 + Math.random() * 0.2));
      const waterBbl = Math.round(oilBbl * (0.5 + m * 0.1) * (0.9 + Math.random() * 0.2));

      await prisma.production.upsert({
        where: { wellId_reportMonth: { wellId: w.id, reportMonth } },
        update: {},
        create: {
          wellId: w.id,
          reportMonth,
          oilBbl,
          gasMcf,
          waterBbl,
          daysProduced: 25 + Math.floor(Math.random() * 5),
        },
      });
      prodCount++;
    }
  }

  console.log(`  ${prodCount} production records seeded`);

  // ─── Demo User ────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: "demo@wellwire.app" },
    update: {},
    create: { email: "demo@wellwire.app", name: "Demo User" },
  });

  console.log(`  Demo user: ${user.email}`);

  // ─── Watchlists ───────────────────────────────────────────────────────────
  // Watchlist 1: Permian Basin tracking
  const wl1 = await prisma.watchlist.upsert({
    where: { id: 1 },
    update: {},
    create: {
      userId: user.id,
      name: "Permian Basin — Midland",
      description: "Tracking Pioneer and DBE activity in Midland County",
    },
  });

  // Add first 5 TX wells to wl1
  for (const well of createdWells.slice(0, 5)) {
    await prisma.watchlistWell.upsert({
      where: { watchlistId_wellId: { watchlistId: wl1.id, wellId: well.id } },
      update: {},
      create: { watchlistId: wl1.id, wellId: well.id },
    });
  }

  // Alert rules for wl1
  await prisma.alertRule.upsert({
    where: { id: 1 },
    update: {},
    create: {
      watchlistId: wl1.id,
      ruleType: "NEW_PERMIT",
      isActive: true,
    },
  });
  await prisma.alertRule.upsert({
    where: { id: 2 },
    update: {},
    create: {
      watchlistId: wl1.id,
      ruleType: "STATUS_CHANGE",
      targetStatus: "PRODUCING",
      isActive: true,
    },
  });
  await prisma.alertRule.upsert({
    where: { id: 3 },
    update: {},
    create: {
      watchlistId: wl1.id,
      ruleType: "PRODUCTION_THRESHOLD",
      threshold: 50000, // 50k bbl/month
      isActive: true,
    },
  });

  // Watchlist 2: Bakken ND tracking
  const wl2 = await prisma.watchlist.upsert({
    where: { id: 2 },
    update: {},
    create: {
      userId: user.id,
      name: "Bakken — McKenzie County",
      description: "Monitoring Continental and Oasis activity in McKenzie County ND",
    },
  });

  // Add ND McKenzie wells to wl2
  const ndMckWells = createdWells.filter((w) => w.api.startsWith("33-053"));
  for (const well of ndMckWells) {
    await prisma.watchlistWell.upsert({
      where: { watchlistId_wellId: { watchlistId: wl2.id, wellId: well.id } },
      update: {},
      create: { watchlistId: wl2.id, wellId: well.id },
    });
  }

  await prisma.alertRule.upsert({
    where: { id: 4 },
    update: {},
    create: {
      watchlistId: wl2.id,
      ruleType: "FIRST_PRODUCTION",
      isActive: true,
    },
  });
  await prisma.alertRule.upsert({
    where: { id: 5 },
    update: {},
    create: {
      watchlistId: wl2.id,
      ruleType: "STATUS_CHANGE",
      targetStatus: "PRODUCING,COMPLETED",
      isActive: true,
    },
  });

  console.log("  Watchlists and alert rules seeded");

  // ─── Sample Alerts ────────────────────────────────────────────────────────
  // Seed some pre-existing alerts for demo
  const producingWellId = createdWells.find((w) => w.status === "PRODUCING")?.id;
  const permittedWellId = createdWells.find((w) => w.status === "PERMITTED")?.id;

  if (producingWellId) {
    await prisma.alert.create({
      data: {
        watchlistId: wl1.id,
        wellId: producingWellId,
        ruleType: "PRODUCTION_THRESHOLD",
        message: "PIONEER WOLF 1H exceeded production threshold (52,340 BOE)",
        details: { oilBbl: "48000", gasMcf: "26040", threshold: "50000" },
        isRead: false,
        emailSent: false,
        triggeredAt: daysAgo(2),
      },
    });
  }

  if (permittedWellId) {
    await prisma.alert.create({
      data: {
        watchlistId: wl1.id,
        wellId: permittedWellId,
        ruleType: "NEW_PERMIT",
        message: "New permit issued for DBE WOLF A 2H (42-329-00007-0000)",
        details: { permitType: "ORIGINAL" },
        isRead: false,
        emailSent: false,
        triggeredAt: daysAgo(1),
      },
    });
  }

  // Second watchlist alert
  const ndWell = ndMckWells.find((w) => w.status === "COMPLETED");
  if (ndWell) {
    await prisma.alert.create({
      data: {
        watchlistId: wl2.id,
        wellId: ndWell.id,
        ruleType: "STATUS_CHANGE",
        message: "CONTINENTAL WILL 1H status changed to COMPLETED",
        details: { status: "COMPLETED" },
        isRead: false,
        emailSent: false,
        triggeredAt: daysAgo(3),
      },
    });
  }

  console.log("  Sample alerts seeded");

  // ─── Summary ──────────────────────────────────────────────────────────────
  const counts = await Promise.all([
    prisma.well.count(),
    prisma.permit.count(),
    prisma.production.count(),
    prisma.watchlist.count(),
    prisma.alert.count(),
  ]);

  console.log("\n=== Seed Summary ===");
  console.log(`  Wells:       ${counts[0]}`);
  console.log(`  Permits:     ${counts[1]}`);
  console.log(`  Production:  ${counts[2]}`);
  console.log(`  Watchlists:  ${counts[3]}`);
  console.log(`  Alerts:      ${counts[4]}`);
  console.log("\nDone!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
