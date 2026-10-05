"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export default function DashboardHeader({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-4 border-b border-slate-200 pb-6 md:grid-cols-[minmax(0,1fr)_auto_auto]">
      <div className="text-3xl font-extrabold tracking-tight text-[#1664d8]">
        ◉ pulse
        <span className="mt-2 hidden text-[10px] font-semibold tracking-[0.2em] text-slate-500 md:block">
          TWÓJ RUCH. TWOJE DANE.
        </span>
      </div>
      <Link
        href="/dashboard/sites/new"
        className="col-span-2 row-start-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent bg-[#1664d8]/5 px-5 py-3 text-sm font-semibold text-[#1664d8] transition-colors hover:border-[#1664d8]/25 hover:bg-[#1664d8]/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1664d8] motion-reduce:transition-none md:col-span-1 md:col-start-2 md:row-start-1"
      >
        <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        Dodaj stronę
      </Link>
      <div
        ref={accountRef}
        className="relative col-start-2 row-start-1 md:col-start-3"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-label="Konto użytkownika"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1664d8] motion-reduce:transition-none"
        >
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-[#1664d8]/10 text-xs font-semibold text-[#1664d8]">
            {email.charAt(0).toLocaleUpperCase("pl")}
          </span>
          <span className="hidden md:inline">Konto</span>
          <svg aria-hidden="true" className={`size-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <div
          id={panelId}
          hidden={!open}
          className="absolute right-0 top-full z-30 mt-3 w-72 max-w-[calc(100vw-2.5rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/10"
        >
          <p className="text-xs text-slate-500">Zalogowano jako</p>
          <p className="mt-1 break-words text-sm font-medium text-slate-900 [overflow-wrap:anywhere]">{email}</p>
          <div className="my-3 border-t border-slate-100" />
          <form action="/api/logout" method="post">
            <button className="inline-flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1664d8]">
              <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              Wyloguj
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
