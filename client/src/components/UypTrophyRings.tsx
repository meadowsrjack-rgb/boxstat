import { motion } from 'framer-motion';

type Meter = { earned: number; total: number };
type UypRingsData = {
  legacy:     Meter;
  hof:        Meter;
  superstar:  Meter;
  allStar:    Meter;
  starter:    Meter;
  prospect:   Meter;
};

const schemes = {
  legacy:     { ring: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9b59b6'] },
  hof:        { ring: ['#FFD700', '#FFB347'] },
  superstar:  { ring: ['#8e44ad', '#9b59b6'] },
  allStar:    { ring: ['#3498db', '#2980b9'] },
  starter:    { ring: ['#27ae60', '#2ecc71'] },
  prospect:   { ring: ['#b9bfc3', '#8f989c'] },
} as const;

function gradientStops(stops: readonly string[]) {
  const step = 100 / (stops.length - 1);
  return stops.map((c, i) => <stop key={i} offset={`${i * step}%`} stopColor={c} />);
}

function CircularRingMeter({
  label,
  earned,
  total,
  scheme,
  size = 136,
  stroke = 16,
}: {
  label: string;
  earned: number;
  total: number;
  scheme: { ring: readonly string[] };
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
    <motion.div 
      style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      whileHover={{ scale: 1.05 }}
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <motion.svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={`${label} ${earned}/${total}`}
        initial={{ rotate: -10 }}
        whileInView={{ rotate: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
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

        {/* Gradient progress arc with animation */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${ringId})`}
          strokeWidth={stroke}
          strokeDasharray={dash}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`} // start at 12 o'clock
          initial={{ strokeDashoffset: dash }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
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
      </motion.svg>
    </motion.div>
  );
}

export default function UypTrophyRings({
  data,
  size = 136,
  stroke = 16,
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
        gap: 4,
        justifyContent: 'center',
        padding: '4px',
      }}
    >
      <CircularRingMeter label="Legacy"     earned={data.legacy.earned}     total={data.legacy.total}     scheme={schemes.legacy}     size={size} stroke={stroke} />
      <CircularRingMeter label="HOF"        earned={data.hof.earned}        total={data.hof.total}        scheme={schemes.hof}        size={size} stroke={stroke} />
      <CircularRingMeter label="Superstar"  earned={data.superstar.earned}  total={data.superstar.total}  scheme={schemes.superstar}  size={size} stroke={stroke} />
      <CircularRingMeter label="All-Star"   earned={data.allStar.earned}    total={data.allStar.total}    scheme={schemes.allStar}    size={size} stroke={stroke} />
      <CircularRingMeter label="Starter"    earned={data.starter.earned}    total={data.starter.total}    scheme={schemes.starter}    size={size} stroke={stroke} />
      <CircularRingMeter label="Prospect"   earned={data.prospect.earned}   total={data.prospect.total}   scheme={schemes.prospect}   size={size} stroke={stroke} />
    </div>
  );
}
