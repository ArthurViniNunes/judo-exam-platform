const HAPTICS_STORAGE_KEY = "judo-exam:haptics";

type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;
type Vibrator = { vibrate: (pattern: number | number[]) => boolean };

function browserStorage(): PreferenceStorage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function browserVibrator(): Vibrator | null {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return null;
  return navigator;
}

export function readHapticsPreference(storage = browserStorage()) {
  if (!storage) return false;
  try {
    return storage.getItem(HAPTICS_STORAGE_KEY) === "enabled";
  } catch {
    return false;
  }
}

export function writeHapticsPreference(enabled: boolean, storage = browserStorage()) {
  if (!storage) return;
  try {
    storage.setItem(HAPTICS_STORAGE_KEY, enabled ? "enabled" : "disabled");
  } catch {
    // A avaliação continua funcionando quando o navegador bloqueia o armazenamento.
  }
}

export function triggerHapticFeedback(
  enabled: boolean,
  pattern: number | number[] = 18,
  vibrator: Vibrator | null = browserVibrator(),
) {
  if (!enabled || !vibrator) return false;
  try {
    return vibrator.vibrate(pattern);
  } catch {
    return false;
  }
}
