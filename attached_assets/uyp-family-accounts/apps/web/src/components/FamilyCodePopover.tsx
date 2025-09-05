
import React from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export default function FamilyCodePopover() {
  const [kind, setKind] = React.useState<'guardian'|'follower'>('guardian');
  const [data, setData] = React.useState<any>(null);

  const generate = async () => {
    const resp = await fetch(API + '/api/player/family-code', {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ kind })
    });
    const j = await resp.json();
    setData(j);
  };

  return (
    <div className="card">
      <div className="title">Generate Family Code</div>
      <div className="row">
        <select className="input" onChange={e=>setKind(e.target.value as any)} value={kind}>
          <option value="guardian">Guardian</option>
          <option value="follower">Follower</option>
        </select>
        <button className="btn" onClick={generate}>Generate</button>
      </div>
      {data && (
        <div style={{marginTop:12}}>
          <div><b>Code:</b> {data.code}</div>
          {data.qrPngDataUrl && <img className="qr" src={data.qrPngDataUrl} />}
          <div className="muted">Expires: {data.expiresAt}</div>
        </div>
      )}
    </div>
  );
}
