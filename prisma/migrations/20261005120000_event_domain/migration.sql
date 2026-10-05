ALTER TABLE "Event" ADD COLUMN "domain" TEXT;
CREATE INDEX "Event_siteId_domain_createdAt_idx" ON "Event"("siteId", "domain", "createdAt");
