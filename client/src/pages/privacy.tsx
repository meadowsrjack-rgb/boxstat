
'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';

type Level = 'public' | 'team-only' | 'private';
type Settings = {
  searchable?: boolean;
  fields?: { [k: string]: Level }
};

const FIELDS: { key: string, label: string, default: Level }[] = [
  { key: 'name', label: 'Name', default: 'public' },
  { key: 'image', label: 'Profile photo', default: 'public' },
  { key: 'profileInfo', label: 'Profile info', default: 'team-only' },
  { key: 'badges', label: 'Badges', default: 'public' },
  { key: 'trophies', label: 'Trophies', default: 'public' },
  { key: 'skills', label: 'Skills', default: 'team-only' },
];

export default function PrivacySettingsPage() {
  const { data } = useQuery({
    queryKey: ['privacy'],
    queryFn: async () => (await fetch('/api/privacy')).json()
  });

  const [settings, setSettings] = useState<Settings>({ searchable: true, fields: {} });
  useEffect(() => {
    if (data?.settings) setSettings(data.settings);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      return res.json();
    }
  });

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Privacy</h1>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Allow my profile to appear in search</Label>
            <Switch checked={settings.searchable !== false} onCheckedChange={(v) => setSettings(s => ({...s, searchable: v}))} />
          </div>

          {FIELDS.map(f => (
            <div key={f.key}>
              <div className="font-medium">{f.label}</div>
              <div className="text-sm opacity-70 mb-2">Who can see this?</div>
              <div className="flex gap-2">
                {(['public','team-only','private'] as Level[]).map(level => (
                  <Button key={level}
                    variant={(settings.fields?.[f.key] || f.default) === level ? 'default' : 'outline'}
                    onClick={() => setSettings(s => ({...s, fields: { ...(s.fields||{}), [f.key]: level }}))}>
                    {level}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
