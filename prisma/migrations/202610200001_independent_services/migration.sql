CREATE TABLE "ServiceCatalog" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "version" INTEGER NOT NULL DEFAULT 0,
    "services" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceCatalog_pkey" PRIMARY KEY ("id")
);
