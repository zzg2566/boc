import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/youth-music.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const music = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const audioParam = (value = 0) => ({
  value,
  cancelScheduledValues() {},
  setValueAtTime(nextValue) { this.value = nextValue; },
  exponentialRampToValueAtTime(nextValue) { this.value = nextValue; },
});

const audioNode = (extra = {}) => ({
  connect() { return this; },
  disconnect() {},
  ...extra,
});

function createRetryableAudioContext() {
  let resolveBlockedResume;
  let resumeCalls = 0;
  const context = {
    state: "suspended",
    currentTime: 0,
    destination: audioNode(),
    createGain: () => audioNode({ gain: audioParam(1) }),
    createBiquadFilter: () => audioNode({ frequency: audioParam(), Q: audioParam(), type: "lowpass" }),
    createDelay: () => audioNode({ delayTime: audioParam() }),
    createDynamicsCompressor: () => audioNode({
      threshold: audioParam(),
      knee: audioParam(),
      ratio: audioParam(),
      attack: audioParam(),
      release: audioParam(),
    }),
    createOscillator: () => audioNode({
      frequency: audioParam(),
      detune: audioParam(),
      type: "sine",
      onended: null,
      start() {},
      stop() {},
    }),
    resume() {
      resumeCalls += 1;
      if (resumeCalls === 1) {
        return new Promise((resolve) => {
          resolveBlockedResume = () => {
            context.state = "running";
            resolve();
          };
        });
      }
      context.state = "running";
      return Promise.resolve();
    },
    suspend() {
      context.state = "suspended";
      return Promise.resolve();
    },
    close() {
      context.state = "closed";
      return Promise.resolve();
    },
    get resumeCalls() { return resumeCalls; },
    resolveBlockedResume() { resolveBlockedResume?.(); },
  };
  return context;
}

test("lookahead scheduling remains sample-clock aligned through timer jitter", () => {
  const { MUSIC_TIMING, planMusicWindow } = music;
  const callbackGaps = [0.05, 0.09, 0.17, 0.31, 0.07, 0.24, 0.12];
  let now = 0;
  let callbackIndex = 0;
  let position = { nextNoteTime: MUSIC_TIMING.startDelaySeconds, step: 0 };
  const onsets = [];

  // Collect a fixed number of onsets so the assertion stays valid at any tempo.
  while (onsets.length <= 120 && now < 300) {
    const plan = planMusicWindow(position, now);
    onsets.push(...plan.events.map((event) => event.time));
    position = { nextNoteTime: plan.nextNoteTime, step: plan.step };
    now += callbackGaps[callbackIndex % callbackGaps.length];
    callbackIndex += 1;
  }

  const differences = onsets.slice(1).map((time, index) => time - onsets[index]);
  assert.ok(differences.length > 100);
  differences.forEach((difference) => {
    assert.ok(Math.abs(difference - MUSIC_TIMING.stepSeconds) < 1e-9);
  });
  assert.ok(MUSIC_TIMING.scheduleAheadSeconds > Math.max(...callbackGaps));
});

test("a long suspended-tab jump skips missed notes without a catch-up burst", () => {
  const { MUSIC_TIMING, planMusicWindow } = music;
  const plan = planMusicWindow({ nextNoteTime: 0.8, step: 5 }, 6.2);

  assert.ok(plan.events.length > 0);
  assert.ok(plan.events.length <= MUSIC_TIMING.maxStepsPerTick);
  assert.ok(plan.events[0].time >= 6.2 + MUSIC_TIMING.startDelaySeconds);
  assert.ok(plan.events.every((event, index) => index === 0 || event.time > plan.events[index - 1].time));
});

test("voice tails overlap each eighth-note boundary", () => {
  const { MUSIC_TIMING } = music;
  assert.ok(MUSIC_TIMING.arpeggioDuration > MUSIC_TIMING.stepSeconds);
  assert.ok(MUSIC_TIMING.melodyDuration > MUSIC_TIMING.stepSeconds * 2);
});

test("a user gesture can retry a blocked autoplay resume", async () => {
  globalThis.window = globalThis;
  const context = createRetryableAudioContext();
  const engine = music.createYouthMusicEngine(context);

  const blockedAutoplay = engine.start();
  const userGestureStart = engine.start();

  assert.equal(context.resumeCalls, 2);
  assert.equal(await userGestureStart, true);
  assert.equal(engine.isRunning, true);

  engine.destroy();
  context.resolveBlockedResume();
  assert.equal(await blockedAutoplay, false);
});
