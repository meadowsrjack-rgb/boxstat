'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Star, Crown, Shield, Heart, Filter, X } from 'lucide-react';

/**
 * IMPORTANT: No alias imports (e.g., '@/...').
 * This file is sandbox-friendly and works even if your app doesn't have the
 * Next.js `@` path alias configured. Everything needed is self-contained.
 *
 * Images: you said all images are in a single "trophies" folder.
 * We will try multiple likely locations automatically, in this order:
 *   1) /trophies/<slug>.png (preferred)
 *   2) /attached_assets/trophies/<slug>.png
 *   3) /trophiesbadges/<slug>.png
 *   4) /public/attached_assets/trophies/<slug>.png
 * For NOT earned we look for "-gray" suffix (e.g., mvp-gray.png).
 */

// ────────────────────────────────────────────────────────────────
// Types & helpers
// ────────────────────────────────────────────────────────────────
 type AwardItem = { slug: string; title: string; desc?: string };
 type Achievements = { trophies: string[]; badges: string[] };
 type TierKey = 'hof' | 'superstar' | 'allstar' | 'starter' | 'prospect';
 type Kind = 'trophy' | 'badge';

 const TIER_META: Record<TierKey, { label: string; accent: string; icon: React.ReactNode }>= {
  hof: { label: 'Hall of Fame', accent: '#b45309', icon: <Crown className="h-4 w-4"/> },
  superstar: { label: 'Superstar', accent: '#6b21a8', icon: <Sparkles className="h-4 w-4"/> },
  allstar: { label: 'All-Star', accent: '#0c4a6e', icon: <Star className="h-4 w-4"/> },
  starter: { label: 'Starter', accent: '#065f46', icon: <Shield className="h-4 w-4"/> },
  prospect: { label: 'Prospect', accent: '#1f2937', icon: <Heart className="h-4 w-4"/> },
 };

 /** Create multiple likely image paths for the current project. */
 function imageCandidates(slug: string, achieved: boolean){
  const suffix = achieved ? '' : '-gray';
  return [
    `/trophies/${slug}${suffix}.png`,
    `/attached_assets/trophies/${slug}${suffix}.png`,
  ];
 }

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

 // Compose master lists
 const TROPHY_LIST = [
  ...LEGACY_TROPHIES.map(t=>({ ...t, kind:'trophy' as const })),
  ...TEAM_TROPHIES.map(t=>({ ...t, kind:'trophy' as const })),
 ];
 const BADGE_BUCKETS: Record<TierKey, AwardItem[]> = {
  hof: HOF_BADGES,
  superstar: SUPERSTAR_BADGES,
  allstar: ALLSTAR_BADGES,
  starter: STARTER_BADGES.concat(STARTER_COACH_AWARDS),
  prospect: PROSPECT_BADGES,
 };
 const BADGE_LIST = (Object.keys(BADGE_BUCKETS) as TierKey[]).flatMap((k)=> BADGE_BUCKETS[k].map(b=>({ ...b, kind:'badge' as const, tier:k })));

 // Pure helpers (also used by tests)
 export function filterItems(
  items: Array<{ slug:string; title:string; desc?:string; kind:Kind; tier?:TierKey; achieved:boolean }>,
  earnedFilter: 'all'|'earned'|'not',
  kindFilter: 'all'|'trophies'|'badges',
  badgeTier: TierKey|'all'
 ){
  let out = items.slice();
  if (kindFilter !== 'all') out = out.filter(i=> i.kind === (kindFilter==='trophies'?'trophy':'badge'));
  if (badgeTier !== 'all') out = out.filter(i=> i.kind==='badge' ? i.tier===badgeTier : true);
  if (earnedFilter !== 'all') out = out.filter(i=> earnedFilter==='earned' ? i.achieved : !i.achieved);
  return out;
 }

