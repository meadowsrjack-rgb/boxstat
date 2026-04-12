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
  legacy:     { ring: ['#e74c4c', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'] },
  hof:        { ring: ['#c4b5fd', '#5b21b6'] },
  superstar:  { ring: ['#67e8f9', '#155e75'] },
  allStar:    { ring: ['#fde047', '#854d0e'] },
  starter:    { ring: ['#cbd5e1', '#475569'] },
  prospect:   { ring: ['#f5d0a9', '#92400e'] },
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
        {label === 'Legend' && (
          <defs>
            <linearGradient id="legend-text-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e74c4c" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="75%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        )}
        <text
          x={center}
          y={center + 20}
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui"
          fontWeight={label === 'Legend' ? 700 : 400}
          fontSize={9}
          fill={label === 'Legend' ? 'url(#legend-text-gradient)' : '#334155'}
        >
          {label}
        </text>
      </motion.svg>
    </motion.div>
  );
}

const defaultMeter: Meter = { earned: 0, total: 1 };

export default function UypTrophyRings({
  data,
  size = 136,
  stroke = 16,
  className,
}: {
  data: UypRingsData | null | undefined;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const safeData = {
    legacy: data?.legacy ?? defaultMeter,
    hof: data?.hof ?? defaultMeter,
    superstar: data?.superstar ?? defaultMeter,
    allStar: data?.allStar ?? defaultMeter,
    starter: data?.starter ?? defaultMeter,
    prospect: data?.prospect ?? defaultMeter,
  };

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
      <CircularRingMeter label="Legend"     earned={safeData.legacy.earned}     total={safeData.legacy.total}     scheme={schemes.legacy}     size={size} stroke={stroke} />
      <CircularRingMeter label="Diamond"    earned={safeData.hof.earned}        total={safeData.hof.total}        scheme={schemes.hof}        size={size} stroke={stroke} />
      <CircularRingMeter label="Platinum"   earned={safeData.superstar.earned}  total={safeData.superstar.total}  scheme={schemes.superstar}  size={size} stroke={stroke} />
      <CircularRingMeter label="Gold"       earned={safeData.allStar.earned}    total={safeData.allStar.total}    scheme={schemes.allStar}    size={size} stroke={stroke} />
      <CircularRingMeter label="Silver"     earned={safeData.starter.earned}    total={safeData.starter.total}    scheme={schemes.starter}    size={size} stroke={stroke} />
      <CircularRingMeter label="Bronze"     earned={safeData.prospect.earned}   total={safeData.prospect.total}   scheme={schemes.prospect}   size={size} stroke={stroke} />
    </div>
  );
}
