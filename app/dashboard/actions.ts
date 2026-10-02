'use server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { siteConfigSchema } from '@/lib/site-config';

export async function saveSite(siteId: string | null, _previous: {error: string}, form: FormData): Promise<{error: string}> {
 await requireUser();
 const existing = siteId ? await db.site.findUnique({where: {id: siteId}}) : null;
 if (siteId && !existing) return {error: 'Ta strona nie istnieje. Wróć do dashboardu i wybierz stronę ponownie.'};
 const parsed = siteConfigSchema.safeParse({
  key: existing?.key ?? form.get('key'), name: form.get('name'),
  origins: String(form.get('origins') ?? '').split(',').map(s => s.trim()),
  conversionEvent: String(form.get('conversionEvent') ?? '').trim(),
  funnelSteps: String(form.get('funnelSteps') ?? '').split(',').map(s => s.trim()).filter(Boolean),
 });
 if (!parsed.success) return {error: 'Sprawdź formularz: podaj nazwę, poprawny klucz i adresy bez ścieżek. Nazwy zdarzeń muszą zaczynać się małą literą i zawierać tylko małe litery, cyfry lub podkreślenia. Podaj maksymalnie 10 różnych kroków.'};
 const data = parsed.data;
 try {
  if (existing) await db.site.update({where: {id: existing.id}, data});
  else await db.site.create({data});
 } catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return {error: 'Strona z tym kluczem już istnieje. Wybierz inny klucz lub edytuj istniejącą stronę.'};
  throw error;
 }
 revalidatePath('/dashboard');
 redirect('/dashboard?site=' + data.key);
}
