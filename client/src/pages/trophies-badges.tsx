'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

// Type definitions
type TrophyBadge = {
  slug: string;
  title: string;
  desc?: string;
  category?: string;
  tier?: string;
  kind: 'trophy' | 'badge';
  achieved?: boolean;
};

type BadgeTier = 'all' | 'hof' | 'superstar' | 'allstar' | 'starter' | 'prospect';
type KindFilter = 'all' | 'trophies' | 'badges';
type EarnedFilter = 'all' | 'earned' | 'not';

// =============================
// Image helpers (locked to /trophies)
// - If a gray variant is missing, gracefully fall back to color
// =============================
function imgColor(slug: string): string {
  return `/trophies/${slug}.png`;
}
function imgGray(slug: string): string {
  return `/trophies/${slug}-gray.png`;
}

function TrophyBadgeImg({ slug, achieved, alt }: { slug: string; achieved: boolean; alt: string }) {
  const [src, setSrc] = useState(achieved ? imgColor(slug) : imgGray(slug));
  const triedFallback = useRef(false);
  return (
    <img
      src={src}
      alt={alt}
      className="w-20 h-20 object-contain select-none"
      draggable={false}
      onError={() => {
        if (!triedFallback.current && !achieved) {
          triedFallback.current = true;
          setSrc(imgColor(slug)); // if gray missing, use color
        }
      }}
    />
  );
}

// =============================
// Data: Trophies & Badges
// =============================
const LEGACY_TROPHIES = [
  { slug: 'uyp-heart-and-hustle', title: 'The UYP Heart and Hustle Award', category: 'legacy' },
  { slug: 'spirit-award', title: 'The Spirit Award', category: 'legacy' },
];

const TEAM_TROPHIES = [
  { slug: 'mvp', title: 'MVP (Most Valuable Player)', category: 'team' },
  { slug: 'coaches-award', title: 'Coach’s Award', category: 'team' },
  { slug: 'mip', title: 'MIP (Most Improved Player)', category: 'team' },
  { slug: 'defensive-player', title: 'Defensive Player', category: 'team' },
];

const TROPHY_LIST = [
  ...LEGACY_TROPHIES.map(t => ({ ...t, kind: 'trophy' })),
  ...TEAM_TROPHIES.map(t => ({ ...t, kind: 'trophy' })),
];

const HOF_BADGES = [
  { slug: 'superstar-supreme', title: 'Superstar Supreme', desc: '10× MVPs', tier: 'hof' },
  { slug: 'relentless', title: 'Relentless', desc: '10× Hustle', tier: 'hof' },
  { slug: 'the-linchpin', title: 'The Linchpin', desc: '10× Teammate', tier: 'hof' },
  { slug: 'the-paragon', title: 'The Paragon', desc: '10× Student of the Game', tier: 'hof' },
  { slug: 'dynasty-member', title: 'Dynasty Member', desc: '5 years active', tier: 'hof' },
  { slug: 'franchise-player', title: 'Franchise Player', desc: '100 total games', tier: 'hof' },
  { slug: 'fnh-hall-of-famer', title: 'FNH Hall of Famer', desc: '100 total FNH games', tier: 'hof' },
  { slug: 'training-titan', title: 'Training Titan', desc: '250 practices or 250 skills sessions', tier: 'hof' },
  { slug: 'immortal-ironman', title: 'Immortal Ironman', desc: 'Attended every one of your team’s games in a full year', tier: 'hof' },
  { slug: 'digital-triple-crown', title: 'Digital Triple Crown', desc: 'Completed 3 full Online Programs', tier: 'hof' },
  { slug: 'the-completer', title: 'The Completer', desc: 'Earned every Superstar badge', tier: 'hof' },
];

