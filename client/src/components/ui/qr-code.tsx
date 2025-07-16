import { useEffect, useRef } from "react";
import QRCodeLib from "qrcode";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export default function QRCode({ value, size = 256, className }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCodeLib.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: "#1E293B",
          light: "#FFFFFF"
        }
      }, (error) => {
        if (error) console.error("QR Code generation error:", error);
      });
    }
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={size}
      height={size}
    />
  );
}
