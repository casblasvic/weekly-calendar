-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'ERROR');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'LOCKED');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('HOLIDAY', 'VACATION', 'LEAVE', 'SPECIAL_CLOSURE', 'SPECIAL_OPENING', 'OTHER');

-- CreateEnum
CREATE TYPE "ExceptionScope" AS ENUM ('USER', 'CLINIC', 'SYSTEM');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('INITIAL', 'PURCHASE', 'SALE', 'CONSUMPTION', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'RETURN_SUPPLIER', 'RETURN_CLIENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'PARTIALLY_PAID', 'VOID', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'STRIPE', 'PAYPAL', 'BIZUM', 'BONO', 'PACKAGE', 'LOYALTY_POINTS', 'CHEQUE', 'GIFT_VOUCHER', 'OTHER');

-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'RECONCILED');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('PERCENTAGE_DISCOUNT', 'FIXED_AMOUNT_DISCOUNT', 'FREE_ITEM', 'BUY_X_GET_Y', 'POINTS_MULTIPLIER');

-- CreateEnum
CREATE TYPE "LoyaltyMovementType" AS ENUM ('AWARDED_PURCHASE', 'REDEEMED_PAYMENT', 'MANUAL_ADJUSTMENT', 'EXPIRATION', 'PROMOTION_AWARD', 'INITIAL_BALANCE');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('SYSTEM', 'USER', 'CLIENT', 'COMPANY', 'CONTACT_PERSON', 'LEAD', 'CLINIC', 'EQUIPMENT', 'DEVICE', 'SERVICE', 'PRODUCT', 'APPOINTMENT', 'TICKET', 'PAYMENT', 'EMPLOYMENT_CONTRACT');

-- CreateTable
CREATE TABLE "systems" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "province" TEXT,
    "countryCode" TEXT,
    "timezone" TEXT,
    "currency" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "commercialName" TEXT,
    "taxId" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "province" TEXT,
    "countryCode" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "isClient" BOOLEAN NOT NULL DEFAULT false,
    "isSupplier" BOOLEAN NOT NULL DEFAULT false,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_persons" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "position" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "source" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "assignedToUserId" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "province" TEXT,
    "countryCode" TEXT,
    "notes" TEXT,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "medicalHistoryConsent" BOOLEAN NOT NULL DEFAULT false,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "originClinicId" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_relations" (
    "clientAId" TEXT NOT NULL,
    "clientBId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_relations_pkey" PRIMARY KEY ("clientAId","clientBId")
);

