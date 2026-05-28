# Beat Detection Integration Guide

This guide explains how to use the `web-audio-beat-detector` library in the Auralyx web application.

## Installation

The package has been added to `package.json`. To install dependencies, run:

```bash
npm install
```

## Available Utilities

### 1. Core Functions (`src/utils/beatDetector.ts`)

#### `analyzeTempo(audioBuffer: AudioBuffer): Promise<number>`
Analyzes an audio buffer and returns the detected tempo.

```typescript
import { analyzeTempo } from './utils/beatDetector';

const tempo = await analyzeTempo(audioBuffer);
console.log(`Detected tempo: ${tempo}`);
```

#### `guessBPM(audioBuffer: AudioBuffer): Promise<{ bpm, offset, tempo }>`
Guesses the BPM, offset, and tempo from an audio buffer.

```typescript
import { guessBPM } from './utils/beatDetector';

const { bpm, offset, tempo } = await guessBPM(audioBuffer);
console.log(`BPM: ${bpm}, Offset: ${offset}s, Tempo: ${tempo}`);
```

#### `loadAudioFile(file: File, audioContext?: AudioContext): Promise<AudioBuffer>`
Loads an audio file and converts it to an AudioBuffer.

```typescript
import { loadAudioFile } from './utils/beatDetector';

const audioBuffer = await loadAudioFile(file);
```

#### `detectBPMFromFile(file: File): Promise<{ bpm, offset, tempo }>`
Complete workflow: loads a file and detects BPM in one call.

```typescript
import { detectBPMFromFile } from './utils/beatDetector';

const result = await detectBPMFromFile(file);
console.log(`BPM: ${result.bpm}`);
```

### 2. React Hook (`src/hooks/useBeatDetection.ts`)

The `useBeatDetection` hook provides a convenient way to integrate beat detection into React components.

```typescript
import { useBeatDetection } from './hooks/useBeatDetection';

function MyComponent() {
  const { result, isAnalyzing, error, detectFromFile } = useBeatDetection();

  const handleFile = async (file: File) => {
    await detectFromFile(file);
  };

  return (
    <div>
      {isAnalyzing && <p>Analyzing...</p>}
      {error && <p>Error: {error}</p>}
      {result && <p>BPM: {result.bpm}</p>}
    </div>
  );
}
```

#### Hook API

- **`result`**: The detection result (`{ bpm, offset, tempo }`) or `null`
- **`isAnalyzing`**: Boolean indicating if analysis is in progress
- **`error`**: Error message string or `null`
- **`detectFromFile(file: File)`**: Analyze an audio file
- **`detectFromAudioBuffer(audioBuffer: AudioBuffer)`**: Analyze an existing AudioBuffer
- **`analyzeTempo(audioBuffer: AudioBuffer)`**: Analyze tempo only
- **`reset()`**: Clear results and errors

### 3. Example Component (`src/components/BeatDetector.tsx`)

A complete example component that demonstrates file upload and beat detection.

```typescript
import { BeatDetector } from './components/BeatDetector';

function App() {
  return <BeatDetector />;
}
```

## Usage Examples

### Example 1: Simple File Analysis

```typescript
import { detectBPMFromFile } from './utils/beatDetector';

async function analyzeSong(file: File) {
  try {
    const { bpm, offset, tempo } = await detectBPMFromFile(file);
    console.log(`Song BPM: ${bpm.toFixed(2)}`);
    console.log(`Beat offset: ${offset.toFixed(3)}s`);
    console.log(`Tempo: ${tempo.toFixed(2)}`);
  } catch (err) {
    console.error('Analysis failed:', err);
  }
}
```

### Example 2: Using with Existing AudioBuffer

```typescript
import { guessBPM } from './utils/beatDetector';

async function analyzeBuffer(audioBuffer: AudioBuffer) {
  try {
    const result = await guessBPM(audioBuffer);
    return result;
  } catch (err) {
    console.error('Failed to analyze:', err);
    throw err;
  }
}
```

### Example 3: React Component with File Input

```typescript
import { useState } from 'react';
import { useBeatDetection } from './hooks/useBeatDetection';

function MusicAnalyzer() {
  const { result, isAnalyzing, error, detectFromFile } = useBeatDetection();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await detectFromFile(file);
    }
  };

  return (
    <div>
      <input type="file" accept="audio/*" onChange={handleFileSelect} />
      
      {isAnalyzing && <div>Analyzing audio...</div>}
      
      {error && <div className="error">{error}</div>}
      
      {result && (
        <div className="results">
          <h3>Results:</h3>
          <p>BPM: {result.bpm.toFixed(2)}</p>
          <p>Offset: {result.offset.toFixed(3)}s</p>
          <p>Tempo: {result.tempo.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
```

### Example 4: Integration with Music Player

```typescript
import { useEffect } from 'react';
import { useBeatDetection } from './hooks/useBeatDetection';
import { useMusicStore } from './stores/musicStore';

function MusicPlayer() {
  const currentTrack = useMusicStore((state) => state.currentTrack);
  const { result, detectFromFile } = useBeatDetection();

  useEffect(() => {
    if (currentTrack?.file) {
      detectFromFile(currentTrack.file);
    }
  }, [currentTrack, detectFromFile]);

  useEffect(() => {
    if (result) {
      // Use BPM for visualizations, sync effects, etc.
      console.log(`Track BPM: ${result.bpm}`);
      // Update visualizer with beat information
      // Sync animations to detected tempo
    }
  }, [result]);

  return (
    <div>
      {/* Player UI */}
      {result && <div>♪ {result.bpm.toFixed(0)} BPM</div>}
    </div>
  );
}
```

## Supported Audio Formats

The beat detector works with any audio format supported by the Web Audio API:
- MP3
- WAV
- OGG
- M4A
- FLAC
- AAC

## Performance Considerations

1. **Processing Time**: Beat detection can take several seconds for longer tracks
2. **Memory Usage**: Large audio files require significant memory for decoding
3. **UI Responsiveness**: Always show loading indicators during analysis
4. **Error Handling**: Implement proper error handling for unsupported formats or corrupted files

## Best Practices

1. **Show Progress**: Always display a loading state during analysis
2. **Handle Errors**: Provide user-friendly error messages
3. **Cleanup**: Close AudioContext instances when done to free resources
4. **Debounce**: If analyzing multiple files, consider debouncing or queuing
5. **Cache Results**: Store BPM results to avoid re-analyzing the same file

## Troubleshooting

### "Failed to decode audio data"
- The audio file format may not be supported
- The file may be corrupted
- Try converting to a different format (MP3 or WAV)

### "Tempo analysis failed"
- The audio may not have a clear beat pattern
- Try with music that has a strong rhythmic component
- Ambient or classical music may not work well

### Memory Issues
- Large files (>100MB) may cause memory problems
- Consider compressing audio files before analysis
- Close AudioContext instances after use

## API Reference

### Types

```typescript
interface BeatDetectionResult {
  bpm: number;        // Beats per minute
  offset: number;     // Time offset of first beat in seconds
  tempo: number;      // Detected tempo value
}
```

## Next Steps

- Integrate beat detection with the music visualizer
- Add BPM display to the music player UI
- Use tempo information for synchronized animations
- Implement beat-synced visual effects
- Store BPM metadata with music library entries
