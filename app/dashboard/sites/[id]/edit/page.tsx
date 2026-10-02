import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import SiteForm from '../../site-form';
export default async function EditSite({params}: {params: Promise<{id: string}>}) {
 await requireUser();
 const {id} = await params;
 const site = await db.site.findUnique({where: {id}});
 if (!site) notFound();
 return <main className="mx-auto w-full max-w-[780px] p-5 md:p-8"><Link className="text-[#1664d8] underline underline-offset-4 hover:text-[#1664d8]/80" href={`/dashboard?site=${site.key}`}>← Wróć do dashboardu</Link><div className="flex flex-col items-start justify-between gap-4 py-8 md:flex-row md:items-center"><div><small className="text-xs leading-relaxed text-slate-500">USTAWIENIA STRONY</small><h1 className="my-3 text-3xl font-bold tracking-tight text-slate-900 md:text-[38px]">Edytuj: {site.name}</h1><p className="my-3 leading-relaxed text-slate-500">Zmień nazwę, dozwolone adresy i zdarzenia dla tej strony.</p></div></div><section className="mb-5 rounded-2xl border border-slate-200 bg-white p-6"><SiteForm site={site}/></section></main>;
}
