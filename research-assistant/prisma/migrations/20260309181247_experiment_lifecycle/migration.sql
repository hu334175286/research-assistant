-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Experiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "hypothesis" TEXT,
    "configJson" TEXT,
    "metricsJson" TEXT,
    "logsJson" TEXT,
    "conclusion" TEXT,
    "tags" TEXT,
    "sourcePaperId" TEXT,
    "datasetId" TEXT,
    "datasetVersionSnapshot" TEXT,
    "codeSnapshot" TEXT,
    "environment" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Experiment_sourcePaperId_fkey" FOREIGN KEY ("sourcePaperId") REFERENCES "Paper" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Experiment_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Experiment" ("conclusion", "configJson", "createdAt", "datasetId", "datasetVersionSnapshot", "hypothesis", "id", "metricsJson", "name", "updatedAt") SELECT "conclusion", "configJson", "createdAt", "datasetId", "datasetVersionSnapshot", "hypothesis", "id", "metricsJson", "name", "updatedAt" FROM "Experiment";
DROP TABLE "Experiment";
ALTER TABLE "new_Experiment" RENAME TO "Experiment";
CREATE INDEX "Experiment_datasetId_idx" ON "Experiment"("datasetId");
CREATE INDEX "Experiment_sourcePaperId_idx" ON "Experiment"("sourcePaperId");
CREATE INDEX "Experiment_status_idx" ON "Experiment"("status");
CREATE INDEX "Experiment_createdAt_idx" ON "Experiment"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
