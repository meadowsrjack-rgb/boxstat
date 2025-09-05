
import React from 'react';
import { useLocation } from 'wouter';
import { useSearchParams } from '../util/search';

export default function AuthVerify() {
  const [params] = useSearchParams();
  const tokenParam = params.get('token') || '';
  const emailParam = params.get('email') || '';
  const [email, setEmail] = React.useState(emailParam);
  const [code, setCode] = React.useState(tokenParam);
  const [, setLoc] = useLocation();

  const verify = async () => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8787';
    const resp = await fetch(base + '/api/auth/verify', {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, codeOrToken: code })
    });
    if (resp.ok) setLoc('/onboarding');
    else alert('Invalid/expired code');
  };

  return (
    <div className="container">
      <div className="card">
        <div className="title">Enter your code</div>
        <div className="grid">
          <div>
            <label>Email</label>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label>Code or token</label>
            <input className="input" value={code} onChange={e => setCode(e.target.value)} />
          </div>
        </div>
        <div style={{marginTop:12}}><button className="btn" onClick={verify}>Verify & Continue</button></div>
      </div>
    </div>
  );
}
