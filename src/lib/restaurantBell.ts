/**
 * Funções utilitárias para tocar som de sino de restaurante usando Web Audio API
 * Simula o clássico sino de balcão de restaurante
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume context if suspended (autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Toca o som do sino de restaurante
 * @param volume Volume de 0 a 1 (padrão 0.5)
 */
export function playBell(volume: number = 0.5): void {
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
}

/**
 * Toca duplo sino (para alertas mais urgentes)
 */
export function playDoubleBell(volume: number = 0.5): void {
  playBell(volume);
  setTimeout(() => playBell(volume * 0.8), 300);
}

/**
 * Toca sino de alerta (mais grave, para pedidos atrasados)
 */
export function playAlertBell(volume: number = 0.6): void {
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
}

/**
 * Toca som de lembrete de agendamento (melodia suave e distintiva)
 * Usado para alertar sobre pedidos agendados próximos
 */
export function playScheduleReminder(volume: number = 0.5): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Sequência melodiosa ascendente - som amigável de lembrete
    const notes = [
      { freq: 523.25, delay: 0 },     // C5
      { freq: 659.25, delay: 0.15 },  // E5
      { freq: 783.99, delay: 0.30 },  // G5
      { freq: 1046.50, delay: 0.45 }, // C6
    ];

    notes.forEach(({ freq, delay }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.value = 4000;
      filter.Q.value = 0.5;

      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      const noteStart = now + delay;
      const noteDuration = 0.25;

      gainNode.gain.setValueAtTime(0, noteStart);
      gainNode.gain.linearRampToValueAtTime(volume * 0.6, noteStart + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(volume * 0.3, noteStart + noteDuration * 0.5);
      gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);

      oscillator.start(noteStart);
      oscillator.stop(noteStart + noteDuration + 0.1);
    });

    // Adiciona um "shimmer" suave no final
    setTimeout(() => {
      const ctx2 = getAudioContext();
      const now2 = ctx2.currentTime;

      [1046.50, 1318.51, 1567.98].forEach((freq, i) => {
        const osc = ctx2.createOscillator();
        const gain = ctx2.createGain();

        osc.connect(gain);
        gain.connect(ctx2.destination);

        osc.frequency.value = freq;
        osc.type = 'sine';

        const shimmerVol = volume * 0.3 * (1 - i * 0.2);

        gain.gain.setValueAtTime(0, now2);
        gain.gain.linearRampToValueAtTime(shimmerVol, now2 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now2 + 0.8);

        osc.start(now2);
        osc.stop(now2 + 0.9);
      });
    }, 500);

  } catch (error) {
    console.warn('Não foi possível tocar o lembrete:', error);
  }
}

/**
 * Toca som de urgência para agendamento próximo (< 5 min)
 * Mais insistente que o lembrete normal
 */
export function playScheduleUrgent(volume: number = 0.6): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Três toques rápidos e urgentes
    [0, 0.2, 0.4].forEach((delay) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 1568; // G6 - nota mais aguda e urgente
      oscillator.type = 'sine';

      const noteStart = now + delay;

      gainNode.gain.setValueAtTime(0, noteStart);
      gainNode.gain.linearRampToValueAtTime(volume, noteStart + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.15);

      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.2);
    });

    // Segundo grupo após pausa
    setTimeout(() => {
      const ctx2 = getAudioContext();
      const now2 = ctx2.currentTime;

      [0, 0.2, 0.4].forEach((delay) => {
        const oscillator = ctx2.createOscillator();
        const gainNode = ctx2.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx2.destination);

        oscillator.frequency.value = 1976; // B6 - ainda mais aguda
        oscillator.type = 'sine';

        const noteStart = now2 + delay;

        gainNode.gain.setValueAtTime(0, noteStart);
        gainNode.gain.linearRampToValueAtTime(volume * 0.8, noteStart + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.15);

        oscillator.start(noteStart);
        oscillator.stop(noteStart + 0.2);
      });
    }, 600);

  } catch (error) {
    console.warn('Não foi possível tocar o alerta urgente:', error);
  }
}

/**
 * Toca som de notificação iFood (distintivo vermelho/urgente)
 * Som característico que lembra o app iFood
 */
export function playIFoodNotification(volume: number = 0.7): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Sequência de 3 notas curtas e vibrantes (estilo iFood)
    const notes = [
      { freq: 987.77, delay: 0 },      // B5
      { freq: 1318.51, delay: 0.12 },  // E6
      { freq: 1567.98, delay: 0.24 },  // G6
    ];

    notes.forEach(({ freq, delay }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.value = freq * 1.2;
      filter.Q.value = 2;

      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      const noteStart = now + delay;
      const noteDuration = 0.15;

      gainNode.gain.setValueAtTime(0, noteStart);
      gainNode.gain.linearRampToValueAtTime(volume, noteStart + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(volume * 0.5, noteStart + noteDuration * 0.6);
      gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);

      oscillator.start(noteStart);
      oscillator.stop(noteStart + noteDuration + 0.05);
    });

    // "Ding" final mais prolongado
    setTimeout(() => {
      const ctx2 = getAudioContext();
      const now2 = ctx2.currentTime;

      const finalOsc = ctx2.createOscillator();
      const finalGain = ctx2.createGain();

      finalOsc.connect(finalGain);
      finalGain.connect(ctx2.destination);

      finalOsc.frequency.value = 1975.53; // B6 - nota alta final
      finalOsc.type = 'sine';

      finalGain.gain.setValueAtTime(0, now2);
      finalGain.gain.linearRampToValueAtTime(volume * 0.6, now2 + 0.01);
      finalGain.gain.exponentialRampToValueAtTime(0.001, now2 + 0.5);

      finalOsc.start(now2);
      finalOsc.stop(now2 + 0.6);

      // Harmônicos para riqueza sonora
      [2637.02, 3135.96].forEach((freq, i) => {
        const harmOsc = ctx2.createOscillator();
        const harmGain = ctx2.createGain();

        harmOsc.connect(harmGain);
        harmGain.connect(ctx2.destination);

        harmOsc.frequency.value = freq;
        harmOsc.type = 'sine';

        const harmVol = volume * 0.2 * (1 - i * 0.3);

        harmGain.gain.setValueAtTime(0, now2);
        harmGain.gain.linearRampToValueAtTime(harmVol, now2 + 0.01);
        harmGain.gain.exponentialRampToValueAtTime(0.001, now2 + 0.4);

        harmOsc.start(now2);
        harmOsc.stop(now2 + 0.5);
      });
    }, 350);

    // Segundo toque para maior urgência
    setTimeout(() => {
      const ctx3 = getAudioContext();
      const now3 = ctx3.currentTime;

      [987.77, 1318.51, 1567.98].forEach((freq, i) => {
        const osc = ctx3.createOscillator();
        const gain = ctx3.createGain();

        osc.connect(gain);
        gain.connect(ctx3.destination);

        osc.frequency.value = freq;
        osc.type = 'sine';

        const noteStart = now3 + i * 0.1;
        const vol = volume * 0.6 * (1 - i * 0.1);

        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(vol, noteStart + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.12);

        osc.start(noteStart);
        osc.stop(noteStart + 0.15);
      });
    }, 700);

  } catch (error) {
    console.warn('Não foi possível tocar notificação iFood:', error);
  }
}