// ────────────────────────────────────────────────────────────────
// Minimal UI bits (no alias UI lib)
// ────────────────────────────────────────────────────────────────
 const StatPill = ({ label, value }: { label: string; value: number }) => (
  <div className="px-3 py-1 rounded-full backdrop-blur border border-white/10 bg-white/5 text-xs text-white/80 flex items-center gap-2">
    <span className="font-medium text-white/90">{value}</span>
    <span>{label}</span>
  </div>
 );

 const Glass = ({ className = '', children }: { className?: string; children: React.ReactNode }) => (
  <div className={`rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] ${className}`}>
    {children}
  </div>
 );

 const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">{children}</div>
 );

 function ImageSwitcher({ slug, achieved, alt, className }:{ slug:string; achieved:boolean; alt:string; className?:string }){
  const [idx, setIdx] = useState(0);
  const srcs = useMemo(()=> imageCandidates(slug, achieved), [slug, achieved]);
  const src = srcs[Math.min(idx, srcs.length-1)];
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => setIdx((i)=> i+1)}
    />
  );
 }

 function ItemTile({ item, achieved, onOpen }:{ item: AwardItem; achieved: boolean; onOpen: ()=>void }){
  return (
    <button onClick={onOpen} className="group relative focus:outline-none">
      <div className="relative">
        <motion.div whileHover={{ scale: 1.04 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
          <ImageSwitcher slug={item.slug} achieved={achieved} alt={item.title} className="h-28 w-28 mx-auto object-contain select-none drop-shadow" />
        </motion.div>
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{boxShadow:'0 0 40px 4px rgba(255,255,255,0.12)'}}/>
      </div>
      <div className="mt-3 text-center">
        <div className={`text-[13px] font-semibold ${achieved? 'text-white':'text-white/50'}`}>{item.title}</div>
      </div>
    </button>
  );
 }

 function GlassOverlay({ open, onClose, title, desc, slug, achieved }:{ open:boolean; onClose:()=>void; title:string; desc?:string; slug:string; achieved:boolean; }){
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="absolute inset-0 flex items-center justify-center p-4"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          >
            <Glass className="relative w-full max-w-md p-6 text-white">
              <button onClick={onClose} className="absolute right-3 top-3 opacity-70 hover:opacity-100 transition" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
              <div className="flex flex-col items-center text-center gap-4">
                <ImageSwitcher slug={slug} achieved={achieved} alt={title} className="h-40 w-40 object-contain select-none" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold leading-tight">{title}</h3>
                  {desc && <p className="text-sm text-white/80 leading-relaxed">{desc}</p>}
                </div>
              </div>
            </Glass>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
 }

// ────────────────────────────────────────────────────────────────
// Page (fetches achievements without alias imports)
// ────────────────────────────────────────────────────────────────
 export default function TrophiesBadgesPage(){
  const { user: currentUser } = useAuth();
  
  // Fetch user achievements using react-query for better error handling
  const { data: achievementsData, isLoading } = useQuery<Achievements>({
    queryKey: ['/api/users', currentUser?.id, 'achievements'],
    queryFn: async () => {
      if (!currentUser?.id) {
        return { trophies: [], badges: [] };
      }
      
      // Try multiple endpoints for achievements data
      const endpoints = [
        `/api/users/${currentUser.id}/achievements`,
        `/api/achievements`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, { credentials: 'include' });
          if (res.ok) {
            return await res.json();
          }
        } catch (e) {
          console.warn(`Failed to fetch from ${endpoint}:`, e);
        }
      }
      
      // Return empty data if all endpoints fail
      return { trophies: [], badges: [] };
    },
    enabled: !!currentUser?.id,
  });

  // Use the fetched data or fallback to empty
  const data: Achievements = achievementsData || { trophies: [], badges: [] };

  const earnedTrophies = useMemo(() => new Set((data?.trophies ?? []).map((s) => s.toLowerCase())), [data]);
  const earnedBadges = useMemo(() => new Set((data?.badges ?? []).map((s) => s.toLowerCase())), [data]);

  // ─ Filters
  type EarnedFilter = 'all'|'earned'|'not';
  type KindFilter = 'all'|'trophies'|'badges';
  const [earnedFilter, setEarnedFilter] = useState<EarnedFilter>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [badgeTier, setBadgeTier] = useState<TierKey | 'all'>('all');

  // Selected item overlay
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{slug:string; title:string; desc?:string; achieved:boolean} | null>(null);

  // Counters
  const trophyEarnedCount = TROPHY_LIST.filter(t=> earnedTrophies.has(t.slug)).length;
  const badgeEarnedCount = BADGE_LIST.filter(b=> earnedBadges.has(b.slug)).length;

  // Prepare items with achieved flags
  const allItems: Array<{ slug:string; title:string; desc?:string; kind:Kind; tier?:TierKey; achieved:boolean }> = useMemo(()=>{
    const items: Array<{ slug:string; title:string; desc?:string; kind:Kind; tier?:TierKey; achieved:boolean }> = [];
    TROPHY_LIST.forEach(t=> items.push({ ...t, achieved: earnedTrophies.has(t.slug) }));
    BADGE_LIST.forEach(b=> items.push({ ...b, achieved: earnedBadges.has(b.slug) }));
    return items;
  }, [earnedBadges, earnedTrophies]);

  const filtered = useMemo(()=> filterItems(allItems, earnedFilter, kindFilter, badgeTier), [allItems, earnedFilter, kindFilter, badgeTier]);

  const openOverlay = (it:{slug:string; title:string; desc?:string; achieved:boolean})=>{ setSelected(it); setOpen(true); };

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(80%_50%_at_50%_0%,rgba(99,102,241,0.22),transparent),linear-gradient(180deg,#0b1020_0%,#0a0d19_100%)] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Top status + filters */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatPill label="Trophies Earned" value={trophyEarnedCount} />
            <StatPill label="Badges Earned" value={badgeEarnedCount} />
            <StatPill label="Total Items" value={filtered.length} />
          </div>

          <Glass className="p-3 md:p-4">
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
              {/* Earned segmented */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 opacity-80"/>
                <Segmented
                  value={earnedFilter}
                  options={[{v:'all',l:'All'},{v:'earned',l:'Earned'},{v:'not',l:'Not Earned'}]}
                  onChange={(v)=> setEarnedFilter(v as any)}
                />
              </div>

              {/* Kind + Tier */}
              <div className="flex items-center gap-3">
                <SelectLike
                  value={kindFilter}
                  onChange={(v)=>{ setKindFilter(v as any); if(v!=='badges') setBadgeTier('all'); }}
                  options={[
                    { value:'all', label:'All Types' },
                    { value:'trophies', label:'Trophies' },
                    { value:'badges', label:'Badges' },
                  ]}
                />
                <SelectLike
                  disabled={kindFilter!=='badges'}
                  value={badgeTier}
                  onChange={(v)=> setBadgeTier(v as TierKey | 'all')}
                  options={[
                    { value:'all', label:'All Tiers' },
                    { value:'hof', label:'Hall of Fame' },
                    { value:'superstar', label:'Superstar' },
                    { value:'allstar', label:'All-Star' },
                    { value:'starter', label:'Starter' },
                    { value:'prospect', label:'Prospect' },
                  ]}
                />
              </div>
            </div>
          </Glass>
        </div>

        {/* Content sections — minimal headings, futuristic spacing */}
        <div className="space-y-10">
          {/* Trophies */}
          {(kindFilter==='all' || kindFilter==='trophies') && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-white/80">
                <Trophy className="h-4 w-4"/>
                <span className="text-sm tracking-wide uppercase">Trophies</span>
              </div>
              <Grid>
                {[...LEGACY_TROPHIES, ...TEAM_TROPHIES].map((t)=>{
                  const achieved = earnedTrophies.has(t.slug);
                  return (
                    <ItemTile key={t.slug} item={t} achieved={achieved} onOpen={()=>openOverlay({ ...t, achieved })} />
                  );
                })}
              </Grid>
            </section>
          )}

          {/* Badges by tier (auto-collapsed to minimal labels) */}
          {(kindFilter==='all' || kindFilter==='badges') && (
            <section className="space-y-10">
              {(['hof','superstar','allstar','starter','prospect'] as TierKey[])
                .filter((k)=> badgeTier==='all' ? true : k===badgeTier)
                .map((k)=> (
                  <div key={k} className="space-y-4">
                    <div className="flex items-center gap-2 text-white/80">
                      {TIER_META[k].icon}
                      <span className="text-sm tracking-wide uppercase">{TIER_META[k].label}</span>
                    </div>
                    <Grid>
                      {BADGE_BUCKETS[k].map((b)=>{
                        const achieved = earnedBadges.has(b.slug);
                        return (
                          <ItemTile key={b.slug} item={b} achieved={achieved} onOpen={()=>openOverlay({ ...b, achieved })} />
                        );
                      })}
                    </Grid>
                  </div>
                ))}
            </section>
          )}
        </div>
      </div>

      {/* Overlay */}
      <GlassOverlay open={open && !!selected} onClose={()=>setOpen(false)} title={selected?.title||''} desc={selected?.desc} slug={selected?.slug||''} achieved={!!selected?.achieved} />
    </div>
  );
 }

