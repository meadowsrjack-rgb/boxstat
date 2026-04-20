import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import darkThemeLogo from "@assets/darkthemefinal_1774474125499.png";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

// Placeholder dashboard preview. Swap this constant for the real screenshot
// (e.g. `import dashboardPreview from "@assets/dashboard-preview.png";`) when
// the artwork is ready — no other code changes required.
const DASHBOARD_PLACEHOLDER_SRC =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 1000'>
      <defs>
        <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#1f2937'/>
          <stop offset='100%' stop-color='#0b1220'/>
        </linearGradient>
      </defs>
      <rect width='1600' height='1000' fill='url(#bg)'/>
      <rect x='40' y='40' width='1520' height='80' rx='16' fill='#111827'/>
      <rect x='40' y='150' width='360' height='810' rx='16' fill='#111827'/>
      <rect x='420' y='150' width='1140' height='240' rx='16' fill='#111827'/>
      <rect x='420' y='410' width='560' height='550' rx='16' fill='#111827'/>
      <rect x='1000' y='410' width='560' height='550' rx='16' fill='#111827'/>
      <text x='800' y='540' fill='#e5e7eb' font-family='sans-serif' font-size='48' font-weight='700' text-anchor='middle'>
        Dashboard preview placeholder
      </text>
    </svg>`,
  );

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative min-h-screen-safe bg-black text-white overflow-x-hidden">
      {/* LAYER 1: Dark gradient backdrop spans the whole scrollable page */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-0 h-64"
        style={{
          background:
            "radial-gradient(ellipse at center bottom, rgba(220, 38, 38, 0.15) 0%, transparent 70%)",
        }}
      />

      {/* LAYER 2: Foreground content */}
      <div className="relative z-10">
        {/* First screen: logo + CTA */}
        <section
          className="animate-fade-in grid min-h-screen-safe w-full items-center justify-items-center"
          style={{
            gridTemplateRows: "1fr auto 1fr auto",
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div />

          <div
            style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.5))" }}
            data-testid="img-logo"
          >
            <img
              src={darkThemeLogo}
              alt="BoxStat"
              className="w-[320px] h-auto"
            />
          </div>

          <div />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              paddingBottom: "max(60px, env(safe-area-inset-bottom))",
              width: "100%",
            }}
          >
            <Button
              size="lg"
              onClick={() => setLocation("/registration")}
              className="hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] active:shadow-[0_0_40px_rgba(239,68,68,0.8)] transition-shadow duration-300"
              style={{
                backgroundColor: "rgba(0,0,0,0.2)",
                color: "white",
                fontWeight: "bold",
                padding: "24px 48px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(8px)",
                minWidth: "280px",
                fontSize: "14px",
                letterSpacing: "0.1em",
              }}
              data-testid="button-lets-go"
            >
              LET'S GO
            </Button>

            <p style={{ color: "white", fontSize: "14px", margin: 0 }}>
              <span style={{ opacity: 0.8 }}>HAVE AN ACCOUNT? </span>
              <button
                onClick={() => setLocation("/login")}
                className="hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] active:drop-shadow-[0_0_12px_rgba(239,68,68,1)] transition-all duration-300"
                style={{
                  color: "white",
                  fontWeight: "bold",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  marginLeft: "4px",
                  fontSize: "14px",
                }}
                data-testid="button-sign-in"
              >
                SIGN IN
              </button>
            </p>
          </div>
        </section>

        {/* Scroll-driven hero section */}
        <section
          className="w-full"
          data-testid="section-scroll-hero"
        >
          <ContainerScroll
            titleComponent={
              <>
                <h2 className="text-lg md:text-2xl font-medium text-white/80">
                  Built for the modern coach
                </h2>
                <h1 className="mt-2 text-4xl md:text-7xl font-bold text-white leading-tight">
                  Twice the Club. <br className="hidden md:block" />
                  Half the Effort.
                </h1>
              </>
            }
          >
            <img
              src={DASHBOARD_PLACEHOLDER_SRC}
              alt="BoxStat dashboard preview"
              draggable={false}
              className="mx-auto h-full w-full rounded-2xl object-cover object-left-top select-none pointer-events-none"
              data-testid="img-dashboard-placeholder"
            />
          </ContainerScroll>
        </section>
      </div>
    </div>
  );
}
