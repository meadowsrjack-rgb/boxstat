'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Trophy, Star, Crown, Award, Shield, Heart } from 'lucide-react';

/**
 * IMAGE CONVENTION
 * Place images in /public/attached_assets with these folders:
 *   /attached_assets/trophies
 *   /attached_assets/trophies_grey
 *   /attached_assets/badges
 *   /attached_assets/badges_grey
 * Each item below has a slug. Name the PNG files <slug>.png in each folder.
 * Example:
 *   /attached_assets/badges/marquee-player.png
 *   /attached_assets/badges_grey/marquee-player.png
 */

// ────────────────────────────────────────────────────────────────
// Types & helpers
// ────────────────────────────────────────────────────────────────
type AwardItem = {
  slug: string;
  title: string;
  desc?: string;
};

type Achievements = {
  trophies: string[];
  badges: string[];
};

const imgPath = (kind: 'trophy' | 'badge', slug: string, achieved: boolean) => {
  // All trophies and badges are in the same folder, differentiated by -gray suffix
  const suffix = achieved ? '' : '-gray';
  return `/trophiesbadges/${slug}${suffix}.png`;
};

const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  color,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  color?: string;
}) => (
  <div className="flex items-start gap-3">
    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: color || '#fee2e2' }}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  </div>
);

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-10">{children}</div>
);

