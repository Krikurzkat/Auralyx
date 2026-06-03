import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { formatDuration } from '../../utils/formatters';
import { useEffect, useState, useRef } from 'react';
import { RiArrowLeftLine, RiSkipBackFill, RiPlayFill, RiPauseFill, RiSkipForwardFill, RiHeartLine, RiHeartFill, RiShuffleLine, RiRepeatLine, RiRepeat2Line, RiRepeatOneLine, RiEqualizerLine, RiPulseLine, RiSoundModuleLine, } from 'react-icons/ri';
export default function VisualizerPlayer({ onClose }) {
    const { currentTrack, isPlaying, currentTime, duration, shuffle, repeat, togglePlay, nextTrack, prevTrack, toggleShuffle, cycleRepeat, seekTo, } = usePlayerStore();
    const { likedTrackIds, toggleLike } = useLibraryStore();
    const [visualizerMode, setVisualizerMode] = useState('bars');
    const [audioData, setAudioData] = useState(Array(64).fill(0));
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const isLiked = currentTrack ? likedTrackIds.has(currentTrack.id) : false;
    const RepeatIcon = repeat === 'one' ? RiRepeatOneLine : repeat === 'all' ? RiRepeat2Line : RiRepeatLine;
    // Simulate audio data (in real app, this would come from Web Audio API)
    useEffect(() => {
        if (!isPlaying) {
            setAudioData(Array(64).fill(0));
            return;
        }
        const interval = setInterval(() => {
            setAudioData(Array(64)
                .fill(0)
                .map(() => Math.random() * 100));
        }, 50);
        return () => clearInterval(interval);
    }, [isPlaying]);
    // Canvas visualization
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        const resize = () => {
            canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        resize();
        window.addEventListener('resize', resize);
        const draw = () => {
            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight;
            ctx.clearRect(0, 0, width, height);
            if (visualizerMode === 'bars') {
                drawBars(ctx, width, height);
            }
            else if (visualizerMode === 'wave') {
                drawWave(ctx, width, height);
            }
            else if (visualizerMode === 'circular') {
                drawCircular(ctx, width, height);
            }
            animationRef.current = requestAnimationFrame(draw);
        };
        draw();
        return () => {
            window.removeEventListener('resize', resize);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [audioData, visualizerMode]);
    const drawBars = (ctx, width, height) => {
        const barCount = audioData.length;
        const barWidth = width / barCount;
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#E8470A');
        gradient.addColorStop(0.5, '#FF6B35');
        gradient.addColorStop(1, '#FFB627');
        audioData.forEach((value, i) => {
            const barHeight = (value / 100) * height * 0.8;
            const x = i * barWidth;
            const y = height - barHeight;
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth - 2, barHeight);
            // Reflection
            ctx.globalAlpha = 0.2;
            ctx.fillRect(x, height, barWidth - 2, -barHeight * 0.3);
            ctx.globalAlpha = 1;
        });
    };
    const drawWave = (ctx, width, height) => {
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#E8470A');
        gradient.addColorStop(0.5, '#FF6B35');
        gradient.addColorStop(1, '#FFB627');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const sliceWidth = width / audioData.length;
        audioData.forEach((value, i) => {
            const x = i * sliceWidth;
            const y = height / 2 + ((value - 50) / 100) * height * 0.4;
            if (i === 0) {
                ctx.moveTo(x, y);
            }
            else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        // Second wave (offset)
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        audioData.forEach((value, i) => {
            const x = i * sliceWidth;
            const y = height / 2 + ((value - 50) / 100) * height * 0.3 + 20;
            if (i === 0) {
                ctx.moveTo(x, y);
            }
            else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        ctx.globalAlpha = 1;
    };
    const drawCircular = (ctx, width, height) => {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.3;
        const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * 1.5);
        gradient.addColorStop(0, '#E8470A');
        gradient.addColorStop(0.5, '#FF6B35');
        gradient.addColorStop(1, '#FFB627');
        audioData.forEach((value, i) => {
            const angle = (i / audioData.length) * Math.PI * 2 - Math.PI / 2;
            const barHeight = (value / 100) * radius * 0.8;
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });
        // Inner circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.9, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(232, 71, 10, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    };
    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        seekTo(percent * duration);
    };
    if (!currentTrack) {
        return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black", children: _jsx("p", { className: "text-white/70", children: "No track currently playing" }) }));
    }
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const coverUrl = currentTrack.coverUrl?.startsWith('/')
        ? `http://localhost:3001${currentTrack.coverUrl}`
        : currentTrack.coverUrl;
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex h-screen flex-col justify-between overflow-hidden bg-gradient-to-b from-[#0A0A0C] via-[#121216] to-[#050506] text-white", children: [_jsxs("div", { className: "flex items-center justify-between p-6", children: [_jsxs("button", { onClick: onClose, className: "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/95 shadow-md backdrop-blur-md transition hover:bg-white/10 active:scale-95", "aria-label": "Exit visualizer", children: [_jsx(RiArrowLeftLine, { size: 20 }), _jsx("span", { children: "Exit Visualizer" })] }), _jsxs("div", { className: "flex items-center gap-2 rounded-full border border-white/5 bg-black/30 p-1 backdrop-blur-md", children: [_jsx("button", { onClick: () => setVisualizerMode('bars'), className: `rounded-full p-2.5 transition active:scale-90 ${visualizerMode === 'bars'
                                    ? 'bg-accent text-white shadow-glow-sm'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'}`, "aria-label": "Bar visualizer", children: _jsx(RiEqualizerLine, { size: 18 }) }), _jsx("button", { onClick: () => setVisualizerMode('wave'), className: `rounded-full p-2.5 transition active:scale-90 ${visualizerMode === 'wave'
                                    ? 'bg-accent text-white shadow-glow-sm'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'}`, "aria-label": "Wave visualizer", children: _jsx(RiPulseLine, { size: 18 }) }), _jsx("button", { onClick: () => setVisualizerMode('circular'), className: `rounded-full p-2.5 transition active:scale-90 ${visualizerMode === 'circular'
                                    ? 'bg-accent text-white shadow-glow-sm'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'}`, "aria-label": "Circular visualizer", children: _jsx(RiSoundModuleLine, { size: 18 }) })] })] }), _jsx("div", { className: "flex flex-1 min-h-0 items-center justify-center p-6", children: _jsx("canvas", { ref: canvasRef, className: "h-full w-full rounded-2xl bg-black/10 border border-white/5 shadow-inner", style: { maxWidth: '1000px', maxHeight: '420px' } }) }), _jsx("div", { className: "bg-gradient-to-t from-black via-black/90 to-transparent p-6 pt-10", children: _jsxs("div", { className: "mx-auto max-w-4xl", children: [_jsxs("div", { className: "mb-5 flex items-center gap-4", children: [_jsx("div", { className: "h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-lg", children: coverUrl ? (_jsx("img", { src: coverUrl, alt: currentTrack.title, className: "h-full w-full object-cover" })) : (_jsx("div", { className: "h-full w-full", style: {
                                            background: `linear-gradient(135deg, ${currentTrack.coverGradient?.[0] || '#333'}, ${currentTrack.coverGradient?.[1] || '#222'})`,
                                        } })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h1", { className: "truncate text-lg font-bold text-white", children: currentTrack.title }), _jsx("p", { className: "truncate text-sm font-medium text-white/60", children: currentTrack.artist })] }), _jsx("button", { onClick: () => toggleLike(currentTrack.id), className: "flex h-12 w-12 items-center justify-center rounded-full border border-white/5 bg-white/5 text-white/80 transition hover:bg-white/10 active:scale-95", "aria-label": isLiked ? 'Unlike' : 'Like', children: isLiked ? _jsx(RiHeartFill, { size: 22, className: "text-accent" }) : _jsx(RiHeartLine, { size: 22 }) })] }), _jsxs("div", { className: "mb-5", children: [_jsx("div", { onClick: handleSeek, className: "group relative h-1.5 cursor-pointer rounded-full bg-white/10 transition-all hover:h-2", children: _jsx("div", { className: "h-full rounded-full transition-all duration-100", style: {
                                            width: `${progressPercent}%`,
                                            background: `linear-gradient(to right, var(--gradient-from), var(--gradient-to))`
                                        } }) }), _jsxs("div", { className: "mt-2 flex justify-between text-xs font-semibold text-white/40", children: [_jsx("span", { children: formatDuration(currentTime) }), _jsx("span", { children: formatDuration(duration) })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: toggleShuffle, className: `flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90 ${shuffle ? 'bg-accent/15 text-accent border border-accent/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`, "aria-label": "Toggle shuffle", children: _jsx(RiShuffleLine, { size: 20 }) }), _jsx("button", { onClick: cycleRepeat, className: `flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90 ${repeat !== 'off' ? 'bg-accent/15 text-accent border border-accent/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`, "aria-label": "Toggle repeat", children: _jsx(RepeatIcon, { size: 20 }) })] }), _jsxs("div", { className: "flex items-center gap-5", children: [_jsx("button", { onClick: prevTrack, className: "flex h-12 w-12 items-center justify-center rounded-full text-white/80 transition hover:bg-white/5 active:scale-90", "aria-label": "Previous track", children: _jsx(RiSkipBackFill, { size: 26 }) }), _jsx("button", { onClick: togglePlay, className: "flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/25 transition hover:scale-105 active:scale-95", "aria-label": isPlaying ? 'Pause' : 'Play', children: isPlaying ? _jsx(RiPauseFill, { size: 32 }) : _jsx(RiPlayFill, { size: 32, className: "ml-1" }) }), _jsx("button", { onClick: nextTrack, className: "flex h-12 w-12 items-center justify-center rounded-full text-white/80 transition hover:bg-white/5 active:scale-90", "aria-label": "Next track", children: _jsx(RiSkipForwardFill, { size: 26 }) })] }), _jsx("div", { className: "w-20" })] })] }) }), _jsx("div", { className: "pointer-events-none absolute inset-0", children: isPlaying &&
                    Array(15)
                        .fill(0)
                        .map((_, i) => (_jsx("div", { className: "absolute h-1 w-1 animate-pulse rounded-full bg-accent/20", style: {
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${2 + Math.random() * 3}s`,
                        } }, i))) })] }));
}
