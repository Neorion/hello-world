-- CreateEnum
CREATE TYPE "well_status" AS ENUM ('PERMITTED', 'DRILLING', 'COMPLETED', 'PRODUCING', 'SHUT_IN', 'ABANDONED', 'PLUGGED');

-- CreateEnum
CREATE TYPE "well_type" AS ENUM ('OIL', 'GAS', 'OIL_GAS', 'WATER_DISPOSAL', 'INJECTION', 'DRY_HOLE');

-- CreateEnum
CREATE TYPE "permit_type" AS ENUM ('ORIGINAL', 'REENTRY', 'DEEPENING', 'EXTENSION', 'AMENDMENT', 'PLUGGING');

-- CreateEnum
CREATE TYPE "permit_status" AS ENUM ('PENDING', 'APPROVED', 'ISSUED', 'EXPIRED', 'CANCELLED', 'REVOKED');

-- CreateEnum
CREATE TYPE "alert_rule_type" AS ENUM ('NEW_PERMIT', 'STATUS_CHANGE', 'FIRST_PRODUCTION', 'PRODUCTION_THRESHOLD');

-- CreateTable
CREATE TABLE "states" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counties" (
    "id" SERIAL NOT NULL,
    "state_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "fips_code" VARCHAR(10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "counties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operators" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "tax_id" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wells" (
    "id" SERIAL NOT NULL,
    "api_number" VARCHAR(20) NOT NULL,
    "well_name" TEXT NOT NULL,
    "operator_id" INTEGER NOT NULL,
    "county_id" INTEGER NOT NULL,
    "state_id" INTEGER NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "status" "well_status" NOT NULL DEFAULT 'PERMITTED',
    "well_type" "well_type" NOT NULL DEFAULT 'OIL',
    "spud_date" TIMESTAMP(3),
    "completion_date" TIMESTAMP(3),
    "total_depth" INTEGER,
    "formation" TEXT,
    "section" TEXT,
    "township" TEXT,
    "range" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permits" (
    "id" SERIAL NOT NULL,
    "well_id" INTEGER NOT NULL,
    "permit_number" TEXT,
    "permit_type" "permit_type" NOT NULL,
    "issued_date" TIMESTAMP(3),
    "expires_date" TIMESTAMP(3),
    "approved_date" TIMESTAMP(3),
    "status" "permit_status" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production" (
    "id" SERIAL NOT NULL,
    "well_id" INTEGER NOT NULL,
    "report_month" TIMESTAMP(3) NOT NULL,
    "oil_bbl" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gas_mcf" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "water_bbl" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "days_produced" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlists" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_wells" (
    "id" SERIAL NOT NULL,
    "watchlist_id" INTEGER NOT NULL,
    "well_id" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_wells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" SERIAL NOT NULL,
    "watchlist_id" INTEGER NOT NULL,
    "rule_type" "alert_rule_type" NOT NULL,
    "threshold" DECIMAL(12,2),
    "target_status" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "watchlist_id" INTEGER NOT NULL,
    "well_id" INTEGER,
    "rule_type" "alert_rule_type" NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_runs" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "run_type" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "rows_inserted" INTEGER NOT NULL DEFAULT 0,
    "rows_updated" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'running',
    "message" TEXT,

    CONSTRAINT "ingestion_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "states_code_key" ON "states"("code");

-- CreateIndex
CREATE UNIQUE INDEX "counties_state_id_name_key" ON "counties"("state_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "operators_normalized_name_key" ON "operators"("normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "wells_api_number_key" ON "wells"("api_number");

-- CreateIndex
CREATE INDEX "wells_operator_id_idx" ON "wells"("operator_id");

-- CreateIndex
CREATE INDEX "wells_county_id_idx" ON "wells"("county_id");

-- CreateIndex
CREATE INDEX "wells_state_id_idx" ON "wells"("state_id");

-- CreateIndex
CREATE INDEX "wells_status_idx" ON "wells"("status");

-- CreateIndex
CREATE INDEX "permits_well_id_idx" ON "permits"("well_id");

-- CreateIndex
CREATE INDEX "production_well_id_idx" ON "production"("well_id");

-- CreateIndex
CREATE INDEX "production_report_month_idx" ON "production"("report_month");

-- CreateIndex
CREATE UNIQUE INDEX "production_well_id_report_month_key" ON "production"("well_id", "report_month");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_wells_watchlist_id_well_id_key" ON "watchlist_wells"("watchlist_id", "well_id");

-- CreateIndex
CREATE INDEX "alerts_watchlist_id_idx" ON "alerts"("watchlist_id");

-- CreateIndex
CREATE INDEX "alerts_triggered_at_idx" ON "alerts"("triggered_at");

-- AddForeignKey
ALTER TABLE "counties" ADD CONSTRAINT "counties_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wells" ADD CONSTRAINT "wells_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wells" ADD CONSTRAINT "wells_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wells" ADD CONSTRAINT "wells_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permits" ADD CONSTRAINT "permits_well_id_fkey" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production" ADD CONSTRAINT "production_well_id_fkey" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_wells" ADD CONSTRAINT "watchlist_wells_watchlist_id_fkey" FOREIGN KEY ("watchlist_id") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_wells" ADD CONSTRAINT "watchlist_wells_well_id_fkey" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_watchlist_id_fkey" FOREIGN KEY ("watchlist_id") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_watchlist_id_fkey" FOREIGN KEY ("watchlist_id") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_well_id_fkey" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE SET NULL ON UPDATE CASCADE;
