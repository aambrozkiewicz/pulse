ALTER TABLE "Site" ADD COLUMN "funnelSteps" TEXT[] NOT NULL DEFAULT ARRAY['page_view']::TEXT[];
ALTER TABLE "Site" ALTER COLUMN "conversionEvent" SET DEFAULT 'conversion';
