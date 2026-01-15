import { useCallback, useRef } from 'react';

/**
 * Hook para tocar som de sino de restaurante usando Web Audio API
 * Simula o clássico sino de balcão de restaurante
 */
export function useRestaurantBell() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume context if suspended (autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  /**
   * Toca o som do sino de restaurante
   * @param volume Volume de 0 a 1 (padrão 0.5)
   */
  const playBell = useCallback((volume: number = 0.5) => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Sino principal - frequência característica de sino de balcão (~2000-3000 Hz)
      const bellFrequencies = [2637, 3520, 4186]; // E7, A7, C8 - harmônicos de sino
      
      bellFrequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        // Filtro para suavizar o som
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 8000;
        filter.Q.value = 1;

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';

        // Envelope ADSR característico de sino (ataque rápido, decay longo)
        const attackTime = 0.005;
        const decayTime = 0.8;
        const sustainLevel = 0.1;
        const releaseTime = 1.2;

        // Volume decresce para harmônicos superiores
        const harmonicVolume = volume * (1 - index * 0.25);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(harmonicVolume, now + attackTime);
        gainNode.gain.exponentialRampToValueAtTime(harmonicVolume * sustainLevel, now + attackTime + decayTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + attackTime + decayTime + releaseTime);

        oscillator.start(now);
        oscillator.stop(now + attackTime + decayTime + releaseTime + 0.1);
      });

      // Adiciona um "ping" metálico característico
      const pingOsc = ctx.createOscillator();
      const pingGain = ctx.createGain();
      const pingFilter = ctx.createBiquadFilter();
      
      pingFilter.type = 'bandpass';
      pingFilter.frequency.value = 5000;
      pingFilter.Q.value = 10;

      pingOsc.connect(pingFilter);
      pingFilter.connect(pingGain);
      pingGain.connect(ctx.destination);

      pingOsc.frequency.value = 5274; // E8
      pingOsc.type = 'triangle';

      pingGain.gain.setValueAtTime(0, now);
      pingGain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.002);
      pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      pingOsc.start(now);
      pingOsc.stop(now + 0.5);

    } catch (error) {
      console.warn('Não foi possível tocar o sino:', error);
    }
  }, [getAudioContext]);

  /**
   * Toca duplo sino (para alertas mais urgentes)
   */
  const playDoubleBell = useCallback((volume: number = 0.5) => {
    playBell(volume);
    setTimeout(() => playBell(volume * 0.8), 300);
  }, [playBell]);

  /**
   * Toca sino de alerta (mais grave, para pedidos atrasados)
   */
  const playAlertBell = useCallback((volume: number = 0.6) => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Tom mais grave e urgente
      const alertFrequencies = [880, 1108, 1318]; // A5, C#6, E6 - acorde menor

      alertFrequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';

        const harmonicVolume = volume * (1 - index * 0.2);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(harmonicVolume, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(harmonicVolume * 0.3, now + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1);

        oscillator.start(now);
        oscillator.stop(now + 1.1);
      });

      // Segundo toque
      setTimeout(() => {
        const ctx2 = getAudioContext();
        const now2 = ctx2.currentTime;

        alertFrequencies.forEach((freq, index) => {
          const oscillator = ctx2.createOscillator();
          const gainNode = ctx2.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx2.destination);

          oscillator.frequency.value = freq;
          oscillator.type = 'sine';

          const harmonicVolume = volume * 0.7 * (1 - index * 0.2);

          gainNode.gain.setValueAtTime(0, now2);
          gainNode.gain.linearRampToValueAtTime(harmonicVolume, now2 + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(harmonicVolume * 0.3, now2 + 0.3);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now2 + 1);

          oscillator.start(now2);
          oscillator.stop(now2 + 1.1);
        });
      }, 400);

    } catch (error) {
      console.warn('Não foi possível tocar o alerta:', error);
    }
  }, [getAudioContext]);

  return {
    playBell,
    playDoubleBell,
    playAlertBell,
  };
}
