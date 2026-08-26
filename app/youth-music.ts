const EPSILON = 0.0001;

export const MUSIC_TIMING = {
  bpm: 60,
  stepSeconds: 60 / 60 / 2,
  lookAheadMs: 50,
  scheduleAheadSeconds: 0.65,
  startDelaySeconds: 0.06,
  maxStepsPerTick: 8,
  totalSteps: 32,
  arpeggioDuration: 2.4,
  melodyDuration: 2.9,
} as const;

export type MusicSchedulePosition = {
  nextNoteTime: number;
  step: number;
};

export type MusicSchedulePlan = MusicSchedulePosition & {
  events: Array<{ step: number; time: number }>;
};

export function planMusicWindow(position: MusicSchedulePosition, now: number): MusicSchedulePlan {
  let { nextNoteTime, step } = position;
  const minimumStart = now + MUSIC_TIMING.startDelaySeconds;

  // When a browser timer is delayed, advance the score instead of trying to
  // play missed notes at once. The audible clock always remains Web Audio time.
  if (nextNoteTime < minimumStart) {
    const missedSteps = Math.max(
      1,
      Math.ceil((minimumStart - nextNoteTime) / MUSIC_TIMING.stepSeconds),
    );
    step = (step + missedSteps) % MUSIC_TIMING.totalSteps;
    nextNoteTime += missedSteps * MUSIC_TIMING.stepSeconds;
  }

  const events: MusicSchedulePlan["events"] = [];
  const horizon = now + MUSIC_TIMING.scheduleAheadSeconds;
  while (nextNoteTime < horizon && events.length < MUSIC_TIMING.maxStepsPerTick) {
    events.push({ step, time: nextNoteTime });
    step = (step + 1) % MUSIC_TIMING.totalSteps;
    nextNoteTime += MUSIC_TIMING.stepSeconds;
  }

  return { events, nextNoteTime, step };
}

// A calm, low-register progression: Cmaj7 – Am7 – Fmaj7 – G.
// Roots sit around C2–C3 so the piece stays warm on phone speakers.
const CHORDS = [
  [48, 55, 59, 64], // Cmaj7
  [45, 52, 55, 60], // Am7
  [41, 48, 52, 57], // Fmaj7
  [43, 50, 55, 59], // G
] as const;

// Sparse broken-chord pattern; nulls leave breathing room between tones.
const ARPEGGIO: ReadonlyArray<number | null> = [0, null, 2, null, 1, 3, null, 2];

// A slow, gentle melody that only sings a few notes per phrase,
// staying between G4 and E5 so it feels like soft piano touches.
const MELODY: ReadonlyArray<number | null> = [
  76, null, null, 74, null, null, 72, null,
  null, 71, null, null, null, null, null, null,
  72, null, null, 69, null, null, 67, null,
  null, 69, null, null, 72, null, null, null,
];

const midiToHz = (midi: number) => 440 * (2 ** ((midi - 69) / 12));

export type YouthMusicEngine = ReturnType<typeof createYouthMusicEngine>;

