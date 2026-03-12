import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface CareerStats {
  monthsWithOrg: number;
  eventsAttended: number;
  totalEventsInvited: number;
  attendancePercentage: number;
}

const schemes = {
  months:     { ring: ['#3498db', '#2980b9'] },
  events:     { ring: ['#27ae60', '#2ecc71'] },
  attendance: { ring: ['#e74c3c', '#c0392b'] },
} as const;

function gradientStops(stops: readonly string[]) {
  const step = 100 / (stops.length - 1);
  return stops.map((c, i) => <stop key={i} offset={`${i * step}%`} stopColor={c} />);
}

function CareerRing({
  label,
  value,
  total,
  displayValue,
  scheme,
  size = 136,
  stroke = 16,
}: {
  label: string;
  value: number;
  total: number;
  displayValue: string;
  scheme: { ring: readonly string[] };
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const pct = Math.max(0, Math.min(1, total > 0 ? value / total : 0));
  const dash = 2 * Math.PI * radius;
  const dashOffset = dash * (1 - pct);
  const safe = label.split(' ').join('-').toLowerCase();
  const ringId = `career-ring-${safe}`;

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
        aria-label={`${label} ${displayValue}`}
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

        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${ringId})`}
          strokeWidth={stroke}
          strokeDasharray={dash}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          initial={{ strokeDashoffset: dash }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />

        <text
          x={center}
          y={center + 6}
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui"
          fontWeight={400}
          fontSize={34}
          fill="#0f172a"
        >
          {displayValue}
        </text>

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

export default function CoachCareerRings({ profileId }: { profileId?: string }) {
  const queryParams = profileId ? `?profileId=${profileId}` : '';
  const { data: stats, isLoading } = useQuery<CareerStats>({
    queryKey: ['/api/coach/career-stats', profileId],
    queryFn: async () => {
      const res = await fetch(`/api/coach/career-stats${queryParams}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch career stats');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const monthsWithOrg = stats?.monthsWithOrg ?? 0;
  const eventsAttended = stats?.eventsAttended ?? 0;
  const totalInvited = stats?.totalEventsInvited ?? 0;
  const attendancePct = stats?.attendancePercentage ?? 0;

  const monthsCap = Math.max(monthsWithOrg, 12);
  const size = 136;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${size}px)`,
        gap: 4,
        justifyContent: 'center',
        padding: '4px',
      }}
    >
      <CareerRing
        label="Months"
        value={monthsWithOrg}
        total={monthsCap}
        displayValue={String(monthsWithOrg)}
        scheme={schemes.months}
        size={size}
      />
      <CareerRing
        label="Events"
        value={eventsAttended}
        total={Math.max(totalInvited, 1)}
        displayValue={String(eventsAttended)}
        scheme={schemes.events}
        size={size}
      />
      <CareerRing
        label="Attendance"
        value={attendancePct}
        total={100}
        displayValue={`${attendancePct}%`}
        scheme={schemes.attendance}
        size={size}
      />
    </div>
  );
}