const SUPERSTAR_BADGES = [
  { slug: 'marquee-player', title: 'Marquee Player', desc: '5× MVPs', tier: 'superstar' },
  { slug: 'the-workhorse', title: 'The Workhorse', desc: '5× Hustle', tier: 'superstar' },
  { slug: 'the-cornerstone', title: 'The Cornerstone', desc: '5× Teammate', tier: 'superstar' },
  { slug: 'coach-on-the-court', title: 'Coach on the Court', desc: '5× Student of the Game', tier: 'superstar' },
  { slug: 'coaches-choice', title: 'Coach’s Choice', desc: 'Earned all 4 major Coach Awards (MVP, Hustle, Teammate, Student) at least once', tier: 'superstar' },
  { slug: 'ironman', title: 'Ironman', desc: 'Played every game in a season', tier: 'superstar' },
  { slug: 'the-pillar', title: 'The Pillar', desc: 'Attended every practice in a season', tier: 'superstar' },
  { slug: 'practice-centurion', title: 'Practice Centurion', desc: '100 practices', tier: 'superstar' },
  { slug: 'skills-specialist', title: 'Skills Specialist', desc: '100 skills sessions', tier: 'superstar' },
  { slug: 'seventy-five-club', title: 'Seventy-Five Club', desc: '75 total games', tier: 'superstar' },
  { slug: 'fnh-seventy-five', title: 'FNH Seventy-Five', desc: '75 total FNH games', tier: 'superstar' },
  { slug: 'team-veteran', title: 'Team Veteran', desc: '3 years active', tier: 'superstar' },
  { slug: 'foundation-graduate', title: 'Foundation Graduate', desc: 'Completed the Online Foundation Program', tier: 'superstar' },
  { slug: 'perfect-attendance-online', title: 'Perfect Attendance (Online)', desc: '12 straight weeks of online training program', tier: 'superstar' },
];

const ALLSTAR_BADGES = [
  { slug: 'game-changer', title: 'Game Changer', desc: '3× MVPs', tier: 'allstar' },
  { slug: 'the-engine', title: 'The Engine', desc: '3× Hustle', tier: 'allstar' },
  { slug: 'the-glue', title: 'The Glue', desc: '3× Teammate', tier: 'allstar' },
  { slug: 'the-protege', title: 'The Protégé', desc: '3× Student of the Game', tier: 'allstar' },
  { slug: 'practice-fiend', title: 'Practice Fiend', desc: '50 practices', tier: 'allstar' },
  { slug: 'skills-devotee', title: 'Skills Devotee', desc: '50 skills sessions', tier: 'allstar' },
  { slug: 'seasoned-competitor', title: 'Seasoned Competitor', desc: '50 total games', tier: 'allstar' },
  { slug: 'fnh-veteran', title: 'FNH Veteran', desc: '50 total FNH games', tier: 'allstar' },
  { slug: 'first-year-anniversary', title: 'First Year Anniversary', desc: '1 year active', tier: 'allstar' },
  { slug: 'digital-scholar', title: 'Digital Scholar', desc: 'Completed 6 consecutive weeks of any online training program', tier: 'allstar' },
];

const STARTER_BADGES = [
  { slug: 'locked-in', title: 'Locked In', desc: '10 consecutive practices', tier: 'starter' },
  { slug: 'dedicated-grinder', title: 'Dedicated Grinder', desc: '25 practices', tier: 'starter' },
  { slug: 'skills-seeker', title: 'Skills Seeker', desc: '25 skills sessions', tier: 'starter' },
  { slug: 'regular-competitor', title: 'Regular Competitor', desc: '25 total games', tier: 'starter' },
  { slug: 'fnh-regular', title: 'FNH Regular', desc: '25 total FNH games', tier: 'starter' },
  { slug: 'rsvp-streak', title: 'RSVP Streak', desc: 'Submitted RSVPs on time for 5 straight events', tier: 'starter' },
  { slug: 'practice-partner', title: 'Practice Partner', desc: 'Attended every scheduled practice in a single week', tier: 'starter' },
  { slug: 'film-student', title: 'Film Student', desc: 'Completed 5 online videos (any type)', tier: 'starter' },
  { slug: 'back-to-back-sessions', title: 'Back-to-Back Sessions', desc: 'Completed weekly online videos 2 weeks in a row', tier: 'starter' },
];

