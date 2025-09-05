
import React from 'react';

export default function AuthStart() {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);

  const send = async () => {
    const resp = await fetch(import.meta.env.VITE_API_URL || 'http://localhost:8787' + '/api/auth/magic-link', {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email})
    });
    if (resp.ok) setSent(true);
  };

  return (
    <div className="container">
      <div className="card">
        <div className="title">Sign in with your email</div>
        {!sent ? (
          <>
            <input className="input" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            <div style={{marginTop:12}}><button className="btn" onClick={send}>Send me a sign-in link</button></div>
            <p className="muted" style={{marginTop:8}}>We’ll email you a one-time code and a link.</p>
          </>
        ) : (
          <p>Check your email for the code or link. Keep this tab open.</p>
        )}
      </div>
    </div>
  );
}
