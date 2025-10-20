
'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useLocation } from 'wouter';

type PlayerCard = {
  id: string;
  name: string | null;
  profileImageUrl: string | null;
  team: { id: number | null, name: string | null };
  profileVisible: boolean;
  badgesVisible: boolean;
  trophiesVisible: boolean;
  skillsVisible: boolean;
};

type TeamCard = {
  id: number;
  name: string;
  age_group: string;
  program?: string;
  color: string;
  roster_count: number;
  coach_name: string | null;
};

export default function Teams() {
  const [tab, setTab] = useState<'players' | 'teams'>('players');
  const [q, setQ] = useState('');
  const { data: players = { players: [] as PlayerCard[] } } = useQuery({
    queryKey: ['search', 'players', q],
    queryFn: async () => {
      const url = '/api/search/players?q=' + encodeURIComponent(q);
      const res = await fetch(url);
      return res.json();
    },
    enabled: q.trim().length > 0
  });
  const { data: teams = { teams: [] as TeamCard[] } } = useQuery({
    queryKey: ['search', 'teams', q],
    queryFn: async () => {
      const url = '/api/search/teams?q=' + encodeURIComponent(q);
      const res = await fetch(url);
      return res.json();
    },
    enabled: q.trim().length > 0
  });

  const [, navigate] = useLocation();

  const requestJoin = useMutation({
    mutationFn: async (teamId: number) => {
      const res = await fetch('/api/search/teams/' + teamId + '/request-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '' })
      });
      return res.json();
    }
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={tab === 'players' ? 'Search players' : 'Search teams'}
            className="pl-8"
          />
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 opacity-60" />
        </div>
        <div className="flex rounded-md overflow-hidden border">
          <Button variant={tab==='players'?'default':'ghost'} onClick={() => setTab('players')}>Players</Button>
          <Button variant={tab==='teams'?'default':'ghost'} onClick={() => setTab('teams')}>Teams</Button>
        </div>
      </div>

      {tab === 'players' && (
        <div className="space-y-4">
          {q.trim().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Start typing to search for players...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {players.players.map((p: PlayerCard) => (
            <Card key={p.id} className="hover:shadow-md transition">
              <CardContent className="p-3 flex gap-3">
                <Avatar className="w-12 h-12">
                  {p.profileImageUrl ? <AvatarImage src={p.profileImageUrl}/> : <AvatarFallback>{(p.name||'?').slice(0,2).toUpperCase()}</AvatarFallback>}
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-1">
                    {p.name || <span className="opacity-60">Hidden <Lock className="w-3 h-3"/></span>}
                  </div>
                  <div className="text-sm opacity-70">{p.team?.name || 'No team'}</div>
                  <div className="mt-2 text-xs flex gap-2 opacity-80">
                    <span>{p.badgesVisible ? '🏅 badges' : '🔒 badges'}</span>
                    <span>{p.trophiesVisible ? '🏆 trophies' : '🔒 trophies'}</span>
                    <span>{p.skillsVisible ? '📊 skills' : '🔒 skills'}</span>
                  </div>
                </div>
                <Button variant="outline" onClick={() => navigate(`/player/${p.id}`)}>View</Button>
              </CardContent>
            </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'teams' && (
        <div className="space-y-4">
          {q.trim().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Start typing to search for teams...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {teams.teams.map((t: TeamCard) => (
            <Card key={t.id} className="hover:shadow-md transition">
              <CardContent className="p-3">
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm opacity-70">{t.age_group}</div>
                <div className="text-xs opacity-70 mt-1">{t.coach_name ? `Coach: ${t.coach_name}` : 'Coach TBD'}</div>
                <div className="text-xs opacity-70">Roster: {t.roster_count}</div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" onClick={() => navigate(`/team/${t.id}`)}>Open</Button>
                  <Button onClick={() => requestJoin.mutate(t.id)} disabled={requestJoin.isPending}>
                    {requestJoin.isPending ? 'Requesting…' : 'Request to join'}
                  </Button>
                </div>
              </CardContent>
            </Card>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
