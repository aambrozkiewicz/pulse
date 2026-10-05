import { z } from 'zod';
import { isOriginPattern } from './origins';

const eventName = z.string().regex(/^[a-z][a-z0-9_]{0,63}$/);
export const siteConfigSchema = z.object({
 key: z.string().regex(/^[a-z0-9-]{1,60}$/),
 name: z.string().trim().min(1).max(100),
 origins: z.array(z.string().max(300).refine(isOriginPattern)).min(1).max(100),
 conversionEvent: eventName,
 funnelSteps: z.array(eventName).max(10).refine(steps => new Set(steps).size === steps.length, 'Kroki muszą być unikalne'),
});
