import { useRef } from 'react';
import { useBeatDetection } from '../hooks/useBeatDetection';

/**
 * Example component demonstrating beat detection functionality
 * Allows users to upload audio files and displays BPM/tempo information
 */
export function BeatDetector() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { result, isAnalyzing, error, detectFromFile, reset } = useBeatDetection();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await detectFromFile(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="beat-detector p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Beat Detector</h2>
      
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.mpeg,audio/mpeg,audio/mp3"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={handleButtonClick}
          disabled={isAnalyzing}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? 'Analyzing...' : 'Select Audio File'}
        </button>
      </div>

      {isAnalyzing && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Analyzing audio...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {result && !isAnalyzing && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <h3 className="font-bold mb-2">Detection Results:</h3>
          <div className="space-y-2">
            <p>
              <span className="font-semibold">BPM:</span> {result.bpm.toFixed(2)}
            </p>
            <p>
              <span className="font-semibold">Offset:</span> {result.offset.toFixed(3)}s
            </p>
            <p>
              <span className="font-semibold">Tempo:</span> {result.tempo.toFixed(2)}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="mt-4 w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Reset
          </button>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <p className="font-semibold mb-2">Supported formats:</p>
        <ul className="list-disc list-inside">
          <li>MP3</li>
        </ul>
      </div>
    </div>
  );
}
