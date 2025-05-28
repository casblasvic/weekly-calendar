-- CreateIndex
CREATE INDEX "PaymentVerification_verifiedByUserId_idx" ON "PaymentVerification"("verifiedByUserId");

-- CreateIndex
CREATE INDEX "cash_sessions_posTerminalId_idx" ON "cash_sessions"("posTerminalId");

-- CreateIndex
CREATE INDEX "stock_ledgers_movementType_idx" ON "stock_ledgers"("movementType");

-- CreateIndex
CREATE INDEX "tariffs_currencyCode_idx" ON "tariffs"("currencyCode");