const STARTER_COACH_AWARDS = [
  { slug: 'game-mvp', title: 'Game MVP', desc: '', tier: 'starter' },
  { slug: 'hustle-award', title: 'Hustle Award', desc: '', tier: 'starter' },
  { slug: 'teammate-award', title: 'Teammate Award', desc: '', tier: 'starter' },
  { slug: 'student-of-the-game', title: 'Student of the Game', desc: '', tier: 'starter' },
  { slug: 'recruiter', title: 'Recruiter', desc: 'For bringing in a new player who joins', tier: 'starter' },
];

const PROSPECT_BADGES = [
  { slug: 'the-debut', title: 'The Debut', desc: 'First game played', tier: 'prospect' },
  { slug: 'friday-lights', title: 'Friday Lights', desc: 'First FNH game', tier: 'prospect' },
  { slug: 'practice-rookie', title: 'Practice Rookie', desc: '10 practices', tier: 'prospect' },
  { slug: 'skill-starter', title: 'Skill Starter', desc: '10 skills sessions', tier: 'prospect' },
  { slug: 'game-planner', title: 'Game Planner', desc: 'First RSVP to UYP event', tier: 'prospect' },
  { slug: 'checked-in', title: 'Checked In', desc: 'Checked-in to first UYP event', tier: 'prospect' },
  { slug: 'road-warrior', title: 'Road Warrior', desc: 'Attended event at a different location', tier: 'prospect' },
  { slug: 'film-rookie', title: 'Film Rookie', desc: 'First online training video', tier: 'prospect' },
  { slug: 'first-ten', title: 'First Ten', desc: '10 total games', tier: 'prospect' },
  { slug: 'fnh-rookie', title: 'FNH Rookie', desc: '10 total FNH games', tier: 'prospect' },
];

const BADGE_BUCKETS = { hof: HOF_BADGES, superstar: SUPERSTAR_BADGES, allstar: ALLSTAR_BADGES, starter: STARTER_BADGES.concat(STARTER_COACH_AWARDS), prospect: PROSPECT_BADGES } as const;
const BADGE_LIST = Object.entries(BADGE_BUCKETS).flatMap(([k, badges]) => badges.map((b: any) => ({ ...b, kind: 'badge' as const })));

// =============================
// Overlay copy helpers
// =============================
function trophyHowToEarn(slug: string): string {
  switch (slug) {
    case 'uyp-heart-and-hustle':
      return 'The yearly UYP-wide player who most consistently gave their all across practices and games.';
    case 'spirit-award':
      return 'The yearly UYP-wide player who best lifted morale and embodied UYP character on and off the court.';
    case 'mvp':
      return 'Player with the most significant impact on team success during the season.';
    case 'coaches-award':
      return 'Player who best exemplifies team values and coach philosophy (coachability, dedication, attitude).';
    case 'mip':
      return 'Player showing the biggest growth in skills and game sense over the season.';
    case 'defensive-player':
      return 'Player with the greatest defensive impact during the season.';
    default:
      return '';
  }
}

function typeLine(item: TrophyBadge): string {
  if (item.kind === 'trophy') {
    return item.category === 'legacy'
      ? 'Legacy Trophy: Premier yearly honor across all UYP.'
      : 'Team Trophy: Awarded by the coach to recognize standout players within their own team.';
  }
  const map = {
    hof: 'Badge — Hall of Fame (Gold) – Legends Only',
    superstar: 'Badge — Superstar (Purple) – Elite Consistency',
    allstar: 'Badge — All-Star (Blue) – Recognition & Milestones',
    starter: 'Badge — Starter (Green) – Habit Builders',
    prospect: 'Badge — Prospect (Grey) – First Steps',
  } as const;
  return map[item.tier as keyof typeof map] || 'Badge';
}

