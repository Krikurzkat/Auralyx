import { isMobileDevice } from './performanceOptimizations';

interface SharedAudioGraph {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  frequencyData: Uint8Array<ArrayBuffer> | null;
  timeDomainData: Uint8Array<ArrayBuffer> | null;
  analyserHasDestination: boolean;
  sourceNodes: WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>;
}

const globalWithAudioGraph = globalThis as typeof globalThis & {
  __auralyxAudioGraph?: SharedAudioGraph;
};
const sharedGraph = globalWithAudioGraph.__auralyxAudioGraph ??= {
  audioContext: null,
  analyser: null,
  frequencyData: null,
  timeDomainData: null,
  analyserHasDestination: false,
  sourceNodes: new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>(),
};

let audioContext = sharedGraph.audioContext;
let analyser = sharedGraph.analyser;
let frequencyData = sharedGraph.frequencyData;
let timeDomainData = sharedGraph.timeDomainData;
let analyserHasDestination = sharedGraph.analyserHasDestination;
const sourceNodes = sharedGraph.sourceNodes;

export interface AudioBands {
  bass: number;
  mids: number;
  treble: number;
}

const silentBands: AudioBands = { bass: 0, mids: 0, treble: 0 };
let currentBands = silentBands;
let bandTimer: ReturnType<typeof setTimeout> | null = null;
let lastSpectrumSampleAt = 0;
let lastBandUpdateAt = 0;
const bandListeners = new Set<(bands: AudioBands) => void>();
let spectrumSubscribers = 0;
// Sample often enough to feed 30–60 FPS visualizers while avoiding redundant
// FFT reads on every other display frame.
const getAudioSampleIntervalMs = () => isMobileDevice() ? 48 : 24;
const getAudioBandUpdateIntervalMs = () => isMobileDevice() ? 80 : 34;

/** Connects app-owned local audio elements once, preserving the normal output path. */
export async function connectLocalAudioForVisualization(elements: Array<HTMLAudioElement | null>) {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return null;
  const localElements = elements.filter((element): element is HTMLAudioElement => {
    const mediaUrl = element?.src || element?.currentSrc || '';
    return Boolean(element && mediaUrl.startsWith('blob:'));
  });
  if (localElements.length === 0) return null;

  try {
    audioContext ??= new AudioContext();
    sharedGraph.audioContext = audioContext;
    analyser ??= audioContext.createAnalyser();
    sharedGraph.analyser = analyser;
    analyser.fftSize = 2048;
    // Preserve quick response while giving bass, vocal, and treble bands finer
    // frequency resolution for the queue spectrum.
    analyser.smoothingTimeConstant = 0.32;
    if (!frequencyData || frequencyData.length !== analyser.frequencyBinCount) {
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      sharedGraph.frequencyData = frequencyData;
    }
    if (!timeDomainData || timeDomainData.length !== analyser.fftSize) {
      timeDomainData = new Uint8Array(analyser.fftSize);
      sharedGraph.timeDomainData = timeDomainData;
    }

    // Ensure any source added below always has a live output route.
    if (!analyserHasDestination) {
      analyser.connect(audioContext.destination);
      analyserHasDestination = true;
      sharedGraph.analyserHasDestination = true;
    }

    // Never retain a pending resume promise: a request made before a gesture
    // can remain pending and block the next retry from the user's Play click.
    if (audioContext.state === 'closed') return null;
    if (audioContext.state !== 'running') {
      try {
        await audioContext.resume();
      } catch {
        return null;
      }
    }
    if (audioContext.state !== 'running') return null;

    for (const element of localElements) {
      if (!element || sourceNodes.has(element)) continue;
      const source = audioContext.createMediaElementSource(element);
      sourceNodes.set(element, source);
      try {
        source.connect(analyser);
      } catch {
        // If analysis wiring fails, keep audible output routed directly.
        source.connect(audioContext.destination);
      }
    }

    startBandSampling();
    return analyser;
  } catch (error) {
    // Leave playback untouched if a browser cannot create the visualization graph.
    console.warn('Audio visualization is unavailable in this browser:', error);
    return null;
  }
}

/** Maps the live spectrum into logarithmically spaced bars for the canvas. */
export function readAudioSpectrum(target: number[]) {
  if (!analyser || !frequencyData || target.length === 0) return false;

  // Keep the canvas live even if the timer subscription is unavailable.
  const now = performance.now();
  if (bandListeners.size === 0 && spectrumSubscribers === 0 && now - lastSpectrumSampleAt >= getAudioSampleIntervalMs()) {
    analyser.getByteFrequencyData(frequencyData);
    if (timeDomainData) analyser.getByteTimeDomainData(timeDomainData);
    lastSpectrumSampleAt = now;
  }

  // The shared sampler refreshes this buffer for the mini-player and canvas.
  const lastBin = frequencyData.length - 1;

  for (let index = 0; index < target.length; index += 1) {
    const low = Math.floor((index / target.length) ** 2 * lastBin);
    const high = Math.max(low + 1, Math.floor(((index + 1) / target.length) ** 2 * lastBin));
    let total = 0;
    for (let bin = low; bin <= Math.min(high, lastBin); bin += 1) total += frequencyData[bin];
    const count = Math.max(1, Math.min(high, lastBin) - low + 1);
    const average = total / count / 255;
    target[index] = Math.pow(average, 0.65) * 100;
  }

  return true;
}

