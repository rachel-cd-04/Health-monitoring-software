-- CreateEnum
CREATE TYPE "AstronautRole" AS ENUM ('crew', 'commander');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('manual', 'simulated', 'sensor');

-- CreateEnum
CREATE TYPE "MissionPhase" AS ENUM ('pre', 'in_flight', 'post');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('green', 'amber', 'red');

-- CreateEnum
CREATE TYPE "EmergencyScenario" AS ENUM ('chest_pain', 'collapsed', 'breathing', 'bleeding', 'other');

-- CreateEnum
CREATE TYPE "RadiationSource" AS ENUM ('simulated', 'imported', 'sensor');

-- CreateTable
CREATE TABLE "astronauts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AstronautRole" NOT NULL DEFAULT 'crew',
    "avatar" TEXT,
    "pin_hash" TEXT,
    "failed_pin_attempts" SMALLINT NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "mission_start" DATE,
    "baseline" JSONB,

    CONSTRAINT "astronauts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "doc_type" TEXT,
    "accessed_on" DATE,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurements" (
    "id" BIGSERIAL NOT NULL,
    "astronaut_id" INTEGER NOT NULL,
    "indicator" TEXT NOT NULL,
    "value" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "ts" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "DataSource" NOT NULL,
    "mission_phase" "MissionPhase",
    "extra" JSONB,

    CONSTRAINT "measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkins" (
    "id" BIGSERIAL NOT NULL,
    "astronaut_id" INTEGER NOT NULL,
    "day" DATE NOT NULL,
    "sleep_hours" DECIMAL(5,2),
    "mood" SMALLINT,
    "fatigue" SMALLINT,
    "source" "DataSource" NOT NULL,

    CONSTRAINT "checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "indicator" TEXT NOT NULL,
    "body_system" TEXT,
    "condition" TEXT NOT NULL,
    "level" "AlertLevel",
    "who_acts" TEXT[],
    "message" TEXT NOT NULL,
    "actions" TEXT[],
    "source_id" TEXT,

    CONSTRAINT "rules_pkey" PRIMARY KEY ("id","version")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" BIGSERIAL NOT NULL,
    "astronaut_id" INTEGER NOT NULL,
    "rule_id" TEXT NOT NULL,
    "rule_version" INTEGER NOT NULL,
    "indicator" TEXT NOT NULL,
    "value" DECIMAL(10,3),
    "measurement_id" BIGINT,
    "level" "AlertLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "ts" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "acknowledged_at" TIMESTAMPTZ(6),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_items" (
    "id" BIGSERIAL NOT NULL,
    "astronaut_id" INTEGER NOT NULL,
    "item" TEXT NOT NULL,
    "due_at" TIMESTAMPTZ(6) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "routine_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_events" (
    "id" UUID NOT NULL,
    "patient_id" INTEGER,
    "reporter_id" INTEGER,
    "scenario" "EmergencyScenario" NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "source" "DataSource" NOT NULL DEFAULT 'simulated',

    CONSTRAINT "emergency_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_steps" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "ts" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "step_id" TEXT NOT NULL,
    "answer" TEXT,
    "vital_indicator" TEXT,
    "vital_value" DECIMAL(10,3),

    CONSTRAINT "emergency_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiation_events" (
    "id" BIGSERIAL NOT NULL,
    "ts" TIMESTAMPTZ(6) NOT NULL,
    "dose_msv" DECIMAL(10,3),
    "dose_rate_usv_h" DECIMAL(10,3),
    "radiation_type" TEXT,
    "location" TEXT,
    "instrument" TEXT,
    "event_type" TEXT,
    "source" "RadiationSource" NOT NULL DEFAULT 'simulated',

    CONSTRAINT "radiation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "measurements_astronaut_id_indicator_ts_idx" ON "measurements"("astronaut_id", "indicator", "ts");

-- CreateIndex
CREATE INDEX "checkins_astronaut_id_day_idx" ON "checkins"("astronaut_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "checkins_astronaut_id_day_key" ON "checkins"("astronaut_id", "day");

-- CreateIndex
CREATE INDEX "alerts_astronaut_id_active_idx" ON "alerts"("astronaut_id", "active");

-- CreateIndex
CREATE INDEX "routine_items_astronaut_id_due_at_idx" ON "routine_items"("astronaut_id", "due_at");

-- CreateIndex
CREATE INDEX "emergency_events_patient_id_started_at_idx" ON "emergency_events"("patient_id", "started_at");

-- CreateIndex
CREATE INDEX "emergency_steps_event_id_ts_idx" ON "emergency_steps"("event_id", "ts");

-- CreateIndex
CREATE INDEX "radiation_events_ts_idx" ON "radiation_events"("ts");

-- AddForeignKey
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_astronaut_id_fkey" FOREIGN KEY ("astronaut_id") REFERENCES "astronauts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_astronaut_id_fkey" FOREIGN KEY ("astronaut_id") REFERENCES "astronauts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_astronaut_id_fkey" FOREIGN KEY ("astronaut_id") REFERENCES "astronauts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_rule_id_rule_version_fkey" FOREIGN KEY ("rule_id", "rule_version") REFERENCES "rules"("id", "version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_measurement_id_fkey" FOREIGN KEY ("measurement_id") REFERENCES "measurements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_items" ADD CONSTRAINT "routine_items_astronaut_id_fkey" FOREIGN KEY ("astronaut_id") REFERENCES "astronauts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_events" ADD CONSTRAINT "emergency_events_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "astronauts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_events" ADD CONSTRAINT "emergency_events_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "astronauts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_steps" ADD CONSTRAINT "emergency_steps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "emergency_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
