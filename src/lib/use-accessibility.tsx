import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AccessibilityContextType {
  reduceMotion: boolean;
  reduceBackgroundEffects: boolean;
  soundCues: boolean;
  customRingtone: string | null;
  customMatchSound: string | null;
  setReduceMotion: (value: boolean) => void;
  setReduceBackgroundEffects: (value: boolean) => void;
  setSoundCues: (value: boolean) => void;
  setCustomRingtone: (value: string | null) => void;
  setCustomMatchSound: (value: string | null) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reduceBackgroundEffects, setReduceBackgroundEffects] = useState(false);
  const [soundCues, setSoundCues] = useState(true);
  const [customRingtone, setCustomRingtone] = useState<string | null>(null);
  const [customMatchSound, setCustomMatchSound] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReduceMotion(localStorage.getItem("reduceMotion") === "true");
    setReduceBackgroundEffects(localStorage.getItem("reduceBackgroundEffects") === "true");
    setSoundCues(localStorage.getItem("soundCues") !== "false");
    setCustomRingtone(localStorage.getItem("customRingtone"));
    setCustomMatchSound(localStorage.getItem("customMatchSound"));
  }, []);

  useEffect(() => {
    localStorage.setItem("reduceMotion", String(reduceMotion));
    if (mounted) {
      if (reduceMotion) {
        document.documentElement.classList.add("reduce-motion");
      } else {
        document.documentElement.classList.remove("reduce-motion");
      }
    }
  }, [reduceMotion, mounted]);

  useEffect(() => {
    localStorage.setItem("reduceBackgroundEffects", String(reduceBackgroundEffects));
  }, [reduceBackgroundEffects]);

  useEffect(() => {
    localStorage.setItem("soundCues", String(soundCues));
  }, [soundCues]);

  useEffect(() => {
    if (customRingtone) {
      localStorage.setItem("customRingtone", customRingtone);
    } else {
      localStorage.removeItem("customRingtone");
    }
  }, [customRingtone]);

  useEffect(() => {
    if (customMatchSound) {
      localStorage.setItem("customMatchSound", customMatchSound);
    } else {
      localStorage.removeItem("customMatchSound");
    }
  }, [customMatchSound]);

  const value = {
    reduceMotion,
    reduceBackgroundEffects,
    soundCues,
    customRingtone,
    customMatchSound,
    setReduceMotion,
    setReduceBackgroundEffects,
    setSoundCues,
    setCustomRingtone,
    setCustomMatchSound,
  };

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}
