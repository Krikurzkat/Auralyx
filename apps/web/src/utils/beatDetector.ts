import { analyze, guess } from 'web-audio-beat-detector';

/**
 * Analyzes an audio buffer to detect tempo
 * @param audioBuffer - The AudioBuffer to analyze
 * @returns Promise resolving to the detected tempo
 */
export async function analyzeTempo(audioBuffer: AudioBuffer): Promise<number> {
  try {
    const tempo = await analyze(audioBuffer);
    return tempo;
  } catch (err) {
    console.error('Failed to analyze tempo:', err);
    throw new Error('Tempo analysis failed');
  }
}

/**
 * Guesses BPM, offset, and tempo from an audio buffer
 * @param audioBuffer - The AudioBuffer to analyze
 * @returns Promise resolving to an object containing bpm, offset, and tempo
 */
export async function guessBPM(audioBuffer: AudioBuffer): Promise<{
  bpm: number;
  offset: number;
  tempo: number;
}> {
  try {
    const result = await guess(audioBuffer);
    return {
      bpm: result.bpm,
      offset: result.offset,
      tempo: result.tempo,
    };
  } catch (err) {
    console.error('Failed to guess BPM:', err);
    throw new Error('BPM detection failed');
  }
}

/**
 * Loads an audio file and returns an AudioBuffer
 * @param file - The audio file to load
 * @param audioContext - Optional AudioContext instance (creates new one if not provided)
 * @returns Promise resolving to an AudioBuffer
 */
export async function loadAudioFile(
  file: File,
  audioContext?: AudioContext
): Promise<AudioBuffer> {
  const context = audioContext || new AudioContext();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        resolve(audioBuffer);
      } catch (err) {
        reject(new Error('Failed to decode audio data'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Complete workflow: Load audio file and detect BPM
 * @param file - The audio file to analyze
 * @returns Promise resolving to BPM detection results
 */
export async function detectBPMFromFile(file: File): Promise<{
  bpm: number;
  offset: number;
  tempo: number;
}> {
  const audioContext = new AudioContext();
  const audioBuffer = await loadAudioFile(file, audioContext);
  const result = await guessBPM(audioBuffer);
  
  // Clean up
  await audioContext.close();
  
  return result;
}
