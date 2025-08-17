'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

import { Shield, Globe, MapPin, ShieldCheck, UserX } from 'lucide-react';

type PrivacyPrefs = {
  publicHeight: boolean;
  publicLocation: boolean;
  allowGpsCheckin: boolean;
  allowCameraMic: boolean;
  shareAnalytics: boolean;
  coachCanViewProgress: boolean;
};

const DEFAULTS: PrivacyPrefs = {
  publicHeight: true,
  publicLocation: true,
  allowGpsCheckin: true,
  allowCameraMic: true,
  shareAnalytics: true,
  coachCanViewProgress: true,
};

const BRAND = '#d82428';

function Header({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: any;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: '#fee2e2' }}>
        <Icon className="h-5 w-5" style={{ color: BRAND }} />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

function Row({
  label,
  description,
  checked,
  onCheckedChange,
  icon: Icon,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  icon?: any;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        {Icon ? <Icon className="h-5 w-5 mt-0.5 text-gray-600" /> : null}
        <div>
          <div className="text-sm font-medium text-gray-900">{label}</div>
          {description ? <div className="text-xs text-gray-500">{description}</div> : null}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

export default function PrivacySettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const userId = (user as any)?.id;

  // Load current prefs
  const { data, isLoading, isError } = useQuery({
    queryKey: ['/api/privacy', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(`/api/privacy/${userId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch privacy prefs');
      return (await res.json()) as Partial<PrivacyPrefs>;
    },
  });

  // Local editable draft
  const [draft, setDraft] = useState<PrivacyPrefs>(DEFAULTS);
  useEffect(() => {
    if (data) setDraft({ ...DEFAULTS, ...data });
  }, [data]);

  const update = useMutation({
    mutationFn: async (payload: PrivacyPrefs) => {
      const res = await fetch(`/api/privacy/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update privacy');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Privacy updated' });
      qc.invalidateQueries({ queryKey: ['/api/privacy', userId] });
    },
    onError: (e) =>
      toast({ title: 'Could not update', description: String(e), variant: 'destructive' }),
  });

  const resetToDefaults = () => setDraft(DEFAULTS);

  return (
    <div className="space-y-6">
      <Header
        icon={Shield}
        title="Privacy & Permissions"
        subtitle="Control what’s visible and which device features the app can use."
      />

      {/* Visibility */}
      <section className="rounded-xl">
        <div className="text-sm font-semibold text-gray-800 px-1 mb-2">Visibility</div>
        <div className="space-y-2">
          <Row
            icon={Globe}
            label="Show height publicly"
            checked={draft.publicHeight}
            onCheckedChange={(v) => setDraft((s) => ({ ...s, publicHeight: v }))}
          />
          <Row
            icon={Globe}
            label="Show city/location publicly"
            checked={draft.publicLocation}
            onCheckedChange={(v) => setDraft((s) => ({ ...s, publicLocation: v }))}
          />
        </div>
      </section>

      <Separator />

      {/* Device Permissions */}
      <section className="rounded-xl">
        <div className="text-sm font-semibold text-gray-800 px-1 mb-2">Device permissions</div>
        <div className="space-y-2">
          <Row
            icon={MapPin}
            label="Allow GPS-based on-site check-in"
            description="Used to verify presence for practices and events."
            checked={draft.allowGpsCheckin}
            onCheckedChange={(v) => setDraft((s) => ({ ...s, allowGpsCheckin: v }))}
          />
          <Row
            icon={ShieldCheck}
            label="Allow camera & microphone for uploads"
            description="Needed for video drills and voice notes."
            checked={draft.allowCameraMic}
            onCheckedChange={(v) => setDraft((s) => ({ ...s, allowCameraMic: v }))}
          />
        </div>
      </section>

      <Separator />

      {/* Data & Sharing */}
      <section className="rounded-xl">
        <div className="text-sm font-semibold text-gray-800 px-1 mb-2">Data & sharing</div>
        <div className="space-y-2">
          <Row
            icon={ShieldCheck}
            label="Share anonymized usage analytics"
            description="Helps us improve features. No personal data is shared."
            checked={draft.shareAnalytics}
            onCheckedChange={(v) => setDraft((s) => ({ ...s, shareAnalytics: v }))}
          />
          <Row
            icon={ShieldCheck}
            label="Allow coach to view progress"
            description="Coaches can see drill submissions and attendance."
            checked={draft.coachCanViewProgress}
            onCheckedChange={(v) => setDraft((s) => ({ ...s, coachCanViewProgress: v }))}
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => update.mutate(draft)} disabled={update.isPending || isLoading}>
          {update.isPending ? 'Saving…' : 'Save Preferences'}
        </Button>
        <Button variant="outline" onClick={resetToDefaults} disabled={update.isPending || isLoading}>
          Reset to defaults
        </Button>
      </div>

      {/* Blocked users (simple, borderless) */}
      <section className="rounded-xl">
        <div className="text-sm font-semibold text-gray-800 px-1 mb-2">Blocked users</div>
        <div className="flex items-center gap-2 text-sm text-gray-500 px-1">
          <UserX className="h-4 w-4" />
          No blocked users.
        </div>
      </section>

      {/* Loading/Error states */}
      {isLoading && (
        <div className="text-xs text-gray-500">Loading your privacy settings…</div>
      )}
      {isError && (
        <div className="text-xs text-red-600">
          Couldn’t load your current settings. You can still adjust and save.
        </div>
      )}
    </div>
  );
}
