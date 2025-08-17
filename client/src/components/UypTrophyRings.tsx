'use client';
import React from 'react';

type Meter = { earned: number; total: number };
type UypRingsData = {
  trophies:   Meter;
  hallOfFame: Meter;
  superstar:  Meter;
  allStar:    Meter;
  starter:    Meter;
  prospect:   Meter;
};

const schemes = {
  trophies:   { ring: ['#9ad0ff', '#b7ffef', '#ffe07d', '#ff9ac2'] },
  hallOfFame: { ring: ['#FFD700', '#FFB347'] },
  superstar:  { ring: ['#8e44ad', '#9b59b6'] },
  allStar:    { ring: ['#3498db', '#2980b9'] },
  starter:    { ring: ['#27ae60', '#2ecc71'] },
  prospect:   { ring: ['#b9bfc3', '#8f989c'] },
} as const;

function gradientStops(stops: string[]) {
  const step = 100 / (stops.length - 1);
  return stops.map((c, i) => <stop key={i} offset={`${i * step}%`} stopColor={c} />);
}

function CircularRingMeter({
  label,
  earned,
  total,
  scheme,
  size = 160,
  stroke = 8,
}: {
  label: string;
  earned: number;
  total: number;
  scheme: { ring: string[] };
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const pct = Math.max(0, Math.min(1, total > 0 ? earned / total : 0));
  const dash = 2 * Math.PI * radius;
  const dashOffset = dash * (1 - pct);
  const safe = label.split(' ').join('-').toLowerCase();
  const ringId = `ring-${safe}`;

  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={`${label} ${earned}/${total}`}
      >
        <defs>
          <linearGradient id={ringId} x1="0%" y1="0%" x2="100%" y2="100%">
            {gradientStops(scheme.ring)}
            <animateTransform
              attributeName="gradientTransform"
              type="rotate"
              from="0 0.5 0.5"
              to="360 0.5 0.5"
              dur="12s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e5e7eb" /* light gray */
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        {/* Gradient progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${ringId})`}
          strokeWidth={stroke}
          strokeDasharray={dash}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`} // start at 12 o'clock
        />

        {/* Number (no bg, not bold) */}
        <text
          x={center}
          y={center + 6}
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui"
          fontWeight={400}
          fontSize={34}
          fill="#0f172a"
        >
          {earned}
        </text>

        {/* Label close under number */}
        <text
          x={center}
          y={center + 20}
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui"
          fontWeight={400}
          fontSize={9}
          fill="#334155"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}

export default function UypTrophyRings({
  data,
  size = 160,
  stroke = 8,
  className,
}: {
  data: UypRingsData;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${size}px)`,
        gap: 18,
        justifyContent: 'center',
      }}
    >
      <CircularRingMeter label="Trophies"     earned={data.trophies.earned}   total={data.trophies.total}     scheme={schemes.trophies}   size={size} stroke={stroke} />
      <CircularRingMeter label="Hall of Fame" earned={data.hallOfFame.earned} total={data.hallOfFame.total}   scheme={schemes.hallOfFame} size={size} stroke={stroke} />
      <CircularRingMeter label="Superstar"    earned={data.superstar.earned}  total={data.superstar.total}    scheme={schemes.superstar}  size={size} stroke={stroke} />
      <CircularRingMeter label="All-Star"     earned={data.allStar.earned}    total={data.allStar.total}      scheme={schemes.allStar}    size={size} stroke={stroke} />
      <CircularRingMeter label="Starter"      earned={data.starter.earned}    total={data.starter.total}      scheme={schemes.starter}    size={size} stroke={stroke} />
      <CircularRingMeter label="Prospect"     earned={data.prospect.earned}   total={data.prospect.total}     scheme={schemes.prospect}   size={size} stroke={stroke} />
    </div>
  );
}
