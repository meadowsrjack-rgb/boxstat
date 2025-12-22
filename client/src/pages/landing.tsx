import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import backgroundImage from "@assets/landing-background.png";
import logo from "@assets/logo2_1762477206651.png";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <>
      {/* Full-bleed black background extending beyond all safe areas */}
      <div className="ios-full-bleed" style={{ backgroundColor: '#000000' }} />
      
      {/* Main content container */}
      <div 
        className="scrollable-page"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          display: 'grid',
          gridTemplateRows: '1fr auto 1fr auto',
          alignItems: 'center',
          justifyItems: 'center',
        }}
      >
      {/* Row 1: Empty spacer */}
      <div />

      {/* Row 2: Logo */}
      <img 
        src={logo} 
        alt="BoxStat Logo" 
        style={{
          width: '180px',
          height: 'auto',
          filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))',
        }}
        data-testid="img-logo"
      />

      {/* Row 3: Empty spacer */}
      <div />

      {/* Row 4: Bottom CTA section */}
      <div 
        className="safe-bottom"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          paddingBottom: 'max(40px, env(safe-area-inset-bottom, 40px))',
          width: '100%',
        }}
      >
        {/* LET'S GO button */}
        <Button 
          size="lg" 
          onClick={() => setLocation('/registration')}
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

        {/* Sign in link */}
        <p style={{ 
          color: 'white', 
          fontSize: '14px', 
          fontWeight: '500',
          letterSpacing: '0.05em',
          margin: 0,
        }}>
          <span style={{ opacity: 0.8 }}>HAVE AN ACCOUNT? </span>
          <button 
            onClick={() => setLocation('/login')}
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
    </>
  );
}
