"use client";

import { useId } from "react";
import { cx, num } from "@/lib/utils";

type Point = { label: string; value: number };
type Series = { name: string; color: string; values: number[] };

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

/** Smooth multi-series area/line chart, scales to container width. */
export function AreaChart({
  labels,
  series,
  height = 220,
  fillFirst = true,
  format = (v: number) => num(v),
}: {
  labels: string[];
  series: Series[];
  height?: number;
  fillFirst?: boolean;
  format?: (v: number) => string;
}) {
  const gid = useId().replace(/:/g, "");
  const W = 720;
  const H = 200;
  const P = { t: 14, r: 10, b: 26, l: 10 };
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const nice = Math.ceil(max / 1000) * 1000 || max;

  const xy = (i: number, v: number) => ({
    x: P.l + (i * (W - P.l - P.r)) / Math.max(1, labels.length - 1),
    y: P.t + (1 - v / nice) * (H - P.t - P.b),
  });

  const line = series.map((s) => smoothPath(s.values.map((v, i) => xy(i, v))));
  const area = line.map((d) => {
    if (!d) return "";
    const last = xy(labels.length - 1, 0);
    const first = xy(0, 0);
    return `${d} L ${last.x},${last.y} L ${first.x},${first.y} Z`;
  });

  const maxIdx = (s: Series) => s.values.indexOf(Math.max(...s.values));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ height, width: "100%" }}
      >
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`${gid}-g${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={P.l}
            x2={W - P.r}
            y1={P.t + f * (H - P.t - P.b)}
            y2={P.t + f * (H - P.t - P.b)}
            stroke="#13131b"
            strokeOpacity="0.06"
            strokeDasharray="3 5"
          />
        ))}
        {series.map((s, i) =>
          (fillFirst || i > 0) && area[i] ? (
            <path key={`a${i}`} d={area[i]} fill={`url(#${gid}-g${i})`} opacity={i === 0 ? 1 : 0.5} />
          ) : null
        )}
        {series.map((s, i) => (
          <path
            key={`l${i}`}
            d={line[i]}
            fill="none"
            stroke={s.color}
            strokeWidth="2.4"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {series.map((s, i) => {
          const idx = maxIdx(s);
          if (s.values[idx] <= 0) return null;
          const p = xy(idx, s.values[idx]);
          return (
            <g key={`d${i}`}>
              <circle cx={p.x} cy={p.y} r="4.5" fill={s.color} stroke="#fff" strokeWidth="2" />
              <text
                x={p.x}
                y={p.y - 11}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#13131b"
              >
                {format(s.values[idx])}
              </text>
            </g>
          );
        })}
        {labels.map((l, i) => (
          <text
            key={l + i}
            x={xy(i, 0).x}
            y={H - 8}
            textAnchor="middle"
            fontSize="10.5"
            fill="#8f8f9d"
          >
            {l}
          </text>
        ))}
      </svg>
    </div>
  );
}

const DONUT_COLORS = ["#6e63d9", "#10b981", "#f59e0b", "#f43f5e", "#0ea5e9", "#8b5cf6"];

export function Donut({
  segments,
  size = 168,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color?: string }[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = Math.max(
    1,
    segments.reduce((a, s) => a + s.value, 0)
  );
  const R = 62;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle cx="80" cy="80" r={R} fill="none" stroke="#eeeef0" strokeWidth="17" />
          {segments.map((s, i) => {
            const frac = s.value / total;
            const dash = `${frac * C} ${C}`;
            const offset = -acc * C;
            acc += frac;
            return (
              <circle
                key={i}
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={s.color || DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth="17"
                strokeDasharray={dash}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[22px] font-semibold leading-none tracking-tight">
            {centerValue ?? num(total)}
          </span>
          {centerLabel && (
            <span className="mt-1 text-[10.5px] font-medium uppercase tracking-wider text-ink-400">
              {centerLabel}
            </span>
          )}
        </div>
      </div>
      <ul className="min-w-32 flex-1 space-y-2">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-[12.5px]">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[4px]"
              style={{ background: s.color || DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span className="flex-1 truncate text-ink-500">{s.label}</span>
            <span className="font-semibold tabular-nums text-ink-800">{num(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBars({
  items,
  tone = "#6e63d9",
  format = (v: number) => num(v),
}: {
  items: { label: string; value: number; total?: number; sub?: string }[];
  tone?: string;
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.total ?? i.value));
  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px]">
            <span className="truncate font-medium text-ink-600">{item.label}</span>
            <span className="text-ink-400">
              <span className="font-semibold text-ink-800">{format(item.value)}</span>
              {item.sub && <span className="ml-1.5 text-[11px]">{item.sub}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(item.value / max) * 100}%`, background: tone }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BarColumns({
  points,
  height = 180,
  tone = "#6e63d9",
  format = (v: number) => num(v),
}: {
  points: Point[];
  height?: number;
  tone?: string;
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className="flex items-end gap-2.5" style={{ height }}>
      {points.map((p, i) => (
        <div key={i} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
          <span
            className={cx(
              "text-[10.5px] font-semibold text-ink-700 opacity-0 transition-opacity group-hover:opacity-100",
              p.value === 0 && "hidden"
            )}
          >
            {format(p.value)}
          </span>
          <div
            className="w-full max-w-10 rounded-t-lg transition-all group-hover:opacity-85"
            style={{
              height: `${Math.max(3, (p.value / max) * 78)}%`,
              background: `linear-gradient(180deg, ${tone}, ${tone}cc)`,
            }}
          />
          <span className="text-[10.5px] font-medium text-ink-400">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
