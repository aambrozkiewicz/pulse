import { Prisma } from '@prisma/client';

export const unknownDomain = '__unknown__';
export function domainFilter(domain: string) {
 return domain === unknownDomain ? Prisma.sql`AND "domain" IS NULL`
  : domain ? Prisma.sql`AND "domain"=${domain}` : Prisma.empty;
}