export function createYouthMusicEngine(context: AudioContext) {
  const mix = context.createGain();
  const filter = context.createBiquadFilter();
  const delay = context.createDelay(0.4);
  const delayWet = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const master = context.createGain();

  mix.gain.value = 0.95;
  filter.type = "lowpass";
  filter.frequency.value = 2400;
  filter.Q.value = 0.4;
  delay.delayTime.value = 0.21;
  delayWet.gain.value = 0.13;
  compressor.threshold.value = -12;
  compressor.knee.value = 6;
  compressor.ratio.value = 3.5;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.22;
  master.gain.value = EPSILON;

  mix.connect(filter);
  filter.connect(compressor);
  filter.connect(delay);
  delay.connect(delayWet);
  delayWet.connect(compressor);
  compressor.connect(master);
  master.connect(context.destination);

  const activeSources = new Set<OscillatorNode>();
  let schedulerTimer: number | null = null;
  let pauseTimer: number | null = null;
  let nextNoteTime = 0;
  let step = 0;
  let running = false;
  let destroyed = false;
  let generation = 0;

  const clearScheduler = () => {
    if (schedulerTimer !== null) {
      window.clearTimeout(schedulerTimer);
      schedulerTimer = null;
    }
  };

  const clearPauseTimer = () => {
    if (pauseTimer !== null) {
      window.clearTimeout(pauseTimer);
      pauseTimer = null;
    }
  };

  const schedulePartial = (
    frequency: number,
    start: number,
    peak: number,
    duration: number,
    type: OscillatorType,
    attack: number,
    detune = 0,
  ) => {
    if (destroyed || context.state === "closed") return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const shoulder = Math.min(duration * 0.32, 0.5);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.detune.setValueAtTime(detune, start);
    gain.gain.setValueAtTime(EPSILON, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(peak * 0.5, start + shoulder);
    gain.gain.exponentialRampToValueAtTime(EPSILON, start + duration);

    oscillator.connect(gain);
    gain.connect(mix);
    activeSources.add(oscillator);
    oscillator.onended = () => {
      activeSources.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  };

  // Piano-like voice: a soft fundamental with two quiet overtones that decay
  // faster than the fundamental, plus a slow attack for a gentle key touch.
  const scheduleTone = (
    midi: number,
    start: number,
    peak: number,
    duration: number,
    type: OscillatorType,
    attack: number,
    detune = 0,
  ) => {
    const fundamental = midiToHz(midi);
    schedulePartial(fundamental, start, peak, duration, type, attack, detune);
    schedulePartial(fundamental * 2, start, peak * 0.32, duration * 0.55, "sine", attack, detune);
    schedulePartial(fundamental * 3, start, peak * 0.1, duration * 0.3, "sine", attack, detune);
  };

  const scheduleStep = (scoreStep: number, time: number) => {
    const phrase = Math.floor(scoreStep / 8);
    const phraseStep = scoreStep % 8;
    const chord = CHORDS[phrase];

    const arpeggioIndex = ARPEGGIO[phraseStep];
    if (arpeggioIndex !== null) {
      scheduleTone(
        chord[arpeggioIndex],
        time,
        phraseStep === 0 ? 0.034 : 0.028,
        MUSIC_TIMING.arpeggioDuration,
        "sine",
        0.02,
        phraseStep % 2 ? 1.2 : -1.2,
      );
    }

    const melodyMidi = MELODY[scoreStep];
    if (melodyMidi !== null) {
      scheduleTone(
        melodyMidi,
        time + 0.015,
        phraseStep === 0 ? 0.05 : 0.042,
        MUSIC_TIMING.melodyDuration,
        "sine",
        0.025,
      );
    }

    // Soft root pedal at the start and middle of each phrase.
    if (phraseStep === 0 || phraseStep === 4) {
      scheduleTone(chord[0] - 12, time, 0.024, 2.8, "sine", 0.03);
    }
  };

  const runScheduler = () => {
    schedulerTimer = null;
    if (!running || destroyed || context.state === "closed") return;

    const plan = planMusicWindow({ nextNoteTime, step }, context.currentTime);
    nextNoteTime = plan.nextNoteTime;
    step = plan.step;
    plan.events.forEach((event) => scheduleStep(event.step, event.time));

    schedulerTimer = window.setTimeout(runScheduler, MUSIC_TIMING.lookAheadMs);
  };

  const start = () => {
    if (destroyed || context.state === "closed") return Promise.resolve(false);
    if (running && context.state === "running") return Promise.resolve(true);

    clearPauseTimer();
    const token = ++generation;
    const begin = async () => {
      try {
        await context.resume();
      } catch {
        return false;
      }
      if (destroyed || token !== generation || context.state !== "running") return false;

      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, EPSILON), now);
      master.gain.exponentialRampToValueAtTime(0.15, now + 0.6);
      running = true;
      nextNoteTime = now + MUSIC_TIMING.startDelaySeconds;
      clearScheduler();
      runScheduler();
      return true;
    };

    // Do not reuse a resume promise created by an autoplay attempt. Browsers
    // may leave that promise pending until a user gesture, and the click must
    // be allowed to call resume() again inside the gesture event itself.
    return begin();
  };

  const pause = () => {
    generation += 1;
    running = false;
    clearScheduler();
    clearPauseTimer();
    if (destroyed || context.state === "closed") return;

    const now = context.currentTime;
    const fadeEnd = now + 0.35;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, EPSILON), now);
    master.gain.exponentialRampToValueAtTime(EPSILON, fadeEnd);
    activeSources.forEach((source) => {
      try {
        source.stop(fadeEnd + 0.05);
      } catch {
        // A source may already have ended between the scheduler tick and pause.
      }
    });

    pauseTimer = window.setTimeout(() => {
      pauseTimer = null;
      if (!running && !destroyed && context.state === "running") void context.suspend();
    }, 450);
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    running = false;
    generation += 1;
    clearScheduler();
    clearPauseTimer();
    activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Ignore already-ended sources during teardown.
      }
    });
    activeSources.clear();
    void context.close();
  };

  return {
    start,
    pause,
    destroy,
    get isRunning() {
      return running;
    },
  };
}
