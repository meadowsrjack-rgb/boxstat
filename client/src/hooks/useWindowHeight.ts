import { useEffect, useState } from 'react';

export function useWindowHeight() {
  const [windowHeight, setWindowHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );

  useEffect(() => {
    function updateHeight() {
      const vh = window.innerHeight;
      setWindowHeight(vh);
      document.documentElement.style.setProperty('--safe-vh', `${vh}px`);
    }

    updateHeight();

    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);

    const interval = setInterval(updateHeight, 100);
    setTimeout(() => clearInterval(interval), 1000);

    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, []);

  return windowHeight;
}
