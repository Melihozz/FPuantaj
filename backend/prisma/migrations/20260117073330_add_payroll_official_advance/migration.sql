-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PayrollEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "daysWorked" INTEGER NOT NULL DEFAULT 0,
    "advance" REAL NOT NULL DEFAULT 0,
    "officialAdvance" REAL NOT NULL DEFAULT 0,
    "overtime50" REAL NOT NULL DEFAULT 0,
    "overtime100" REAL NOT NULL DEFAULT 0,
    "officialPayment" REAL NOT NULL DEFAULT 0,
    "cashPayment" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayrollEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PayrollEntry" ("advance", "cashPayment", "createdAt", "daysWorked", "employeeId", "id", "month", "officialPayment", "overtime100", "overtime50", "sortOrder", "updatedAt", "year") SELECT "advance", "cashPayment", "createdAt", "daysWorked", "employeeId", "id", "month", "officialPayment", "overtime100", "overtime50", "sortOrder", "updatedAt", "year" FROM "PayrollEntry";
DROP TABLE "PayrollEntry";
ALTER TABLE "new_PayrollEntry" RENAME TO "PayrollEntry";
CREATE UNIQUE INDEX "PayrollEntry_employeeId_month_year_key" ON "PayrollEntry"("employeeId", "month", "year");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
