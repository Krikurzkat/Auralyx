import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { RiMicLine } from 'react-icons/ri';
export default function PodcastPage() {
    const navigate = useNavigate();
    return (_jsxs("div", { className: "flex h-[70vh] flex-col items-center justify-center text-center px-4", children: [_jsx(RiMicLine, { size: 80, className: "text-dimText mb-6" }), _jsx("h1", { className: "text-4xl font-bold text-white mb-4", children: "Podcasts Not Supported" }), _jsx("p", { className: "text-softText max-w-md mx-auto mb-8", children: "Total Music is currently optimized for your Music library. Online podcasts are not supported in this offline-first environment." }), _jsx("button", { onClick: () => navigate('/local'), className: "rounded-full bg-accent px-6 py-3 font-bold text-white shadow-glow transition hover:scale-105", children: "Go to Local Library" })] }));
}
