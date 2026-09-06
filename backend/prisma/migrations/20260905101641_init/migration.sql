-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Anonymous Patient',
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "symptoms" JSONB NOT NULL,
    "duration" TEXT NOT NULL,
    "tokenNumber" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "assignedRoom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage_results" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "redFlags" JSONB NOT NULL,
    "possibleConditions" JSONB NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "doctorHandoverSummary" TEXT NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triage_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_reviews" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending Review',
    "clinicalNotes" TEXT,
    "recommendedActionOverride" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_patientId_key" ON "patients"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_tokenNumber_key" ON "patients"("tokenNumber");

-- CreateIndex
CREATE UNIQUE INDEX "triage_results_patientId_key" ON "triage_results"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_reviews_patientId_key" ON "doctor_reviews"("patientId");

-- AddForeignKey
ALTER TABLE "triage_results" ADD CONSTRAINT "triage_results_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_reviews" ADD CONSTRAINT "doctor_reviews_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