const Tile = ({
  kind,
  slug,
  title,
  desc,
  achieved,
  accent,
}: {
  kind: 'trophy' | 'badge';
  slug: string;
  title: string;
  desc?: string;
  achieved: boolean;
  accent?: string;
}) => (
  <div className="flex flex-col items-center text-center">
    <div className="relative">
      <img
        src={imgPath(kind, slug, achieved)}
        alt={title}
        className="h-28 w-28 object-contain select-none"
        draggable={false}
      />
      {!achieved && (
        <div className="pointer-events-none absolute inset-0 rounded-xl" />
      )}
    </div>
    <div className="mt-3">
      <div className="text-sm font-semibold" style={{ color: achieved ? (accent || '#111827') : '#6b7280' }}>
        {title}
      </div>
      {desc && <div className="text-xs text-gray-500 mt-1">{desc}</div>}
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────────
/** DATA: TROPHIES */
// ────────────────────────────────────────────────────────────────
const LEGACY_TROPHIES: AwardItem[] = [
  { slug: 'uyp-heart-and-hustle', title: 'The UYP Heart and Hustle Award', desc: 'Yearly: single winner across all UYP' },
  { slug: 'spirit-award', title: 'The Spirit Award', desc: 'Yearly: single winner across all UYP' },
];

const TEAM_TROPHIES: AwardItem[] = [
  { slug: 'mvp', title: 'MVP (Most Valuable Player)' },
  { slug: 'coaches-award', title: 'Coach’s Award' },
  { slug: 'mip', title: 'MIP (Most Improved Player)' },
  { slug: 'defensive-player', title: 'Defensive Player' },
];

// ────────────────────────────────────────────────────────────────
/** DATA: BADGES (TIERS) */
// ────────────────────────────────────────────────────────────────
const HOF_BADGES: AwardItem[] = [
  { slug: 'superstar-supreme', title: 'Superstar Supreme', desc: '10× MVPs' },
  { slug: 'relentless', title: 'Relentless', desc: '10× Hustle' },
  { slug: 'the-linchpin', title: 'The Linchpin', desc: '10× Teammate' },
  { slug: 'the-paragon', title: 'The Paragon', desc: '10× Student of the Game' },
  { slug: 'dynasty-member', title: 'Dynasty Member', desc: '5 years active' },
  { slug: 'franchise-player', title: 'Franchise Player', desc: '100 total games' },
  { slug: 'fnh-hall-of-famer', title: 'FNH Hall of Famer', desc: '100 total FNH games' },
  { slug: 'training-titan', title: 'Training Titan', desc: '250 practices OR 250 skills' },
  { slug: 'immortal-ironman', title: 'Immortal Ironman', desc: 'Every team game in a full year' },
  { slug: 'digital-triple-crown', title: 'Digital Triple Crown', desc: '3 full online programs' },
  { slug: 'the-completer', title: 'The Completer', desc: 'Every Superstar badge' },
];

const SUPERSTAR_BADGES: AwardItem[] = [
  { slug: 'marquee-player', title: 'Marquee Player', desc: '5× MVPs' },
  { slug: 'the-workhorse', title: 'The Workhorse', desc: '5× Hustle' },
  { slug: 'the-cornerstone', title: 'The Cornerstone', desc: '5× Teammate' },
  { slug: 'coach-on-the-court', title: 'Coach on the Court', desc: '5× Student of the Game' },
  { slug: 'coaches-choice', title: 'Coach’s Choice', desc: 'All 4 coach awards at least once' },
  { slug: 'ironman', title: 'Ironman', desc: 'Every game in a season' },
  { slug: 'the-pillar', title: 'The Pillar', desc: 'Every practice in a season' },
  { slug: 'practice-centurion', title: 'Practice Centurion', desc: '100 practices' },
  { slug: 'skills-specialist', title: 'Skills Specialist', desc: '100 skills sessions' },
  { slug: 'seventy-five-club', title: 'Seventy-Five Club', desc: '75 total games' },
  { slug: 'fnh-seventy-five', title: 'FNH Seventy-Five', desc: '75 total FNH games' },
  { slug: 'team-veteran', title: 'Team Veteran', desc: '3 years active' },
  { slug: 'foundation-graduate', title: 'Foundation Graduate', desc: 'Online Foundation Program' },
  { slug: 'perfect-attendance-online', title: 'Perfect Attendance (Online)', desc: '12 straight program weeks' },
];

const ALLSTAR_BADGES: AwardItem[] = [
  { slug: 'game-changer', title: 'Game Changer', desc: '3× MVPs' },
  { slug: 'the-engine', title: 'The Engine', desc: '3× Hustle' },
  { slug: 'the-glue', title: 'The Glue', desc: '3× Teammate' },
  { slug: 'the-protege', title: 'The Protégé', desc: '3× Student of the Game' },
  { slug: 'practice-fiend', title: 'Practice Fiend', desc: '50 practices' },
  { slug: 'skills-devotee', title: 'Skills Devotee', desc: '50 skills sessions' },
  { slug: 'seasoned-competitor', title: 'Seasoned Competitor', desc: '50 total games' },
  { slug: 'fnh-veteran', title: 'FNH Veteran', desc: '50 total FNH games' },
  { slug: 'first-year-anniversary', title: 'First Year Anniversary', desc: '1 year active' },
  { slug: 'digital-scholar', title: 'Digital Scholar', desc: '6 consecutive online weeks' },
];

const STARTER_BADGES: AwardItem[] = [
  { slug: 'locked-in', title: 'Locked In', desc: '10 consecutive practices' },
  { slug: 'dedicated-grinder', title: 'Dedicated Grinder', desc: '25 practices' },
  { slug: 'skills-seeker', title: 'Skills Seeker', desc: '25 skills sessions' },
  { slug: 'regular-competitor', title: 'Regular Competitor', desc: '25 total games' },
  { slug: 'fnh-regular', title: 'FNH Regular', desc: '25 total FNH games' },
  { slug: 'rsvp-streak', title: 'RSVP Streak', desc: 'On-time RSVPs for 5 straight events' },
  { slug: 'practice-partner', title: 'Practice Partner', desc: 'Every practice in a single week' },
  { slug: 'film-student', title: 'Film Student', desc: '5 online videos' },
];

const STARTER_COACH_AWARDS: AwardItem[] = [
  { slug: 'game-mvp', title: 'Game MVP' },
  { slug: 'hustle-award', title: 'Hustle Award' },
  { slug: 'teammate-award', title: 'Teammate Award' },
  { slug: 'student-of-the-game', title: 'Student of the Game' },
  { slug: 'recruiter', title: 'Recruiter', desc: 'Bring a new player who joins' },
];

const PROSPECT_BADGES: AwardItem[] = [
  { slug: 'the-debut', title: 'The Debut', desc: 'First game played' },
  { slug: 'friday-lights', title: 'Friday Lights', desc: 'First FNH game' },
  { slug: 'practice-rookie', title: 'Practice Rookie', desc: '10 practices' },
  { slug: 'skill-starter', title: 'Skill Starter', desc: '10 skills sessions' },
  { slug: 'game-planner', title: 'Game Planner', desc: 'First RSVP to UYP event' },
  { slug: 'checked-in', title: 'Checked In', desc: 'First UYP event check-in' },
  { slug: 'road-warrior', title: 'Road Warrior', desc: 'Event at a different location' },
  { slug: 'film-rookie', title: 'Film Rookie', desc: 'First online training video' },
  { slug: 'first-ten', title: 'First Ten', desc: '10 total games' },
  { slug: 'fnh-rookie', title: 'FNH Rookie', desc: '10 total FNH games' },
];

// ────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────
export default function TrophiesBadgesPage() {
  const { user } = useAuth();

  const { data } = useQuery<Achievements>({
    queryKey: ['/api/users', (user as any)?.id, 'achievements'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${(user as any)?.id}/achievements`, { credentials: 'include' });
      if (!res.ok) return { trophies: [], badges: [] };
      return res.json();
    },
    enabled: !!(user as any)?.id,
  });

  const earnedTrophies = useMemo(() => new Set((data?.trophies ?? []).map((s) => s.toLowerCase())), [data]);
  const earnedBadges = useMemo(() => new Set((data?.badges ?? []).map((s) => s.toLowerCase())), [data]);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-10">
      {/* TROPHIES */}
      <section className="space-y-6">
        <SectionHeader
          icon={Trophy}
          title="Trophies (End of Season/Year)"
          subtitle="Awarded at the end of the year for outstanding season-long contributions."
          color="#fff7ed"
        />

        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            <h3 className="text-base font-semibold">UYP Legacy Trophies (Yearly)</h3>
          </div>
          <Grid>
            {LEGACY_TROPHIES.map((t) => (
              <Tile
                key={t.slug}
                kind="trophy"
                slug={t.slug}
                title={t.title}
                desc={t.desc}
                achieved={earnedTrophies.has(t.slug)}
                accent="#b45309"
              />
            ))}
          </Grid>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-red-600" />
            <h3 className="text-base font-semibold">Team Trophies (Seasonal)</h3>
          </div>
          <Grid>
            {TEAM_TROPHIES.map((t) => (
              <Tile
                key={t.slug}
                kind="trophy"
                slug={t.slug}
                title={t.title}
                desc={t.desc}
                achieved={earnedTrophies.has(t.slug)}
                accent="#991b1b"
              />
            ))}
          </Grid>
        </div>
      </section>

      <Separator />

      {/* BADGES */}
      <section className="space-y-8">
        <SectionHeader
          icon={Star}
          title="Badges"
          subtitle="Earn badges through consistency, achievements, and coach recognition."
          color="#eef2ff"
        />

        {/* Hall of Fame (Gold) */}
        <Tier
          title="Hall of Fame (Gold) — Legends Only"
          colorClass="from-yellow-100 to-yellow-50"
          icon={<Crown className="h-4 w-4 text-yellow-600" />}
        >
          <Grid>
            {HOF_BADGES.map((b) => (
              <Tile
                key={b.slug}
                kind="badge"
                slug={b.slug}
                title={b.title}
                desc={b.desc}
                achieved={earnedBadges.has(b.slug)}
                accent="#92400e"
              />
            ))}
          </Grid>
        </Tier>

        {/* Superstar (Purple) */}
        <Tier
          title="Superstar (Purple) — Elite Consistency"
          colorClass="from-fuchsia-100 to-fuchsia-50"
          icon={<Sparkles className="h-4 w-4 text-fuchsia-600" />}
        >
          <Grid>
            {SUPERSTAR_BADGES.map((b) => (
              <Tile
                key={b.slug}
                kind="badge"
                slug={b.slug}
                title={b.title}
                desc={b.desc}
                achieved={earnedBadges.has(b.slug)}
                accent="#6b21a8"
              />
            ))}
          </Grid>
        </Tier>

        {/* All-Star (Blue) */}
        <Tier
          title="All-Star (Blue) — Recognition & Milestones"
          colorClass="from-sky-100 to-sky-50"
          icon={<Star className="h-4 w-4 text-sky-600" />}
        >
          <Grid>
            {ALLSTAR_BADGES.map((b) => (
              <Tile
                key={b.slug}
                kind="badge"
                slug={b.slug}
                title={b.title}
                desc={b.desc}
                achieved={earnedBadges.has(b.slug)}
                accent="#0c4a6e"
              />
            ))}
          </Grid>
        </Tier>

        {/* Starter (Green) */}
        <Tier
          title="Starter (Green) — Habit Builders"
          colorClass="from-emerald-100 to-emerald-50"
          icon={<Shield className="h-4 w-4 text-emerald-600" />}
        >
          <Grid>
            {STARTER_BADGES.map((b) => (
              <Tile
                key={b.slug}
                kind="badge"
                slug={b.slug}
                title={b.title}
                desc={b.desc}
                achieved={earnedBadges.has(b.slug)}
                accent="#065f46"
              />
            ))}
          </Grid>

          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <UIBadge variant="secondary" className="bg-emerald-100 text-emerald-700">Coach Awards</UIBadge>
              <span className="text-sm text-gray-600">Awarded by coach at any time</span>
            </div>
            <Grid>
              {STARTER_COACH_AWARDS.map((b) => (
                <Tile
                  key={b.slug}
                  kind="badge"
                  slug={b.slug}
                  title={b.title}
                  desc={b.desc}
                  achieved={earnedBadges.has(b.slug)}
                  accent="#065f46"
                />
              ))}
            </Grid>
          </div>
        </Tier>

        {/* Prospect (Grey) */}
        <Tier
          title="Prospect (Grey) — First Steps"
          colorClass="from-zinc-100 to-zinc-50"
          icon={<Heart className="h-4 w-4 text-zinc-600" />}
        >
          <Grid>
            {PROSPECT_BADGES.map((b) => (
              <Tile
                key={b.slug}
                kind="badge"
                slug={b.slug}
                title={b.title}
                desc={b.desc}
                achieved={earnedBadges.has(b.slug)}
                accent="#1f2937"
              />
            ))}
          </Grid>
        </Tier>
      </section>
    </div>
  );
}

// Tier wrapper with subtle gradient header
function Tier({
  title,
  pill,
  icon,
  colorClass,
  children,
}: {
  title: string;
  pill?: string;
  icon?: React.ReactNode;
  colorClass?: string; // e.g. "from-yellow-100 to-yellow-50"
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className={`bg-gradient-to-r ${colorClass || 'from-gray-100 to-white'} px-5 py-4 rounded-lg`}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
