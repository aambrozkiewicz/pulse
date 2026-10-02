import { z } from 'zod';

const eventName = z.string().regex(/^[a-z][a-z0-9_]{0,63}$/);
export const siteConfigSchema = z.object({
 key: z.string().regex(/^[a-z0-9-]{1,60}$/),
 name: z.string().trim().min(1).max(100),
 origins: z.array(z.string().url().refine(s => new URL(s).origin === s && /^https?:/.test(s))).min(1).max(10),
 conversionEvent: eventName,
 funnelSteps: z.array(eventName).max(10).refine(steps => new Set(steps).size === steps.length, 'Kroki muszą być unikalne'),
});
