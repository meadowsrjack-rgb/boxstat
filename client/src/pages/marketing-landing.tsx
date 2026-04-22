import { useRef, useEffect, useState } from "react";
import type { ReactNode, ButtonHTMLAttributes, RefObject } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { useLocation } from "wouter";

// =============================================================
// ASSET IMPORTS
// =============================================================
import LOGO_ICON from "@assets/Logo_Light_transparent_1776786045320.png";
import LOGO_FULL from "@assets/Full_Logo_Light_transparent_1776786045319.png";
import ADMIN_DASHBOARD from "@assets/admin-dashboard_1776786045319.png";


// =============================================================
// FONTS + GLOBAL STYLES
// =============================================================
const GlobalStyles = () => (
  <style>{`
    /* Fallback font import in case index.html <link> didn't fire.
       The index.html already has these fonts, but importing here guarantees
       they're available for this page specifically. */
    @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

    .font-display { font-family: 'Archivo Black', 'Archivo', system-ui, sans-serif; letter-spacing: -0.03em; font-weight: 900; }
    .font-body { font-family: 'Archivo', system-ui, sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

    /* The marketing landing's OWN scroll container.
       index.html locks html/body to overflow:hidden;position:fixed for the
       Capacitor app shell, and #root doesn't scroll either. So we build a
       full-viewport scroll container that owns its own scroll axis and
       feed it to framer-motion's useScroll as the container target. */
    .bx-scroll-root {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
      background: #000;
      color: #fff;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-y: contain;
      z-index: 1;
    }

    @keyframes bx-breathe {
      0% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
      100% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.9; }
    }
    @keyframes bx-marquee {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }
    @keyframes bx-pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.3); }
    }

    .bx-grid-bg {
      background-size: 60px 60px;
      background-image:
        linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px);
      mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
      -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
    }
    .bx-text-glow {
      background: linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.35) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      filter: drop-shadow(0px 0px 24px rgba(226,18,36,0.3));
    }
    .bx-glass {
      background: linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
      border: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow:
        0 10px 30px -10px rgba(0,0,0,0.5),
        inset 0 1px 1px rgba(255,255,255,0.08);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      color: rgba(255,255,255,0.7);
    }
    .bx-glass:hover {
      background: linear-gradient(145deg, rgba(226,18,36,0.12) 0%, rgba(226,18,36,0.02) 100%);
      border-color: rgba(226,18,36,0.5);
      color: #fff;
      box-shadow:
        0 20px 40px -10px rgba(226,18,36,0.3),
        inset 0 1px 1px rgba(255,255,255,0.15);
    }
    .bx-cta {
      background: linear-gradient(145deg, #e21224 0%, #a8101d 100%);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow:
        0 10px 30px -5px rgba(226,18,36,0.55),
        inset 0 1px 1px rgba(255,255,255,0.25);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .bx-cta:hover {
      box-shadow:
        0 20px 50px -5px rgba(226,18,36,0.75),
        inset 0 1px 1px rgba(255,255,255,0.35);
    }
    .bx-feature-card {
      position: relative;
      overflow: hidden;
      border-radius: 28px;
      background: linear-gradient(145deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.005) 100%);
      border: 1px solid rgba(255,255,255,0.08);
      transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .bx-feature-card:hover {
      border-color: rgba(226,18,36,0.45);
      transform: translateY(-4px);
    }
    .bx-feature-card::after {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at top right, rgba(226,18,36,0.12), transparent 60%);
      opacity: 0;
      transition: opacity 0.5s;
      pointer-events: none;
    }
    .bx-feature-card:hover::after { opacity: 1; }

    .bx-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(12px);
    }
    .bx-badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #e21224;
      animation: bx-pulse-dot 2s ease-in-out infinite;
    }

    .bx-signin {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.15);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: background 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                  border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                  box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .bx-signin:hover {
      background: linear-gradient(145deg, rgba(226,18,36,0.25) 0%, rgba(226,18,36,0.08) 100%);
      border-color: rgba(226,18,36,0.6);
      box-shadow:
        0 8px 28px -4px rgba(226,18,36,0.45),
        inset 0 1px 1px rgba(255,255,255,0.15);
    }

    .bx-store-btn {
      position: relative;
      background: linear-gradient(145deg, #1a1a1c 0%, #0a0a0b 100%);
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow:
        0 10px 30px -8px rgba(0,0,0,0.6),
        inset 0 1px 0 rgba(255,255,255,0.06),
        inset 0 -1px 0 rgba(0,0,0,0.4);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }
    .bx-store-btn::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, transparent 60%, rgba(226,18,36,0.08) 100%);
      opacity: 0;
      transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    }
    .bx-store-btn:hover {
      border-color: rgba(226,18,36,0.5);
      box-shadow:
        0 16px 40px -8px rgba(226,18,36,0.4),
        0 0 0 1px rgba(226,18,36,0.2),
        inset 0 1px 0 rgba(255,255,255,0.1);
    }
    .bx-store-btn:hover::before { opacity: 1; }
    .bx-store-btn:active { transform: translateY(1px) scale(0.99); }
  `}</style>
);

