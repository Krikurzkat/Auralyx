import { useState, useCallback } from 'react';
import { detectBPMFromFile, analyzeTempo, guessBPM } from '../utils/beatDetector';
/**
 * React hook for beat detection functionality
 * Provides methods to analyze audio files and buffers for BPM and tempo
 */
export function useBeatDetection() {
    const [result, setResult] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const detectFromFile = useCallback(async (file) => {
        setIsAnalyzing(true);
        setError(null);
        setResult(null);
        try {
            const detectionResult = await detectBPMFromFile(file);
            setResult(detectionResult);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            console.error('Beat detection error:', err);
        }
        finally {
            setIsAnalyzing(false);
        }
    }, []);
    const detectFromAudioBuffer = useCallback(async (audioBuffer) => {
        setIsAnalyzing(true);
        setError(null);
        setResult(null);
        try {
            const detectionResult = await guessBPM(audioBuffer);
            setResult(detectionResult);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            console.error('Beat detection error:', err);
        }
        finally {
            setIsAnalyzing(false);
        }
    }, []);
    const analyzeTempoOnly = useCallback(async (audioBuffer) => {
        setIsAnalyzing(true);
        setError(null);
        setResult(null);
        try {
            const tempo = await analyzeTempo(audioBuffer);
            setResult({ bpm: 0, offset: 0, tempo });
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            console.error('Tempo analysis error:', err);
        }
        finally {
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
