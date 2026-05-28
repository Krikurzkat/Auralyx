import { useState, useCallback } from 'react';
import { detectBPMFromFile, analyzeTempo, guessBPM } from '../utils/beatDetector';

interface BeatDetectionResult {
  bpm: number;
  offset: number;
  tempo: number;
}

interface UseBeatDetectionReturn {
  result: BeatDetectionResult | null;
  isAnalyzing: boolean;
  error: string | null;
  detectFromFile: (file: File) => Promise<void>;
  detectFromAudioBuffer: (audioBuffer: AudioBuffer) => Promise<void>;
  analyzeTempo: (audioBuffer: AudioBuffer) => Promise<void>;
  reset: () => void;
}

/**
 * React hook for beat detection functionality
 * Provides methods to analyze audio files and buffers for BPM and tempo
 */
export function useBeatDetection(): UseBeatDetectionReturn {
  const [result, setResult] = useState<BeatDetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectFromFile = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const detectionResult = await detectBPMFromFile(file);
      setResult(detectionResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Beat detection error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const detectFromAudioBuffer = useCallback(async (audioBuffer: AudioBuffer) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const detectionResult = await guessBPM(audioBuffer);
      setResult(detectionResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Beat detection error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const analyzeTempoOnly = useCallback(async (audioBuffer: AudioBuffer) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const tempo = await analyzeTempo(audioBuffer);
      setResult({ bpm: 0, offset: 0, tempo });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Tempo analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsAnalyzing(false);
  }, []);

  return {
    result,
    isAnalyzing,
    error,
    detectFromFile,
    detectFromAudioBuffer,
    analyzeTempo: analyzeTempoOnly,
    reset,
  };
}