// =============================================================
// BOXSTAT LOGO (icon mark)
// =============================================================
const BoxStatLogo = ({ className = "h-9" }: { className?: string }) => (
  <img
    src={LOGO_ICON}
    alt="BoxStat"
    className={className}
    style={{
      width: "auto",
      filter: "drop-shadow(0 4px 20px rgba(226,18,36,0.35))",
    }}
  />
);


// =============================================================
// CONTAINER SCROLL ANIMATION
// Takes the scroll container ref explicitly so framer-motion
// tracks OUR scroller instead of window (which never scrolls
// because index.html locks it).
// =============================================================
const ContainerScroll = ({
  titleComponent,
  children,
  scrollContainer,
}: {
  titleComponent: ReactNode;
  children: ReactNode;
  scrollContainer: RefObject<HTMLDivElement | null>;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    container: scrollContainer,
    offset: ["start end", "end start"],
    layoutEffect: false,
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const rotate = useTransform(scrollYProgress, [0.1, 0.55], [22, 0]);
  const scale = useTransform(
    scrollYProgress,
    [0.1, 0.55],
    isMobile ? [0.8, 0.95] : [0.95, 1]
  );
  const translate = useTransform(scrollYProgress, [0, 0.5], [80, -40]);

  return (
    <div
      ref={ref}
      className="min-h-[70rem] md:min-h-[90rem] flex items-center justify-center relative p-2 md:p-20 bg-black"
    >
      <div
        className="py-10 md:py-40 w-full relative"
        style={{ perspective: "1200px" }}
      >
        <motion.div style={{ y: translate }} className="max-w-5xl mx-auto text-center">
          {titleComponent}
        </motion.div>
        <motion.div
          style={{
            rotateX: rotate,
            scale,
            boxShadow:
              "0 0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px rgba(226,18,36,0.2), 0 149px 60px #0000000a",
          }}
          className="max-w-5xl -mt-8 mx-auto h-[30rem] md:h-[40rem] w-full border-2 border-white/10 p-2 md:p-3 rounded-[30px] shadow-2xl bg-black"
        >
          <div className="h-full w-full overflow-hidden rounded-2xl bg-white">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// =============================================================
// MAGNETIC BUTTON
// =============================================================
type MagneticButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

const MagneticButton = ({
  children,
  className = "",
  onClick,
  ...rest
}: MagneticButtonProps) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15 });
  const sy = useSpring(y, { stiffness: 200, damping: 15 });
  const rotateX = useTransform(sy, [-30, 30], [6, -6]);
  const rotateY = useTransform(sx, [-30, 30], [-6, 6]);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2;
    const my = e.clientY - rect.top - rect.height / 2;
    x.set(mx * 0.35);
    y.set(my * 0.35);
  };
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      style={{ x: sx, y: sy, rotateX, rotateY, transformPerspective: 600 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`cursor-pointer ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
};

// =============================================================
// APP STORE BUTTONS
// =============================================================
const AppStoreButton = () => (
  <MagneticButton className="bx-store-btn group flex items-center gap-3 px-5 py-3 rounded-2xl font-body text-white min-w-[180px]">
    <svg className="w-7 h-7 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.56.04 2.87.67 3.55 1.76-3.13 1.77-2.62 5.92.35 7.14-.65 1.58-1.57 3.1-2.57 4.03zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
    <div className="flex flex-col items-start leading-tight text-left">
      <span className="text-[9px] font-medium tracking-wide text-white/60 uppercase">
        Download on the
      </span>
      <span className="text-[15px] font-bold tracking-tight">App Store</span>
    </div>
  </MagneticButton>
);

const GooglePlayButton = () => (
  <MagneticButton className="bx-store-btn group flex items-center gap-3 px-5 py-3 rounded-2xl font-body text-white min-w-[180px]">
    <svg className="w-7 h-7 flex-shrink-0" viewBox="0 0 512 512" aria-hidden="true">
      <defs>
        <linearGradient id="gplay-a" x1="93.788" y1="26.52" x2="294.027" y2="226.759" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00a0ff" />
          <stop offset="0.007" stopColor="#00a1ff" />
          <stop offset="0.26" stopColor="#00beff" />
          <stop offset="0.512" stopColor="#00d2ff" />
          <stop offset="0.76" stopColor="#00dfff" />
          <stop offset="1" stopColor="#00e3ff" />
        </linearGradient>
        <linearGradient id="gplay-b" x1="401.948" y1="256.013" x2="61.648" y2="256.013" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffe000" />
          <stop offset="0.409" stopColor="#ffbd00" />
          <stop offset="0.775" stopColor="#ffa500" />
          <stop offset="1" stopColor="#ff9c00" />
        </linearGradient>
        <linearGradient id="gplay-c" x1="330.831" y1="288.296" x2="58.635" y2="560.492" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff3a44" />
          <stop offset="1" stopColor="#c31162" />
        </linearGradient>
        <linearGradient id="gplay-d" x1="61.373" y1="23.854" x2="182.88" y2="145.361" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#32a071" />
          <stop offset="0.069" stopColor="#2da771" />
          <stop offset="0.476" stopColor="#15cf74" />
          <stop offset="0.801" stopColor="#06e775" />
          <stop offset="1" stopColor="#00f076" />
        </linearGradient>
      </defs>
      <path fill="url(#gplay-a)" d="M71.23 26.355c-5.763 6.1-9.17 15.576-9.17 27.847v403.601c0 12.272 3.407 21.748 9.17 27.847l1.35 1.319 226.169-226.169v-5.337L72.58 25.035z" />
      <path fill="url(#gplay-b)" d="M373.064 335.949L297.749 260.6v-5.336l75.345-75.345 1.696.974 89.272 50.723c25.491 14.483 25.491 38.171 0 52.654l-89.272 50.754z" />
      <path fill="url(#gplay-c)" d="M374.79 334.975l-77.041-77.041L71.23 484.453c8.402 8.903 22.283 10.004 37.926 1.131l265.634-150.609" />
      <path fill="url(#gplay-d)" d="M374.79 180.893L109.156 30.315C93.513 21.412 79.632 22.544 71.23 31.447l226.519 226.487z" />
    </svg>
    <div className="flex flex-col items-start leading-tight text-left">
      <span className="text-[9px] font-medium tracking-wide text-white/60 uppercase">Get it on</span>
      <span className="text-[15px] font-bold tracking-tight">Google Play</span>
    </div>
  </MagneticButton>
);

// =============================================================
// HERO
// =============================================================
const Hero = () => {
  const [, setLocation] = useLocation();
  return (
    <section className="relative min-h-screen w-full flex flex-col overflow-visible">
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-gray-950 via-black to-black" />
      {/* Bottom red glow — extended past the section so it bleeds smoothly
          into whatever sits below (the next section is bg-black). */}
      <div
        className="absolute left-0 right-0 z-0 pointer-events-none"
        style={{
          bottom: "-40vh",
          height: "100vh",
          background:
            "radial-gradient(ellipse 90% 70% at center 60%, rgba(226,18,36,0.32) 0%, rgba(226,18,36,0.18) 28%, rgba(226,18,36,0.08) 55%, rgba(226,18,36,0.02) 75%, transparent 95%)",
        }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-72 z-0 pointer-events-none opacity-50"
        style={{
          background: "radial-gradient(ellipse at center top, rgba(226,18,36,0.15) 0%, transparent 70%)",
        }}
      />
      <div className="absolute inset-0 bx-grid-bg z-0 pointer-events-none opacity-60" />

      <nav className="relative z-10 flex items-center px-6 md:px-12 py-6">
        <div className="flex-1 flex items-center">
          <BoxStatLogo className="h-9 md:h-10" />
        </div>
        <div className="hidden md:flex items-center gap-10">
          {["Features", "Migrate", "Pricing"].map((label) => (
            <a
              key={label}
              href="#"
              className="relative text-xs font-bold tracking-widest uppercase text-white/60 hover:text-white transition-colors font-body group"
            >
              {label}
              <span
                className="absolute left-0 -bottom-1 h-[2px] w-0 group-hover:w-full transition-all duration-300"
                style={{ background: "#e21224" }}
              />
            </a>
          ))}
        </div>
        <div className="flex-1 flex items-center justify-end">
          <MagneticButton
            onClick={() => setLocation("/login")}
            className="bx-signin group flex items-center gap-2 px-5 py-2.5 rounded-full font-body font-bold tracking-widest text-[11px] md:text-xs uppercase text-white"
          >
            <span>Sign In</span>
            <svg
              className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </MagneticButton>
        </div>
      </nav>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bx-badge mb-8"
        >
          <span className="bx-badge-dot" />
          <span className="text-[11px] md:text-xs font-bold tracking-widest uppercase text-white/70 font-body">
            Built for modern clubs
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.92] max-w-5xl text-white"
        >
          <span className="relative inline-block">
            The
            <svg
              aria-hidden="true"
              viewBox="0 0 120 18"
              preserveAspectRatio="none"
              className="absolute left-[-4%] right-[-4%] -bottom-2 md:-bottom-3 w-[108%] h-[0.35em] pointer-events-none"
            >
              <path
                d="M2 10 Q 20 8.6, 40 9.4 T 80 9.2 T 118 10.2"
                fill="none"
                stroke="#e21224"
                strokeWidth="3.5"
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 2px 6px rgba(226,18,36,0.45))" }}
              />
            </svg>
          </span>{" "}
          sports system
          <br />
          <span style={{ color: "#e21224" }}>geared for growth.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="font-body mt-8 text-base md:text-xl text-white/60 max-w-2xl leading-relaxed"
        >
          Scoresheets. Scheduling. Payments. Parent comms. One login. Zero chaos.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-12 flex flex-col sm:flex-row gap-4 items-center"
        >
          <MagneticButton
            onClick={() => setLocation("/registration")}
            className="bx-cta font-body font-bold tracking-widest text-sm uppercase rounded-xl px-12 py-5 min-w-[260px]"
          >
            Start Your Club
          </MagneticButton>
          <MagneticButton
            onClick={() => setLocation("/demo")}
            className="bx-glass font-body font-bold tracking-widest text-sm uppercase rounded-xl px-12 py-5 min-w-[260px] text-white/80"
          >
            Book a 10-min Demo
          </MagneticButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-white/40 font-body font-medium"
        >
          <span>✓ No credit card to start</span>
          <span>✓ Migrate from TeamSnap in a weekend</span>
          <span>✓ Cancel anytime</span>
        </motion.div>
      </div>

      <div className="relative z-10 pb-10 flex flex-col items-center gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-3 items-center"
        >
          <AppStoreButton />
          <GooglePlayButton />
        </motion.div>
        <span className="text-[10px] font-body font-bold tracking-[0.3em] uppercase text-white/40">
          Everything you run, on one screen
        </span>
        <div className="w-[1px] h-16 bg-gradient-to-b from-white/40 to-transparent" />
      </div>
    </section>
  );
};

// =============================================================
// FEATURES
// =============================================================
const FeatureCard = ({
  badge,
  title,
  body,
}: {
  badge: string;
  title: string;
  body: string;
}) => (
  <div className="bx-feature-card p-8 md:p-10">
    <div className="relative z-10">
      <span className="font-mono text-xs font-bold tracking-widest" style={{ color: "#e21224" }}>
        {badge}
      </span>
      <h3 className="font-display mt-4 text-2xl md:text-3xl text-white">{title}</h3>
      <p className="font-body mt-4 text-sm md:text-base text-white/60 leading-relaxed">{body}</p>
    </div>
  </div>
);

const Features = () => (
  <section className="relative w-full py-24 md:py-32 px-6 md:px-12 bg-black">
    <div className="absolute inset-0 bx-grid-bg opacity-40 pointer-events-none" />
    <div className="relative max-w-7xl mx-auto">
      <div className="text-center mb-16 md:mb-24">
        <div className="bx-badge mb-6">
          <span className="bx-badge-dot" />
          <span className="font-body text-[11px] md:text-xs font-bold tracking-widest uppercase text-white/70">
            Why owners switch
          </span>
        </div>
        <h2 className="font-display text-4xl md:text-6xl text-white leading-[0.95]">
          Stop duct-taping
          <br />
          <span style={{ color: "#e21224" }}>five apps together.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeatureCard
          badge="01 / LIVE STATS"
          title="Real-time scoresheets"
          body="Track every stat as it happens. Box scores the moment the final whistle blows. Substitutions, fouls, overtime — handled. Members see their numbers before they leave the venue."
        />
        <FeatureCard
          badge="02 / REVENUE"
          title="Every dollar, visible"
          body="YTD, per-program, per-team. Stripe-powered payments. Know which squad is paying the rent and which one's bleeding out — at a glance."
        />
        <FeatureCard
          badge="03 / UX"
          title="Parent-proof experience"
          body="If a parent can order pizza on Uber Eats, they can RSVP here. One-tap waivers, digital forms, no clunky logins. Fewer support tickets for you."
        />
        <FeatureCard
          badge="04 / MIGRATION"
          title="Switch in a weekend"
          body="Our Migrations tool lifts your whole club off TeamSnap, SportsEngine, or LeagueApps. Rosters, schedules, payment history — the lot. Keep playing, we'll move the rest."
        />
      </div>
    </div>
  </section>
);

// =============================================================
// TRUST ROW
// =============================================================
const TrustRow = () => (
  <section className="relative w-full py-20 md:py-28 px-6 md:px-12 border-t border-white/5 bg-black">
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <span className="font-body text-xs md:text-sm font-bold tracking-[0.3em] uppercase text-white/50">
          Built different
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
        {[
          { num: "01", headline: "Any sport. Any format.", body: "Basketball, football, netball, cricket — if it has a scoresheet, BoxStat runs it. Purpose-built, not rebadged." },
          { num: "02", headline: "Your data stays yours.", body: "We don't sell it, profile it, or ad-target your members. Ever. Export everything, anytime." },
          { num: "03", headline: "Mobile-first, always.", body: "Coaches don't coach from desks. Parents don't RSVP from laptops. Neither should their software." },
        ].map((item) => (
          <div key={item.num} className="relative">
            <div className="font-mono text-xs font-bold tracking-widest mb-4" style={{ color: "#e21224" }}>
              {item.num} —
            </div>
            <h4 className="font-display text-2xl md:text-3xl mb-4 text-white leading-tight">
              {item.headline}
            </h4>
            <p className="font-body text-sm md:text-base text-white/60 leading-relaxed">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// =============================================================
// CINEMATIC FOOTER
// =============================================================
const MarqueeItem = () => (
  <div className="flex items-center space-x-12 px-6 font-body">
    <span>Live Scoresheets</span>
    <span style={{ color: "#e21224" }}>✦</span>
    <span>Instant Box Scores</span>
    <span className="text-white/50">✦</span>
    <span>Parent-Proof UX</span>
    <span style={{ color: "#e21224" }}>✦</span>
    <span>Revenue, Visible</span>
    <span className="text-white/50">✦</span>
    <span>One-Tap RSVPs</span>
    <span style={{ color: "#e21224" }}>✦</span>
    <span>Your Data, Yours</span>
    <span className="text-white/50">✦</span>
  </div>
);

const CinematicFooter = ({
  scrollContainer,
}: {
  scrollContainer: RefObject<HTMLDivElement | null>;
}) => {
  const [, setLocation] = useLocation();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    container: scrollContainer,
    offset: ["start end", "end start"],
    layoutEffect: false,
  });

  const headingY = useTransform(scrollYProgress, [0.1, 0.5], [60, 0]);
  const headingOpacity = useTransform(scrollYProgress, [0.1, 0.45], [0, 1]);
  const ctasY = useTransform(scrollYProgress, [0.2, 0.6], [40, 0]);
  const ctasOpacity = useTransform(scrollYProgress, [0.2, 0.55], [0, 1]);
  // Watermark holds off until the section is well in view, then rises in
  const watermarkOpacity = useTransform(scrollYProgress, [0.3, 0.7], [0, 1]);
  const watermarkY = useTransform(scrollYProgress, [0.3, 0.7], [40, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden font-body bg-black text-white"
      style={{ minHeight: "100vh" }}
    >
      <div
        className="absolute left-1/2 top-1/2 h-[70vh] w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-[50%] pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(226,18,36,0.35) 0%, rgba(226,18,36,0.12) 40%, transparent 70%)",
          filter: "blur(80px)",
          animation: "bx-breathe 8s ease-in-out infinite alternate",
        }}
      />

      <div className="bx-grid-bg absolute inset-0 z-0 pointer-events-none opacity-60" />

      <motion.div
        className="absolute left-0 right-0 bottom-0 flex items-end justify-center z-0 pointer-events-none select-none px-6"
        style={{ opacity: watermarkOpacity, y: watermarkY, height: "65%" }}
      >
        <img
          src={LOGO_FULL}
          alt=""
          className="w-[110vw] max-w-none h-auto"
          style={{
            opacity: 0.06,
            filter: "blur(0.5px)",
            transform: "translateY(10%)",
          }}
          draggable={false}
        />
      </motion.div>

      <div
        className="absolute top-24 left-0 w-full overflow-hidden py-4 z-10 -rotate-2 scale-110 shadow-2xl"
        style={{
          borderTop: "1px solid rgba(226,18,36,0.3)",
          borderBottom: "1px solid rgba(226,18,36,0.3)",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="flex w-max text-xs md:text-sm font-bold tracking-[0.3em] uppercase text-white/60"
          style={{ animation: "bx-marquee 40s linear infinite" }}
        >
          <MarqueeItem />
          <MarqueeItem />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-56 pb-32 max-w-5xl mx-auto min-h-screen">
        <motion.div
          style={{ y: headingY, opacity: headingOpacity }}
          className="flex flex-col items-center w-full"
        >
          <h2 className="font-display text-5xl md:text-8xl bx-text-glow tracking-tighter mb-6 text-center leading-[0.95]">
            Ready to run
            <br />a tighter ship?
          </h2>
          <p className="text-white/60 text-sm md:text-lg mb-12 text-center max-w-2xl">
            Move your whole club over in a weekend. We'll handle the migration.
            You handle the sport.
          </p>
        </motion.div>

        <motion.div
          style={{ y: ctasY, opacity: ctasOpacity }}
          className="flex flex-col items-center gap-6 w-full"
        >
          <div className="flex flex-wrap justify-center gap-4 w-full">
            <MagneticButton
              onClick={() => setLocation("/registration")}
              className="bx-cta px-10 py-5 rounded-full font-bold text-sm md:text-base tracking-widest uppercase"
            >
              Start Your Club
            </MagneticButton>
            <MagneticButton
              onClick={() => setLocation("/demo")}
              className="bx-glass px-10 py-5 rounded-full font-bold text-sm md:text-base tracking-widest uppercase"
            >
              Book a Demo
            </MagneticButton>
          </div>

          <div className="flex flex-wrap justify-center gap-3 md:gap-6 w-full mt-2">
            <MagneticButton
              onClick={() => setLocation("/privacy")}
              className="bx-glass px-6 py-3 rounded-full font-medium text-xs md:text-sm"
            >
              Privacy
            </MagneticButton>
            <MagneticButton
              onClick={() => setLocation("/terms")}
              className="bx-glass px-6 py-3 rounded-full font-medium text-xs md:text-sm"
            >
              Terms
            </MagneticButton>
            <MagneticButton
              onClick={() => setLocation("/support")}
              className="bx-glass px-6 py-3 rounded-full font-medium text-xs md:text-sm"
            >
              Support
            </MagneticButton>
            <MagneticButton
              onClick={() => setLocation("/migrations")}
              className="bx-glass px-6 py-3 rounded-full font-medium text-xs md:text-sm"
            >
              Migrate from TeamSnap
            </MagneticButton>
          </div>
        </motion.div>
      </div>

      <div className="relative z-20 w-full pb-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/10 pt-8">
        <div className="text-white/50 text-[10px] md:text-xs font-semibold tracking-widest uppercase order-2 md:order-1">
          © 2026 BoxStat. All rights reserved.
        </div>
        <div className="flex items-center gap-6 order-1 md:order-2 text-[10px] md:text-xs font-semibold tracking-widest uppercase text-white/50">
          <a href="#" className="hover:text-white transition-colors">Status</a>
          <span className="w-px h-3 bg-white/20" />
          <a href="#" className="hover:text-white transition-colors">Changelog</a>
          <span className="w-px h-3 bg-white/20" />
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
        <MagneticButton
          onClick={() => scrollContainer.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="w-12 h-12 rounded-full bx-glass flex items-center justify-center order-3 group"
        >
          <svg
            className="w-5 h-5 transform group-hover:-translate-y-1.5 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </MagneticButton>
      </div>
    </section>
  );
};

// =============================================================
// MAIN
// =============================================================
export default function MarketingLanding() {
  // This ref is the scroll container for the whole marketing page.
  // We hand it to every child that uses useScroll so framer-motion
  // tracks THIS element's scroll — not window, which is locked.
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="bx-scroll-root font-body selection:bg-red-500/30"
    >
      <GlobalStyles />
      <Hero />
      <ContainerScroll
        scrollContainer={scrollRef}
        titleComponent={
          <div className="pb-4">
            <div className="bx-badge mb-6 inline-flex">
              <span className="bx-badge-dot" />
              <span className="font-body text-[11px] md:text-xs font-bold tracking-widest uppercase text-white/70">
                One dashboard
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-7xl text-white leading-[0.9]">
              Every number
              <br />
              <span style={{ color: "#e21224" }}>that matters.</span>
            </h2>
            <p className="font-body mt-6 text-sm md:text-base text-white/60 max-w-xl mx-auto leading-relaxed">
              Revenue YTD. Active players. Event attendance. Stock alerts. All
              live. No spreadsheets.
            </p>
          </div>
        }
      >
        <img
          src={ADMIN_DASHBOARD}
          alt="BoxStat admin dashboard"
          className="mx-auto rounded-2xl object-cover h-full w-full object-left-top"
          draggable={false}
        />
      </ContainerScroll>
      <Features />
      <TrustRow />
      <CinematicFooter scrollContainer={scrollRef} />
    </div>
  );
}
