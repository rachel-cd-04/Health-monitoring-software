ALTER TABLE "checkins"
  ADD COLUMN "heart_rate" DECIMAL(10,3),
  ADD COLUMN "bp_systolic" DECIMAL(10,3),
  ADD COLUMN "bp_diastolic" DECIMAL(10,3),
  ADD COLUMN "blood_sugar" DECIMAL(10,3),
  ADD COLUMN "temperature" DECIMAL(10,3),
  ADD COLUMN "exercise_min" DECIMAL(10,3);
