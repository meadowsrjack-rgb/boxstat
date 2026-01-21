import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import logo from "@assets/dark_1768878462814.png";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    // The "Canvas": Completely fixed and unmovable
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      overflow: 'hidden', 
      backgroundColor: '#000000' 
    }}>
      
      {/* LAYER 1: Dark Blue Gradient Background (matches login page) */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
      
      {/* Subtle red glow at bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-64 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center bottom, rgba(220, 38, 38, 0.15) 0%, transparent 70%)',
        }}
      />

      {/* LAYER 2: The UI Layer */}
      <div 
        className="animate-fade-in"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          display: 'grid',
          gridTemplateRows: '1fr auto 1fr auto',
          alignItems: 'center',
          justifyItems: 'center',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          touchAction: 'none',
        }}
      >
        {/* Row 1: Spacer */}
        <div />

        {/* Row 2: Logo */}
        <img 
          src={logo} 
          alt="BoxStat Logo" 
          style={{
            width: '320px',
            height: 'auto',
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))',
          }}
          data-testid="img-logo"
        />

        {/* Row 3: Spacer */}
        <div />

        {/* Row 4: Bottom CTA */}
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            paddingBottom: 'max(60px, env(safe-area-inset-bottom))', 
            width: '100%',
          }}
        >
          <Button 
            size="lg" 
            onClick={() => setLocation('/registration')}
            className="hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] active:shadow-[0_0_40px_rgba(239,68,68,0.8)] transition-shadow duration-300"
            style={{
              backgroundColor: 'rgba(0,0,0,0.2)',
              color: 'white',
              fontWeight: 'bold',
              padding: '24px 48px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(8px)',
              minWidth: '280px',
              fontSize: '14px',
              letterSpacing: '0.1em',
            }}
            data-testid="button-lets-go"
          >
            LET'S GO
          </Button>

          <p style={{ color: 'white', fontSize: '14px', margin: 0 }}>
            <span style={{ opacity: 0.8 }}>HAVE AN ACCOUNT? </span>
            <button 
              onClick={() => setLocation('/login')}
              className="hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] active:drop-shadow-[0_0_12px_rgba(239,68,68,1)] transition-all duration-300"
              style={{
                color: 'white',
                fontWeight: 'bold',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginLeft: '4px',
                fontSize: '14px',
              }}
              data-testid="button-sign-in"
            >
              SIGN IN
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
