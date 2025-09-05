
import React from 'react';
import AddPlayerModal from '../components/AddPlayerModal';
import BillingPlanPicker from '../components/BillingPlanPicker';

export default function Onboarding() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="container">
      <div className="card">
        <div className="title">Welcome — let’s set up your family</div>
        <ol>
          <li>1) Add your player(s)</li>
          <li>2) Choose a plan</li>
          <li>3) Finish</li>
        </ol>
        <div style={{marginTop:12}}>
          <button className="btn" onClick={()=>setOpen(true)}>Add Player</button>
        </div>
      </div>

      <BillingPlanPicker />

      <AddPlayerModal open={open} onClose={()=>setOpen(false)} />
    </div>
  );
}
