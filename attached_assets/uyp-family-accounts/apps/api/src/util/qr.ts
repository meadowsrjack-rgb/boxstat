
import QRCode from 'qrcode';

export async function toQRDataUrl(text: string) {
  return QRCode.toDataURL(text, { margin: 1, scale: 4 });
}