-- CreateTable
CREATE TABLE "employment_contracts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contractType" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "jobTitle" TEXT,
    "salaryInfo" TEXT,
    "details" TEXT,
    "documentUrl" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clockInTime" TIMESTAMP(3) NOT NULL,
    "clockOutTime" TIMESTAMP(3),
    "date" DATE NOT NULL,
    "durationMinutes" INTEGER,
    "notes" TEXT,
    "source" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "swiftBic" TEXT,
    "bankName" TEXT,
    "currency" TEXT NOT NULL,
    "notes" TEXT,
    "systemId" TEXT NOT NULL,
    "clinicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_terminals" (
    "id" TEXT NOT NULL,
    "terminalIdProvider" TEXT,
    "name" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "clinicId" TEXT,
    "provider" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_terminals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serialNumber" TEXT,
    "modelNumber" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "warrantyEndDate" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "clinicId" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceIdProvider" TEXT,
    "deviceType" TEXT,
    "apiEndpoint" TEXT,
    "lastKnownStatus" "DeviceStatus",
    "notes" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "clientNotes" TEXT,
    "clientId" TEXT NOT NULL,
    "professionalUserId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "equipmentId" TEXT,
    "deviceActivationTimestamp" TIMESTAMP(3),
    "deviceDeactivationTimestamp" TIMESTAMP(3),
    "actualUsageMinutes" INTEGER,
    "isUsageLocked" BOOLEAN NOT NULL DEFAULT false,
    "originalAppointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_template_blocks" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isWorking" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_template_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_schedules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_schedules" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_exceptions" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "type" "ExceptionType" NOT NULL,
    "scope" "ExceptionScope" NOT NULL,
    "userId" TEXT,
    "clinicId" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "price" DOUBLE PRECISION,
    "colorCode" TEXT,
    "requiresMedicalSignOff" BOOLEAN NOT NULL DEFAULT false,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "price" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "minStockThreshold" INTEGER,
    "isForSale" BOOLEAN NOT NULL DEFAULT true,
    "isInternalUse" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_ledgers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "movementType" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "userId" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vat_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ratePercent" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "countryCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vat_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariffs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" DATE,
    "validUntil" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "finalAmount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "clientId" TEXT,
    "companyId" TEXT,
    "cashierUserId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_items" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "serviceId" TEXT,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatTypeId" TEXT,
    "vatAmount" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionReference" TEXT,
    "notes" TEXT,
    "cashSessionId" TEXT,
    "posTerminalId" TEXT,
    "bankAccountId" TEXT,
    "userId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "openingTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closingTime" TIMESTAMP(3),
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openingBalance" DOUBLE PRECISION NOT NULL,
    "closingBalance" DOUBLE PRECISION,
    "expectedBalance" DOUBLE PRECISION,
    "difference" DOUBLE PRECISION,
    "notes" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bono_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serviceId" TEXT NOT NULL,
    "numberOfSessions" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "validityDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bono_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bono_instances" (
    "id" TEXT NOT NULL,
    "bonoDefinitionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "remainingSessions" INTEGER NOT NULL,
    "purchaseTicketItemId" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bono_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_items" (
    "id" TEXT NOT NULL,
    "packageDefinitionId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "serviceId" TEXT,
    "productId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT,
    "type" "PromotionType" NOT NULL,
    "value" DOUBLE PRECISION,
    "minPurchaseAmount" DOUBLE PRECISION,
    "maxDiscountAmount" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usesPerClient" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_ledgers" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "movementType" "LoyaltyMovementType" NOT NULL,
    "points" INTEGER NOT NULL,
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "expiryDate" TIMESTAMP(3),
    "userId" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("userId","skillId")
);

-- CreateTable
CREATE TABLE "entity_images" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" TEXT,
    "caption" TEXT,
    "order" INTEGER,
    "isProfilePic" BOOLEAN NOT NULL DEFAULT false,
    "uploadedByUserId" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_documents" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "description" TEXT,
    "uploadedByUserId" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "clinics_systemId_idx" ON "clinics"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_systemId_key" ON "roles"("name", "systemId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_action_module_key" ON "permissions"("action", "module");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_taxId_key" ON "companies"("taxId");

-- CreateIndex
CREATE INDEX "contact_persons_companyId_idx" ON "contact_persons"("companyId");

-- CreateIndex
CREATE INDEX "contact_persons_systemId_idx" ON "contact_persons"("systemId");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_assignedToUserId_idx" ON "leads"("assignedToUserId");

-- CreateIndex
CREATE INDEX "leads_systemId_idx" ON "leads"("systemId");

-- CreateIndex
CREATE INDEX "clients_systemId_idx" ON "clients"("systemId");

-- CreateIndex
CREATE INDEX "clients_lastName_firstName_idx" ON "clients"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "clients_originClinicId_idx" ON "clients"("originClinicId");

-- CreateIndex
CREATE INDEX "client_relations_clientBId_idx" ON "client_relations"("clientBId");

-- CreateIndex
CREATE INDEX "employment_contracts_userId_idx" ON "employment_contracts"("userId");

-- CreateIndex
CREATE INDEX "time_logs_userId_date_idx" ON "time_logs"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_iban_key" ON "bank_accounts"("iban");

-- CreateIndex
CREATE INDEX "bank_accounts_systemId_idx" ON "bank_accounts"("systemId");

-- CreateIndex
CREATE INDEX "bank_accounts_clinicId_idx" ON "bank_accounts"("clinicId");

-- CreateIndex
CREATE INDEX "pos_terminals_systemId_idx" ON "pos_terminals"("systemId");

-- CreateIndex
CREATE INDEX "pos_terminals_bankAccountId_idx" ON "pos_terminals"("bankAccountId");

-- CreateIndex
CREATE INDEX "pos_terminals_clinicId_idx" ON "pos_terminals"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_terminals_terminalIdProvider_provider_systemId_key" ON "pos_terminals"("terminalIdProvider", "provider", "systemId");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_serialNumber_key" ON "equipment"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_deviceId_key" ON "equipment"("deviceId");

-- CreateIndex
CREATE INDEX "equipment_systemId_idx" ON "equipment"("systemId");

-- CreateIndex
CREATE INDEX "equipment_clinicId_idx" ON "equipment"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "devices_deviceIdProvider_key" ON "devices"("deviceIdProvider");

-- CreateIndex
CREATE INDEX "devices_systemId_idx" ON "devices"("systemId");

-- CreateIndex
CREATE INDEX "appointments_startTime_idx" ON "appointments"("startTime");

-- CreateIndex
CREATE INDEX "appointments_clientId_idx" ON "appointments"("clientId");

-- CreateIndex
CREATE INDEX "appointments_professionalUserId_idx" ON "appointments"("professionalUserId");

-- CreateIndex
CREATE INDEX "appointments_systemId_idx" ON "appointments"("systemId");

-- CreateIndex
CREATE INDEX "appointments_clinicId_idx" ON "appointments"("clinicId");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_templates_name_systemId_key" ON "schedule_templates"("name", "systemId");

-- CreateIndex
CREATE INDEX "schedule_template_blocks_templateId_idx" ON "schedule_template_blocks"("templateId");

-- CreateIndex
CREATE INDEX "user_schedules_userId_idx" ON "user_schedules"("userId");

-- CreateIndex
CREATE INDEX "user_schedules_templateId_idx" ON "user_schedules"("templateId");

-- CreateIndex
CREATE INDEX "user_schedules_systemId_idx" ON "user_schedules"("systemId");

-- CreateIndex
CREATE INDEX "clinic_schedules_clinicId_idx" ON "clinic_schedules"("clinicId");

-- CreateIndex
CREATE INDEX "clinic_schedules_templateId_idx" ON "clinic_schedules"("templateId");

-- CreateIndex
CREATE INDEX "clinic_schedules_systemId_idx" ON "clinic_schedules"("systemId");

-- CreateIndex
CREATE INDEX "schedule_exceptions_startDate_endDate_idx" ON "schedule_exceptions"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "schedule_exceptions_systemId_scope_idx" ON "schedule_exceptions"("systemId", "scope");

-- CreateIndex
CREATE INDEX "schedule_exceptions_userId_idx" ON "schedule_exceptions"("userId");

-- CreateIndex
CREATE INDEX "schedule_exceptions_clinicId_idx" ON "schedule_exceptions"("clinicId");

-- CreateIndex
CREATE INDEX "schedule_exceptions_systemId_idx" ON "schedule_exceptions"("systemId");

-- CreateIndex
CREATE INDEX "services_systemId_idx" ON "services"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "services_name_systemId_key" ON "services"("name", "systemId");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_systemId_idx" ON "products"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "products_name_systemId_key" ON "products"("name", "systemId");

-- CreateIndex
CREATE INDEX "stock_ledgers_productId_idx" ON "stock_ledgers"("productId");

-- CreateIndex
CREATE INDEX "stock_ledgers_movementDate_idx" ON "stock_ledgers"("movementDate");

-- CreateIndex
CREATE INDEX "stock_ledgers_userId_idx" ON "stock_ledgers"("userId");

-- CreateIndex
CREATE INDEX "stock_ledgers_systemId_idx" ON "stock_ledgers"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "vat_types_name_systemId_countryCode_key" ON "vat_types"("name", "systemId", "countryCode");

-- CreateIndex
CREATE INDEX "tariffs_systemId_idx" ON "tariffs"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "tariffs_name_systemId_key" ON "tariffs"("name", "systemId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_appointmentId_key" ON "tickets"("appointmentId");

-- CreateIndex
CREATE INDEX "tickets_issueDate_idx" ON "tickets"("issueDate");

-- CreateIndex
CREATE INDEX "tickets_clientId_idx" ON "tickets"("clientId");

-- CreateIndex
CREATE INDEX "tickets_companyId_idx" ON "tickets"("companyId");

-- CreateIndex
CREATE INDEX "tickets_cashierUserId_idx" ON "tickets"("cashierUserId");

-- CreateIndex
CREATE INDEX "tickets_clinicId_idx" ON "tickets"("clinicId");

-- CreateIndex
CREATE INDEX "tickets_systemId_idx" ON "tickets"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticketNumber_systemId_key" ON "tickets"("ticketNumber", "systemId");

-- CreateIndex
CREATE INDEX "ticket_items_ticketId_idx" ON "ticket_items"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_items_serviceId_idx" ON "ticket_items"("serviceId");

-- CreateIndex
CREATE INDEX "ticket_items_productId_idx" ON "ticket_items"("productId");

-- CreateIndex
CREATE INDEX "ticket_items_vatTypeId_idx" ON "ticket_items"("vatTypeId");

-- CreateIndex
CREATE INDEX "payments_ticketId_idx" ON "payments"("ticketId");

-- CreateIndex
CREATE INDEX "payments_paymentDate_idx" ON "payments"("paymentDate");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_systemId_idx" ON "payments"("systemId");

-- CreateIndex
CREATE INDEX "payments_cashSessionId_idx" ON "payments"("cashSessionId");

-- CreateIndex
CREATE INDEX "payments_posTerminalId_idx" ON "payments"("posTerminalId");

-- CreateIndex
CREATE INDEX "payments_bankAccountId_idx" ON "payments"("bankAccountId");

-- CreateIndex
CREATE INDEX "cash_sessions_userId_idx" ON "cash_sessions"("userId");

-- CreateIndex
CREATE INDEX "cash_sessions_clinicId_idx" ON "cash_sessions"("clinicId");

-- CreateIndex
CREATE INDEX "cash_sessions_openingTime_idx" ON "cash_sessions"("openingTime");

-- CreateIndex
CREATE INDEX "cash_sessions_status_idx" ON "cash_sessions"("status");

-- CreateIndex
CREATE INDEX "cash_sessions_systemId_idx" ON "cash_sessions"("systemId");

-- CreateIndex
CREATE INDEX "bono_definitions_serviceId_idx" ON "bono_definitions"("serviceId");

-- CreateIndex
CREATE INDEX "bono_definitions_systemId_idx" ON "bono_definitions"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "bono_definitions_name_systemId_key" ON "bono_definitions"("name", "systemId");

-- CreateIndex
CREATE UNIQUE INDEX "bono_instances_purchaseTicketItemId_key" ON "bono_instances"("purchaseTicketItemId");

-- CreateIndex
CREATE INDEX "bono_instances_clientId_idx" ON "bono_instances"("clientId");

-- CreateIndex
CREATE INDEX "bono_instances_bonoDefinitionId_idx" ON "bono_instances"("bonoDefinitionId");

-- CreateIndex
CREATE INDEX "bono_instances_systemId_idx" ON "bono_instances"("systemId");

-- CreateIndex
CREATE INDEX "bono_instances_purchaseTicketItemId_idx" ON "bono_instances"("purchaseTicketItemId");

-- CreateIndex
CREATE INDEX "package_definitions_systemId_idx" ON "package_definitions"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "package_definitions_name_systemId_key" ON "package_definitions"("name", "systemId");

-- CreateIndex
CREATE INDEX "package_items_packageDefinitionId_idx" ON "package_items"("packageDefinitionId");

-- CreateIndex
CREATE INDEX "package_items_serviceId_idx" ON "package_items"("serviceId");

-- CreateIndex
CREATE INDEX "package_items_productId_idx" ON "package_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE INDEX "promotions_systemId_idx" ON "promotions"("systemId");

-- CreateIndex
CREATE INDEX "promotions_code_idx" ON "promotions"("code");

-- CreateIndex
CREATE INDEX "promotions_startDate_endDate_idx" ON "promotions"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_name_systemId_key" ON "promotions"("name", "systemId");

-- CreateIndex
CREATE INDEX "loyalty_ledgers_clientId_idx" ON "loyalty_ledgers"("clientId");

-- CreateIndex
CREATE INDEX "loyalty_ledgers_movementDate_idx" ON "loyalty_ledgers"("movementDate");

-- CreateIndex
CREATE INDEX "loyalty_ledgers_systemId_idx" ON "loyalty_ledgers"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_systemId_key" ON "skills"("name", "systemId");

-- CreateIndex
CREATE INDEX "entity_images_entityId_entityType_idx" ON "entity_images"("entityId", "entityType");

-- CreateIndex
CREATE INDEX "entity_images_uploadedByUserId_idx" ON "entity_images"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "entity_images_systemId_idx" ON "entity_images"("systemId");

-- CreateIndex
CREATE INDEX "entity_documents_entityId_entityType_idx" ON "entity_documents"("entityId", "entityType");

-- CreateIndex
CREATE INDEX "entity_documents_uploadedByUserId_idx" ON "entity_documents"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "entity_documents_systemId_idx" ON "entity_documents"("systemId");
