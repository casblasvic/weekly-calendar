-- CreateTable
CREATE TABLE "PaymentVerification" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "attachmentUrl" TEXT,

    CONSTRAINT "PaymentVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentVerification_paymentId_key" ON "PaymentVerification"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentVerification_paymentId_idx" ON "PaymentVerification"("paymentId");
