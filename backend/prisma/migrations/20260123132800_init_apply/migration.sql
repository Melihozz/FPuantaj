-- CreateTable
CREATE TABLE "TrafficFine" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fineDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficFine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficFinePayment" (
    "id" TEXT NOT NULL,
    "trafficFineId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrafficFinePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrafficFine_employeeId_idx" ON "TrafficFine"("employeeId");

-- CreateIndex
CREATE INDEX "TrafficFine_fineDate_idx" ON "TrafficFine"("fineDate");

-- CreateIndex
CREATE INDEX "TrafficFinePayment_trafficFineId_idx" ON "TrafficFinePayment"("trafficFineId");

-- AddForeignKey
ALTER TABLE "TrafficFine" ADD CONSTRAINT "TrafficFine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficFinePayment" ADD CONSTRAINT "TrafficFinePayment_trafficFineId_fkey" FOREIGN KEY ("trafficFineId") REFERENCES "TrafficFine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
