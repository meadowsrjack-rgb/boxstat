
import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

const API = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export default function AddPlayerModal({ open, onClose }: Props) {
  const [tab, setTab] = React.useState<'code'|'invite'|'create'>('code');
  const [code, setCode] = React.useState('');
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [create, setCreate] = React.useState({ firstName:'', lastName:'', dob:'', teamName:'' });
  const [result, setResult] = React.useState<any>(null);

  if (!open) return null;

  const redeem = async () => {
    const resp = await fetch(API + '/api/family/redeem-code', {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code })
    });
    const j = await resp.json();
    setResult(j);
  };

  const invite = async () => {
    const resp = await fetch(API + '/api/family/invite', {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ playerEmailOrPhone: inviteEmail, role:'guardian', playerId: result?.player?.id || 1 })
    });
    setResult(await resp.json());
  };

  const createPlayer = async () => {
    const resp = await fetch(API + '/api/family/create-player', {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify(create)
    });
    const j = await resp.json();
    setResult(j);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="row" style={{justifyContent:'space-between'}}>
          <div className="title">Add Player</div>
          <button className="btn secondary" onClick={onClose}>Close</button>
        </div>
        <div className="tabs" style={{marginTop:12}}>
          <div className={`tab ${tab==='code'?'active':''}`} onClick={()=>setTab('code')}>Enter Code / Scan</div>
          <div className={`tab ${tab==='invite'?'active':''}`} onClick={()=>setTab('invite')}>Invite</div>
          <div className={`tab ${tab==='create'?'active':''}`} onClick={()=>setTab('create')}>Create New</div>
        </div>

        {tab==='code' && (
          <div className="card">
            <label>6–8 character Family Code</label>
            <input className="input" placeholder="ABC-123" value={code} onChange={e=>setCode(e.target.value)} />
            <div style={{marginTop:12}}><button className="btn" onClick={redeem}>Link Player</button></div>
          </div>
        )}

        {tab==='invite' && (
          <div className="card">
            <label>Player Email or Phone</label>
            <input className="input" placeholder="email or phone" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} />
            <div style={{marginTop:12}}><button className="btn" onClick={invite}>Send Invite</button></div>
          </div>
        )}

        {tab==='create' && (
          <div className="card">
            <div className="grid">
              <div><label>First name</label><input className="input" value={create.firstName} onChange={e=>setCreate({...create, firstName:e.target.value})} /></div>
              <div><label>Last name</label><input className="input" value={create.lastName} onChange={e=>setCreate({...create, lastName:e.target.value})} /></div>
              <div><label>Date of birth</label><input className="input" type="date" value={create.dob} onChange={e=>setCreate({...create, dob:e.target.value})} /></div>
              <div><label>Team (optional)</label><input className="input" value={create.teamName} onChange={e=>setCreate({...create, teamName:e.target.value})} /></div>
            </div>
            <div style={{marginTop:12}}><button className="btn" onClick={createPlayer}>Create Player</button></div>
          </div>
        )}

        {result && (
          <div className="card">
            <div><b>Result</b></div>
            <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
