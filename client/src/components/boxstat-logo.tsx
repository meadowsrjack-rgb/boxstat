import logoLight from "@assets/light_1773300199014.png";
import logoDark from "@assets/dark_1773300199014.png";

interface BoxStatLogoProps {
  variant?: "light" | "dark" | "auto";
  className?: string;
  alt?: string;
}

export default function BoxStatLogo({ variant = "auto", className = "h-10 w-auto", alt = "BoxStat" }: BoxStatLogoProps) {
  if (variant === "auto") {
    return (
      <>
        <img src={logoLight} alt={alt} className={`${className} dark:hidden`} />
        <img src={logoDark} alt={alt} className={`${className} hidden dark:block`} />
      </>
    );
  }

  const src = variant === "dark" ? logoDark : logoLight;
  return <img src={src} alt={alt} className={className} />;
}
