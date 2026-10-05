"use client";
import Link from "next/link";
import { useActionState } from "react";
import { saveSite } from "../actions";

type Site = {
  id: string;
  name: string;
  key: string;
  origins: string[];
  conversionEvent: string;
  funnelSteps: string[];
};
export default function SiteForm({ site }: { site?: Site }) {
  const [state, action, pending] = useActionState(
    saveSite.bind(null, site?.id ?? null),
    { error: "" },
  );
  const cancelUrl = site ? `/dashboard?site=${site.key}` : "/dashboard";
  return (
    <form action={action}>
      {state.error && (
        <p className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-700" role="alert">
          {state.error}
        </p>
      )}
      <label className="mb-5 block text-sm font-medium text-slate-700">
        Nazwa strony
        <input className="mt-2 block w-full max-w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 read-only:bg-slate-50 read-only:text-slate-500"
          name="name"
          required
          placeholder="Moja strona"
          maxLength={100}
          defaultValue={site?.name}
        />
      </label>
      <label className="mb-5 block text-sm font-medium text-slate-700">
        Klucz strony
        <input className="mt-2 block w-full max-w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 read-only:bg-slate-50 read-only:text-slate-500"
          name="key"
          required
          pattern="[a-z0-9-]{1,60}"
          placeholder="moja-strona"
          defaultValue={site?.key}
          readOnly={!!site}
        />
        <small className="mt-2 block text-xs leading-relaxed text-slate-500">
          {site
            ? "Stały klucz używany przez tracker tej strony."
            : "Krótki identyfikator: małe litery, cyfry i myślniki. Użyj innego klucza dla każdej strony."}
        </small>
      </label>
      <label className="mb-5 block text-sm font-medium text-slate-700">
        Dozwolone adresy strony
        <input className="mt-2 block w-full max-w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 read-only:bg-slate-50 read-only:text-slate-500"
          name="origins"
          required
          placeholder="https://*.eatally.pl, https://mojlunch.pl"
          defaultValue={site?.origins.join(", ")}
        />
        <small className="mt-2 block text-xs leading-relaxed text-slate-500">
          Oddziel adresy przecinkami. Podaj protokół i domenę, bez ścieżki i
          końcowego ukośnika. Do 100 adresów. Zapis https://*.eatally.pl dopuszcza
          wszystkie subdomeny; samą domenę eatally.pl dodaj osobno.
        </small>
      </label>
      <label className="mb-5 block text-sm font-medium text-slate-700">
        Zdarzenie konwersji
        <input className="mt-2 block w-full max-w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 read-only:bg-slate-50 read-only:text-slate-500"
          name="conversionEvent"
          required
          pattern="[a-z][a-z0-9_]{0,63}"
          maxLength={64}
          defaultValue={site?.conversionEvent ?? "conversion"}
        />
        <small className="mt-2 block text-xs leading-relaxed text-slate-500">
          Akcja, którą uznajesz za sukces, np. purchase_completed lub form_sent.
        </small>
      </label>
      <label className="mb-5 block text-sm font-medium text-slate-700">
        Kroki na stronie (opcjonalnie)
        <input className="mt-2 block w-full max-w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 read-only:bg-slate-50 read-only:text-slate-500"
          name="funnelSteps"
          placeholder="page_view, button_clicked, conversion"
          defaultValue={site?.funnelSteps.join(", ") ?? "page_view"}
        />
        <small className="mt-2 block text-xs leading-relaxed text-slate-500">
          Do 10 różnych zdarzeń, oddzielonych przecinkami, w kolejności
          wyświetlania.
        </small>
      </label>
      <p className="my-3 leading-relaxed text-slate-500">
        Po zapisaniu skorzystaj z instrukcji integracji, aby dodać tracker i
        własne zdarzenia na stronie.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button className="inline-flex items-center justify-center rounded-lg border border-transparent px-5 py-3 text-sm font-semibold transition-colors motion-reduce:transition-none disabled:cursor-wait disabled:opacity-65 bg-[#1664d8] text-white hover:bg-[#1664d8]/90" disabled={pending}>
          {pending ? "Zapisywanie…" : site ? "Zapisz zmiany" : "Dodaj stronę"}
        </button>
        <Link className="text-[#1664d8] underline underline-offset-4 hover:text-[#1664d8]/80" href={cancelUrl}>Anuluj</Link>
      </div>
    </form>
  );
}
