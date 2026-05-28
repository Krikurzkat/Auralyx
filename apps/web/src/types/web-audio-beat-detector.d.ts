declare module 'web-audio-beat-detector' {
  export function analyze(audioBuffer: AudioBuffer): Promise<number>;

  export function guess(audioBuffer: AudioBuffer): Promise<{
    bpm: number;
    offset: number;
    tempo: number;
  }>;
}
