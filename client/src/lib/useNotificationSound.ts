import { useCallback, useRef } from 'react';

type SoundType = 'send' | 'receive';

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef<number>(0);
  const cooldownMs = 2000; // Minimum time between sounds (2 seconds)

  const playNotification = useCallback((type: SoundType = 'receive') => {
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

    // Configure sound based on type
    if (type === 'send') {
      // Higher pitched, shorter "ping" for sending
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, context.currentTime + 0.05);

      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.03, context.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.05);
    } else {
      // Lower pitched, slightly longer "clink" for receiving
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(500, context.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.05, context.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.1);
    }

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    // Play sound
    oscillator.start();
    oscillator.stop(context.currentTime + (type === 'send' ? 0.05 : 0.1));

    lastPlayedRef.current = now;
  }, []);

  return playNotification;
}