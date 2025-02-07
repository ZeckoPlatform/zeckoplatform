import { useCallback, useRef } from 'react';

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef<number>(0);
  const cooldownMs = 2000; // Minimum time between sounds (2 seconds)

  const playNotification = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayedRef.current < cooldownMs) {
      return; // Still in cooldown
    }

    // Create audio context on first play (browsers require user interaction)
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    // Configure sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1000, context.currentTime); // Start at 1000 Hz
    oscillator.frequency.exponentialRampToValueAtTime(500, context.currentTime + 0.1); // Slide down to 500 Hz

    // Configure volume envelope
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.05, context.currentTime + 0.01); // Quick fade in, low volume
    gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.1); // Fade out

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    // Play sound
    oscillator.start();
    oscillator.stop(context.currentTime + 0.1);

    lastPlayedRef.current = now;
  }, []);

  return playNotification;
}