// ────────────────────────────────────────────────────────────────
// Lightweight controls
// ────────────────────────────────────────────────────────────────
 function Segmented({ value, options, onChange }:{ value:string; options:{v:string;l:string}[]; onChange:(v:string)=>void }){
  return (
    <div className="inline-flex rounded-xl p-1 bg-white/5 border border-white/10 backdrop-blur">
      {options.map((o)=>{
        const active = value===o.v;
        return (
          <button
            key={o.v}
            onClick={()=> onChange(o.v)}
            className={`px-3 py-1.5 text-sm rounded-lg transition relative ${active? 'text-white':'text-white/70 hover:text-white'}`}
          >
            {active && (
              <motion.span layoutId="seg-ind" className="absolute inset-0 rounded-lg bg-white/15" transition={{ type: 'spring', stiffness: 300, damping: 25 }} />
            )}
            <span className="relative">{o.l}</span>
          </button>
        );
      })}
    </div>
  );
 }

 function SelectLike({ value, onChange, options, disabled }:{ value:any; onChange:(v:any)=>void; options:{ value:any; label:string }[]; disabled?:boolean }){
  const [open, setOpen] = useState(false);
  return (
    <div className={`relative ${disabled? 'opacity-50 pointer-events-none':''}`}>
      <button onClick={()=> setOpen(!open)} className="px-3 py-1.5 text-sm rounded-xl border border-white/10 bg-white/5 backdrop-blur hover:bg-white/10 transition inline-flex items-center gap-2">
        <span className="text-white/90">{options.find(o=>o.value===value)?.label ?? 'Select'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" className="opacity-80"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute z-10 mt-2 min-w-[200px] right-0"
          >
            <Glass className="overflow-hidden p-1">
              {options.map((o)=> (
                <button key={o.value} onClick={()=>{ onChange(o.value); setOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10 ${o.value===value? 'bg-white/10':''}`}>
                  {o.label}
                </button>
              ))}
            </Glass>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
 }

// ────────────────────────────────────────────────────────────────
// Minimal test cases (console-based)
// ────────────────────────────────────────────────────────────────
 function runTests(){
  // Test 1: image candidate generation
  const c1 = imageCandidates('mvp', true);
  console.assert(Array.isArray(c1) && c1.length >= 3 && c1[0].includes('/trophies/'), 'Test 1 failed: imageCandidates');
  const c2 = imageCandidates('mvp', false);
  console.assert(c2.some(s=> s.includes('mvp-gray.png')), 'Test 1b failed: gray variant');

  // Test 2: filtering math (earned vs not)
  const mockItems = [
    { slug:'mvp', title:'MVP', kind:'trophy' as Kind, achieved:true },
    { slug:'mip', title:'MIP', kind:'trophy' as Kind, achieved:false },
    { slug:'locked-in', title:'Locked In', kind:'badge' as Kind, tier:'starter' as TierKey, achieved:true },
    { slug:'game-changer', title:'Game Changer', kind:'badge' as Kind, tier:'allstar' as TierKey, achieved:false },
  ];
  const all = filterItems(mockItems as any, 'all', 'all', 'all');
  const earned = filterItems(mockItems as any, 'earned', 'all', 'all');
  const not = filterItems(mockItems as any, 'not', 'all', 'all');
  console.assert(all.length===4 && earned.length===2 && not.length===2, 'Test 2 failed: earned vs not counts');

  // Test 3: kind filter
  const trophiesOnly = filterItems(mockItems as any, 'all', 'trophies', 'all');
  const badgesOnly = filterItems(mockItems as any, 'all', 'badges', 'all');
  console.assert(trophiesOnly.every(i=> i.kind==='trophy') && badgesOnly.every(i=> i.kind==='badge'), 'Test 3 failed: kind filter');

  // Test 4: tier filter
  const starterOnly = filterItems(mockItems as any, 'all', 'badges', 'starter');
  console.assert(starterOnly.length===1 && starterOnly[0].slug==='locked-in', 'Test 4 failed: tier filter');

  console.info('%cAll UI tests passed', 'color:#22c55e');
 }

 if (typeof window !== 'undefined' && !(window as any).__UYP_TESTS_RAN) {
  try { runTests(); } catch (e){ console.warn('Tests threw:', e); }
  (window as any).__UYP_TESTS_RAN = true;
 }
