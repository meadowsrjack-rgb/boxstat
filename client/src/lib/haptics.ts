import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const tap = (): void => {
  if (!isNative()) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
};

export const celebrate = (): void => {
  if (!isNative()) return;
  Haptics.vibrate({ duration: 400 }).catch(() => {});
};