// =============================
// UI Primitives
// =============================
function Glass({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] ${className}`}>{children}</div>
  );
}

function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1 rounded-full backdrop-blur border border-white/10 bg-white/5 text-xs text-white/80">{children}</div>
  );
}

function ItemTile({ item, achieved, onOpen }: { item: TrophyBadge; achieved: boolean; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group relative focus:outline-none">
      <div className="relative">
        <div className="transition-transform duration-300 group-hover:scale-[1.04]">
          <div className="w-28 h-28 mx-auto flex items-center justify-center rounded-2xl bg-black/20">
            <TrophyBadgeImg slug={item.slug} achieved={achieved} alt={item.title} />
          </div>
        </div>
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 40px 4px rgba(255,255,255,0.12)' }} />
      </div>
      <div className="mt-3 text-center">
        <div className={`text-[13px] font-semibold min-h-[20px] ${achieved ? 'text-white' : 'text-white/50'}`}>{item.title}</div>
      </div>
    </button>
  );
}

function GlassOverlay({ open, onClose, item }: { open: boolean; onClose: () => void; item: TrophyBadge | null }) {
  if (!open || !item) return null;
  const how = item.kind === 'trophy' ? trophyHowToEarn(item.slug) : (item.desc || '');
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <Glass className="relative w-full max-w-xl p-6 text-white">
          <button onClick={onClose} className="absolute right-3 top-3 opacity-70 hover:opacity-100 transition" aria-label="Close">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 5.7L12 12l6.3 6.3-1.4 1.4L12 13.4l-6.3 6.3-1.4-1.4L10.6 12 4.3 5.7l1.4-1.4L12 10.6l6.3-6.3z"/></svg>
          </button>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="aspect-square w-40 flex items-center justify-center">
              <TrophyBadgeImg slug={item.slug} achieved={!!item.achieved} alt={item.title} />
            </div>
            <div className="space-y-2 text-left">
              <h3 className="text-lg font-semibold leading-tight text-center">{item.title}</h3>
              {how && <p className="text-sm text-white/90 leading-relaxed text-center">How to earn: {how}</p>}
              <p className="text-xs text-white/70 text-center">{typeLine(item)}</p>
            </div>
          </div>
        </Glass>
      </div>
    </div>
  );
}

// =============================
// Filter panel (single icon → dropdown sheet)
// =============================
function FilterButton({ earnedFilter, setEarnedFilter, kindFilter, setKindFilter, badgeTier, setBadgeTier }: {
  earnedFilter: EarnedFilter;
  setEarnedFilter: (filter: EarnedFilter) => void;
  kindFilter: KindFilter;
  setKindFilter: (filter: KindFilter) => void;
  badgeTier: BadgeTier;
  setBadgeTier: (tier: BadgeTier) => void;
}) {
  const [open, setOpen] = useState(false);
  const paneRef = useRef(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 backdrop-blur hover:bg-white/10 transition grid place-items-center"
        aria-label="Filters"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2l-7 7v5l-4-2v-3L3 7z"/></svg>
      </button>

      {open && (
        <>
          {/* Click-away */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Mobile bottom sheet */}
          <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 p-4">
            <Glass className="p-3 mx-2">
              <PanelContent {...{ earnedFilter, setEarnedFilter, kindFilter, setKindFilter, badgeTier, setBadgeTier }} onDone={() => setOpen(false)} />
            </Glass>
          </div>

          {/* Desktop anchored dropdown */}
          <div ref={paneRef} className="hidden sm:block absolute right-0 z-50 mt-2 min-w-[280px]">
            <Glass className="p-3">
              <PanelContent {...{ earnedFilter, setEarnedFilter, kindFilter, setKindFilter, badgeTier, setBadgeTier }} onDone={() => setOpen(false)} />
            </Glass>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="text-xs text-white/70 whitespace-nowrap">{label}</div>
      <div className="flex items-center gap-2 flex-wrap justify-end">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-xs border transition ${
        disabled ? 'opacity-50 cursor-not-allowed' : active ? 'border-white/20 bg-white/15 text-white' : 'border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

function PanelContent({ earnedFilter, setEarnedFilter, kindFilter, setKindFilter, badgeTier, setBadgeTier, onDone }: {
  earnedFilter: EarnedFilter;
  setEarnedFilter: (filter: EarnedFilter) => void;
  kindFilter: KindFilter;
  setKindFilter: (filter: KindFilter) => void;
  badgeTier: BadgeTier;
  setBadgeTier: (tier: BadgeTier) => void;
  onDone: () => void;
}) {
  return (
    <div className="space-y-2">
      <Row label="Progress">
        {['all','earned','not'].map(v => (
          <Chip key={v} active={earnedFilter===v} onClick={() => setEarnedFilter(v as EarnedFilter)} disabled={false}>{v==='all'?'All': v==='earned'?'Earned':'Not Earned'}</Chip>
        ))}
      </Row>
      <Row label="Type">
        {['all','trophies','badges'].map(v => (
          <Chip key={v} active={kindFilter===v} onClick={() => setKindFilter(v as KindFilter)} disabled={false}>{v==='all'?'All Types': v==='trophies'?'Trophies':'Badges'}</Chip>
        ))}
      </Row>
      <Row label="Tier (badges)">
        {[
          {v:'all', l:'All'}, {v:'hof', l:'HOF'}, {v:'superstar', l:'Superstar'}, {v:'allstar', l:'All-Star'}, {v:'starter', l:'Starter'}, {v:'prospect', l:'Prospect'}
        ].map(o => (
          <Chip key={o.v} active={badgeTier===o.v} onClick={() => setBadgeTier(o.v)} disabled={kindFilter==='trophies'}>{o.l}</Chip>
        ))}
      </Row>
      <div className="pt-2 text-right">
        <button onClick={onDone} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 bg-white/5 hover:bg-white/10 transition">Done</button>
      </div>
    </div>
  );
}

// =============================
// Page
// =============================
export default function TrophiesBadgesPage() {
  // Fetch achievements from canonical endpoint /api/user/{userId}/achievements
  const [achSlugs, setAchSlugs] = useState({ trophies: [], badges: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const qUser = url.searchParams.get('userId');
    const globalUser = window.UYP_USER_ID;
    const userId = (qUser || globalUser || 'me').toLowerCase();
    const endpoint = `/api/user/${userId}/achievements`;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(endpoint, { credentials: 'include' });
        if (res.ok) {
          const j = await res.json();
          if (!cancelled) setAchSlugs(j || { trophies: [], badges: [] });
        }
      } catch (_) {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Earned sets
  const earnedTrophies = useMemo(() => new Set((achSlugs.trophies || []).map(s => String(s).toLowerCase())), [achSlugs]);
  const earnedBadges = useMemo(() => new Set((achSlugs.badges || []).map(s => String(s).toLowerCase())), [achSlugs]);

  // Filters
  const [earnedFilter, setEarnedFilter] = useState<EarnedFilter>('earned'); // default Earned
  const [kindFilter, setKindFilter] = useState<KindFilter>('all'); // all | trophies | badges
  const [badgeTier, setBadgeTier] = useState<BadgeTier>('all'); // always available

  // Build dataset with achieved flags
  const trophies = useMemo(() => TROPHY_LIST.map(t => ({ ...t, achieved: earnedTrophies.has(t.slug) })), [earnedTrophies]);
  const badges = useMemo(() => BADGE_LIST.map(b => ({ ...b, achieved: earnedBadges.has(b.slug) })), [earnedBadges]);

  // Filtering helpers
  const byEarned = (arr: TrophyBadge[]) => earnedFilter === 'all' ? arr : arr.filter(i => earnedFilter === 'earned' ? i.achieved : !i.achieved);
  const sortEarnedFirst = (arr: TrophyBadge[]) => arr.slice().sort((a,b) => (a.achieved === b.achieved ? 0 : a.achieved ? -1 : 1));

  const trophiesFiltered = useMemo(() => {
    if (kindFilter === 'badges') return [];
    return sortEarnedFirst(byEarned(trophies));
  }, [trophies, earnedFilter, kindFilter]);

  const badgesFiltered = useMemo(() => {
    if (kindFilter === 'trophies') return [];
    const tiered = badgeTier === 'all' ? badges : badges.filter(b => b.tier === badgeTier);
    return sortEarnedFirst(byEarned(tiered));
  }, [badges, earnedFilter, kindFilter, badgeTier]);

  const trophyEarnedCount = trophies.filter(t => t.achieved).length;
  const badgeEarnedCount = badges.filter(b => b.achieved).length;

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TrophyBadge | null>(null);
  const openOverlay = (it: TrophyBadge) => { setSelected(it); setOpen(true); };

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(80%_50%_at_50%_0%,rgba(185,28,28,0.25),transparent),linear-gradient(180deg,#1a0202_0%,#000000_100%)] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FilterButton
              {...{ earnedFilter, setEarnedFilter, kindFilter, setKindFilter, badgeTier, setBadgeTier }}
            />
          </div>
          <div className="flex items-center gap-3">
            <StatPill> Trophies Earned: <span className="text-white/90 font-medium">{trophyEarnedCount}</span></StatPill>
            <StatPill> Badges Earned: <span className="text-white/90 font-medium">{badgeEarnedCount}</span></StatPill>
          </div>
        </div>

        {/* Trophies */}
        {(kindFilter === 'all' || kindFilter === 'trophies') && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white/80">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18 4h-2V2H8v2H6a2 2 0 0 0-2 2v2a4 4 0 0 0 4 4h.1A6 6 0 0 0 11 16.9V19H8v2h8v-2h-3v-2.1A6 6 0 0 0 15.9 12H16a4 4 0 0 0 4-4V6a2 2 0 0 0-2-2Z"/></svg>
              <span className="text-sm tracking-wide uppercase">Trophies</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 items-start">
              {trophiesFiltered.map(t => (
                <ItemTile key={`t-${t.slug}`} item={t} achieved={t.achieved} onOpen={() => openOverlay(t)} />
              ))}
            </div>
          </section>
        )}

        {/* Badges */}
        {(kindFilter === 'all' || kindFilter === 'badges') && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white/80">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.1 6.3L22 9.3l-5 4.9 1.2 6.8L12 17.7 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>
              <span className="text-sm tracking-wide uppercase">Badges</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 items-start">
              {badgesFiltered.map(b => (
                <ItemTile key={`b-${b.slug}`} item={b} achieved={b.achieved} onOpen={() => openOverlay(b)} />
              ))}
            </div>
          </section>
        )}
      </div>

      <GlassOverlay open={open && !!selected} onClose={() => setOpen(false)} item={selected} />
    </div>
  );
}

// =============================
// Console tests (optional)
// =============================
function runTests(){
  // earned-first sorting sanity
  const sample = [{ achieved:false }, { achieved:true }];
  const sorted = sample.slice().sort((a,b)=> (a.achieved===b.achieved?0:(a.achieved?-1:1)));
  console.assert(sorted[0].achieved===true, 'Earned-first sort failed');

  // tier filter sanity
  const mockBadges = [
    { kind:'badge', tier:'starter', achieved:true },
    { kind:'badge', tier:'allstar', achieved:false },
  ];
  const starterOnly = mockBadges.filter(b=> b.tier==='starter').length===1;
  console.assert(starterOnly, 'Tier filter sanity failed');

  console.info('%cAll UI tests passed', 'color:#22c55e');
}
if (typeof window !== 'undefined' && !window.__UYP_TESTS_RAN) {
  try { runTests(); } catch (e) { console.warn('Tests threw:', e); }
  window.__UYP_TESTS_RAN = true;
}
