'use client';

import { useId, useState } from 'react';

type Point = { label: string; count: number };
const width = 1000;
const height = 260;
const left = 48;
const right = 984;
const top = 20;
const bottom = 240;
const dateLabel = (date: string) => new Intl.DateTimeFormat('pl', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

export default function TrafficChart({ series }: { series: Point[] }) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const peak = Math.max(1, ...series.map(point => point.count));
  const magnitude = 10 ** Math.floor(Math.log10(peak));
  const ceiling = Math.ceil(peak / magnitude) * magnitude;
  const points = series.map((point, index) => ({
    ...point,
    x: left + index / Math.max(1, series.length - 1) * (right - left),
    y: bottom - point.count / ceiling * (bottom - top),
  }));
  if (!points.length) return null;
  // Horizontal tangents keep the curve smooth without inventing peaks between days.
  const line = points.reduce((path, point, index) => {
    if (!index) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const middle = (previous.x + point.x) / 2;
    return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }, '');
  const selected = active === null ? null : points[active];

  return <div className="mt-6">
    <div
      className="relative rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#1664d8]/40"
      tabIndex={0}
      role="group"
      aria-label="Wykres odsłon dziennie. Użyj strzałek w lewo i w prawo, aby odczytać wartości."
      onPointerMove={event => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width * width;
        setActive(Math.max(0, Math.min(points.length - 1, Math.round((x - left) / (right - left) * (points.length - 1)))));
      }}
      onPointerLeave={() => setActive(null)}
      onFocus={() => setActive(0)}
      onBlur={() => setActive(null)}
      onKeyDown={event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          setActive(index => Math.max(0, Math.min(points.length - 1, (index ?? 0) + (event.key === 'ArrowRight' ? 1 : -1))));
        } else if (event.key === 'Escape') setActive(null);
      }}
    >
      <svg className="block h-[220px] w-full sm:h-[280px]" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.015" />
          </linearGradient>
          <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1664d8" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map(fraction => {
          const y = bottom - fraction * (bottom - top);
          return <g key={fraction}>
            <line x1={left} x2={right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={fraction ? '4 6' : undefined} vectorEffect="non-scaling-stroke" />
            <text x={left - 12} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="12">{(ceiling * fraction).toLocaleString('pl')}</text>
          </g>;
        })}
        <path d={`${line} L ${points.at(-1)!.x} ${bottom} L ${points[0].x} ${bottom} Z`} fill={`url(#${id}-fill)`} />
        <path d={line} fill="none" stroke={`url(#${id}-line)`} strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {selected && <g>
          <line x1={selected.x} x2={selected.x} y1={top} y2={bottom} stroke="#1664d8" strokeOpacity="0.3" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
          <circle cx={selected.x} cy={selected.y} r="10" fill="#1664d8" fillOpacity="0.1" />
          <circle cx={selected.x} cy={selected.y} r="4.5" fill="#1664d8" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </g>}
      </svg>
      {selected && <div className="pointer-events-none absolute top-0 z-10 min-w-[130px] rounded-xl border border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-sm" style={{ left: `${Math.max(0, Math.min(100, selected.x / width * 100))}%`, transform: `translateX(${selected.x / width < 0.2 ? '0' : selected.x / width > 0.8 ? '-100%' : '-50%'})` }}>
        <p className="text-xs text-slate-500">{dateLabel(selected.label)}</p>
        <p className="mt-1 flex items-baseline gap-2"><strong className="text-xl font-semibold tabular-nums text-slate-900">{selected.count.toLocaleString('pl')}</strong><span className="text-xs text-slate-500">odsłon</span></p>
      </div>}
    </div>
    <div className="mt-3 flex justify-between pl-[4.8%] pr-[1.6%] text-xs text-slate-400">
      {[0, Math.floor((points.length - 1) / 2), points.length - 1].map((index, position) => <span key={position}>{dateLabel(points[index].label)}</span>)}
    </div>
    <span className="sr-only" aria-live="polite">{selected ? `${selected.label}: ${selected.count} odsłon` : ''}</span>
    <details className="sr-only focus-within:not-sr-only"><summary>Dane wykresu</summary><ul>{series.map(point => <li key={point.label}>{point.label}: {point.count} odsłon</li>)}</ul></details>
  </div>;
}