/** Reads the current audio waveform, sampled evenly across the shared time buffer. */
export function readAudioWaveform(target: number[]) {
  if (!analyser || !frequencyData || !timeDomainData || target.length === 0) return false;

  const now = performance.now();
  if (bandListeners.size === 0 && spectrumSubscribers === 0 && now - lastSpectrumSampleAt >= getAudioSampleIntervalMs()) {
    analyser.getByteFrequencyData(frequencyData);
    analyser.getByteTimeDomainData(timeDomainData);
    lastSpectrumSampleAt = now;
  }

  const lastSample = timeDomainData.length - 1;
  for (let index = 0; index < target.length; index += 1) {
    const sampleIndex = Math.round((index / Math.max(1, target.length - 1)) * lastSample);
    target[index] = ((timeDomainData[sampleIndex] - 128) / 128) * 100;
  }

  return true;
}

function readBandAverage(lowHz: number, highHz: number) {
  if (!analyser || !frequencyData || !audioContext) return 0;
  const binHz = audioContext.sampleRate / analyser.fftSize;
  const low = Math.max(0, Math.floor(lowHz / binHz));
  const high = Math.min(frequencyData.length - 1, Math.ceil(highHz / binHz));
  let sum = 0;
  let peak = 0;
  for (let i = low; i <= high; i += 1) sum += frequencyData[i];
  for (let i = low; i <= high; i += 1) peak = Math.max(peak, frequencyData[i]);
  if (high < low) return 0;
  const average = sum / (high - low + 1) / 255;
  const combinedLevel = average * 0.45 + (peak / 255) * 0.55;
  return Math.min(1, Math.pow(combinedLevel, 0.65));
}

function sampleAudioBands() {
  bandTimer = null;
  if (
    (typeof document !== 'undefined' && document.hidden) ||
    (bandListeners.size === 0 && spectrumSubscribers === 0) ||
    !analyser ||
    !frequencyData
  ) return;

  analyser.getByteFrequencyData(frequencyData);
  if (timeDomainData) analyser.getByteTimeDomainData(timeDomainData);
  const sampledAt = performance.now();
  lastSpectrumSampleAt = sampledAt;
  if (bandListeners.size > 0 && sampledAt - lastBandUpdateAt >= getAudioBandUpdateIntervalMs()) {
    lastBandUpdateAt = sampledAt;
    currentBands = {
      bass: readBandAverage(35, 250),
      mids: readBandAverage(250, 4000),
      treble: readBandAverage(4000, 12000),
    };
    bandListeners.forEach((listener) => listener(currentBands));
  }

  bandTimer = setTimeout(
    sampleAudioBands,
    spectrumSubscribers > 0 ? getAudioSampleIntervalMs() : getAudioBandUpdateIntervalMs()
  );
}

function startBandSampling() {
  if (
    analyser &&
    (typeof document === 'undefined' || !document.hidden) &&
    (bandListeners.size > 0 || spectrumSubscribers > 0) &&
    bandTimer === null
  ) {
    bandTimer = setTimeout(sampleAudioBands, 0);
  }
}

function handleAudioVisibilityChange() {
  if (document.hidden) {
    if (bandTimer !== null) clearTimeout(bandTimer);
    bandTimer = null;
    return;
  }
  startBandSampling();
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', handleAudioVisibilityChange);
}

/** Keeps the shared FFT buffer fresh while the full-screen visualizer is open. */
export function subscribeAudioSpectrum() {
  spectrumSubscribers += 1;
  startBandSampling();

  return () => {
    spectrumSubscribers = Math.max(0, spectrumSubscribers - 1);
    if (spectrumSubscribers === 0 && bandListeners.size === 0 && bandTimer !== null) {
      clearTimeout(bandTimer);
      bandTimer = null;
    }
  };
}

export function subscribeAudioBands(listener: (bands: AudioBands) => void) {
  bandListeners.add(listener);
  listener(currentBands);
  startBandSampling();

  return () => {
    bandListeners.delete(listener);
    if (bandListeners.size === 0 && bandTimer !== null) {
      clearTimeout(bandTimer);
      bandTimer = null;
    }
  };
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleAudioVisibilityChange);
    }
    if (bandTimer !== null) clearTimeout(bandTimer);
    bandTimer = null;
    bandListeners.clear();
    spectrumSubscribers = 0;
  });
}
