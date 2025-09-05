
import React from 'react';
import { Link } from 'wouter';

export default function Start() {
  return (
    <div className="container">
      <div className="card">
        <div className="title">Welcome to UYP</div>
        <p className="muted">Choose how to continue:</p>
        <div className="row" style={{gap:16, marginTop:12}}>
          <Link href="/auth/start"><button className="btn">I’m a Parent/Guardian</button></Link>
          <button className="btn secondary" title="Player path out of scope for now">I’m a Player</button>
        </div>
        <div className="muted" style={{marginTop:8}}>By continuing you agree to our Terms & Privacy.</div>
      </div>
    </div>
  );
}
