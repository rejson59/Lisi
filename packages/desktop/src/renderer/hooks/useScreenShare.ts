// ============================================================
// useScreenShare Hook - Hook do udostępniania ekranu
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseScreenShareOptions {
  onFrame?: (frame: { data: string; timestamp: number; width: number; height: number }) => void;
  fps?: number;
}

interface UseScreenShareReturn {
  isSharing: boolean;
  currentFrame: string | null;
  startShare: () => Promise<void>;
  stopShare: () => void;
  captureOnce: () => Promise<string>;
}

export function useScreenShare(options: UseScreenShareOptions = {}): UseScreenShareReturn {
  const [isSharing, setIsSharing] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const startShare = useCallback(async () => {
    try {
      await window.lisi.capture.startShare();
      setIsSharing(true);

      // Nasłuchuj klatek
      const unsubscribe = window.lisi.capture.onFrame((frame) => {
        const dataUrl = `data:image/jpeg;base64,${frame.data}`;
        setCurrentFrame(dataUrl);
        options.onFrame?.(frame);
      });

      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      console.error('[ScreenShare] Błąd:', err);
    }
  }, [options.onFrame]);

  const stopShare = useCallback(() => {
    window.lisi.capture.stopShare();
    setIsSharing(false);
    setCurrentFrame(null);
    
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  const captureOnce = useCallback(async (): Promise<string> => {
    return await window.lisi.capture.screen();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    isSharing,
    currentFrame,
    startShare,
    stopShare,
    captureOnce,
  };
}
