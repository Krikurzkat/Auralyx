import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from 'react';
import { useBeatDetection } from '../hooks/useBeatDetection';
/**
 * Example component demonstrating beat detection functionality
 * Allows users to upload audio files and displays BPM/tempo information
 */
export function BeatDetector() {
    const fileInputRef = useRef(null);
    const { result, isAnalyzing, error, detectFromFile, reset } = useBeatDetection();
    const handleFileChange = async (event) => {
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
    return (_jsxs("div", { className: "beat-detector p-6 max-w-md mx-auto bg-white rounded-lg shadow-md", children: [_jsx("h2", { className: "text-2xl font-bold mb-4", children: "Beat Detector" }), _jsxs("div", { className: "mb-4", children: [_jsx("input", { ref: fileInputRef, type: "file", accept: ".mp3,.mpeg,audio/mpeg,audio/mp3", onChange: handleFileChange, className: "hidden" }), _jsx("button", { onClick: handleButtonClick, disabled: isAnalyzing, className: "w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed", children: isAnalyzing ? 'Analyzing...' : 'Select Audio File' })] }), isAnalyzing && (_jsxs("div", { className: "text-center py-4", children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" }), _jsx("p", { className: "mt-2 text-gray-600", children: "Analyzing audio..." })] })), error && (_jsxs("div", { className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4", children: [_jsx("p", { className: "font-bold", children: "Error" }), _jsx("p", { children: error })] })), result && !isAnalyzing && (_jsxs("div", { className: "bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4", children: [_jsx("h3", { className: "font-bold mb-2", children: "Detection Results:" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("p", { children: [_jsx("span", { className: "font-semibold", children: "BPM:" }), " ", result.bpm.toFixed(2)] }), _jsxs("p", { children: [_jsx("span", { className: "font-semibold", children: "Offset:" }), " ", result.offset.toFixed(3), "s"] }), _jsxs("p", { children: [_jsx("span", { className: "font-semibold", children: "Tempo:" }), " ", result.tempo.toFixed(2)] })] }), _jsx("button", { onClick: handleReset, className: "mt-4 w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600", children: "Reset" })] })), _jsxs("div", { className: "mt-6 text-sm text-gray-600", children: [_jsx("p", { className: "font-semibold mb-2", children: "Supported formats:" }), _jsx("ul", { className: "list-disc list-inside", children: _jsx("li", { children: "MP3" }) })] })] }));
}
