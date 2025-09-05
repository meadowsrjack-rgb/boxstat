
import React from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export default function BillingPlanPicker() {
  const [loading, setLoading] = React.useState(false);
  const [priceId, setPriceId] = React.useState('');

  const checkout = async () => {
    setLoading(true);
    try {
      const resp = await fetch(API + '/api/stripe/checkout', {
        method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ priceId: priceId || 'test_price', mode:'subscription' })
      });
      const j = await resp.json();
      if (j.url) window.location.href = j.url;
      else alert(j.error || 'Stripe not configured');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="title">Choose a Plan</div>
      <p className="muted">Use your Stripe price IDs in env to enable real checkout.</p>
      <div className="grid">
        <div>
          <label>Stripe Price ID</label>
          <input className="input" placeholder="price_xxx" value={priceId} onChange={e=>setPriceId(e.target.value)} />
        </div>
        <div style={{display:'flex', alignItems:'end'}}>
          <button className="btn" onClick={checkout} disabled={loading}>{loading?'Starting…':'Start Subscription'}</button>
        </div>
      </div>
    </div>
  );
}
