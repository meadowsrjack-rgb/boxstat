
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';

export default function AdminJoinRequests() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<'pending'|'approved'|'rejected'>('pending');

  const { data } = useQuery({
    queryKey: ['admin','join-requests', status],
    queryFn: async () => (await fetch('/api/admin/join-requests?status='+status)).json()
  });

  const approve = useMutation({
    mutationFn: async (id: number) => (await fetch('/api/admin/join-requests/'+id+'/approve', { method:'POST' })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','join-requests'] })
  });
  const reject = useMutation({
    mutationFn: async (id: number) => (await fetch('/api/admin/join-requests/'+id+'/reject', { method:'POST' })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','join-requests'] })
  });

  return (
    <div className="p-4 space-y-4 max-w-3xl">
      <div className="flex gap-2">
        {(['pending','approved','rejected'] as const).map(s => (
          <Button key={s} variant={status===s?'default':'outline'} onClick={()=>setStatus(s)}>{s}</Button>
        ))}
      </div>
      <div className="grid gap-3">
        {data?.requests?.map((r: any) => (
          <Card key={r.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <Avatar className="w-10 h-10">
                {r.profile_image_url ? <AvatarImage src={r.profile_image_url}/> : <AvatarFallback>{(r.first_name||'?')[0]}{(r.last_name||'?')[0]}</AvatarFallback>}
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">{r.first_name} {r.last_name}</div>
                <div className="text-sm opacity-70">Requested team: {r.team_name}</div>
              </div>
              {status==='pending' && (
                <div className="flex gap-2">
                  <Button onClick={()=>approve.mutate(r.id)} disabled={approve.isPending}>Approve</Button>
                  <Button variant="outline" onClick={()=>reject.mutate(r.id)} disabled={reject.isPending}>Reject</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {!data?.requests?.length && <div className="opacity-70">No {status} requests.</div>}
      </div>
    </div>
  );
}
