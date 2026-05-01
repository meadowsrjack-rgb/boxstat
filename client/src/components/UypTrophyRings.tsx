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
  onClick,
}: {
  label: string;
  earned: number;
  total: number;
  scheme: { ring: readonly string[] };
  size?: number;
  stroke?: number;
  onClick?: () => void;
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
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
      }}
      whileHover={{ scale: onClick ? 1.08 : 1.05 }}
      whileTap={onClick ? { scale: 0.96 } : undefined}
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      data-testid={onClick ? `tier-ring-${label.toLowerCase()}` : undefined}
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
          fill='#334155'
        >
          {label}
        </text>
      </motion.svg>
    </motion.div>
  );
}

const defaultMeter: Meter = { earned: 0, total: 1 };

export type TrophyTier = 'Legend' | 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze';

export default function UypTrophyRings({
  data,
  size = 136,
  stroke = 16,
  className,
  onTierClick,
}: {
  data: UypRingsData | null | undefined;
  size?: number;
  stroke?: number;
  className?: string;
  onTierClick?: (tier: TrophyTier) => void;
}) {
  const safeData = {
    legacy: data?.legacy ?? defaultMeter,
    hof: data?.hof ?? defaultMeter,
    superstar: data?.superstar ?? defaultMeter,
    allStar: data?.allStar ?? defaultMeter,
    starter: data?.starter ?? defaultMeter,
    prospect: data?.prospect ?? defaultMeter,
  };

  const handle = (tier: TrophyTier) => onTierClick ? () => onTierClick(tier) : undefined;

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
      <CircularRingMeter label="Legend"     earned={safeData.legacy.earned}     total={safeData.legacy.total}     scheme={schemes.legacy}     size={size} stroke={stroke} onClick={handle('Legend')} />
      <CircularRingMeter label="Diamond"    earned={safeData.hof.earned}        total={safeData.hof.total}        scheme={schemes.hof}        size={size} stroke={stroke} onClick={handle('Diamond')} />
      <CircularRingMeter label="Platinum"   earned={safeData.superstar.earned}  total={safeData.superstar.total}  scheme={schemes.superstar}  size={size} stroke={stroke} onClick={handle('Platinum')} />
      <CircularRingMeter label="Gold"       earned={safeData.allStar.earned}    total={safeData.allStar.total}    scheme={schemes.allStar}    size={size} stroke={stroke} onClick={handle('Gold')} />
      <CircularRingMeter label="Silver"     earned={safeData.starter.earned}    total={safeData.starter.total}    scheme={schemes.starter}    size={size} stroke={stroke} onClick={handle('Silver')} />
      <CircularRingMeter label="Bronze"     earned={safeData.prospect.earned}   total={safeData.prospect.total}   scheme={schemes.prospect}   size={size} stroke={stroke} onClick={handle('Bronze')} />
    </div>
  );
}
