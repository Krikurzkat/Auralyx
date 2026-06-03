import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
export default function Meteors({ number = 10 }) {
    const [meteors, setMeteors] = useState([]);
    useEffect(() => {
        // Generate meteors only on client to avoid hydration mismatch
        const newMeteors = new Array(number).fill(true).map((_, i) => ({
            id: i,
            // Start from anywhere across the width and slightly offscreen to the right
            left: Math.floor(Math.random() * 120) + "vw",
            delay: (Math.random() * 8 + 0.2).toFixed(2) + "s",
            duration: Math.floor(Math.random() * 6 + 3) + "s",
        }));
        setMeteors(newMeteors);
    }, [number]);
    return (_jsx("div", { className: "absolute inset-0 overflow-hidden pointer-events-none z-0", children: meteors.map((meteor) => (_jsx("span", { className: "animate-meteor absolute top-0 h-0.5 w-0.5 rounded-full bg-white shadow-[0_0_0_1px_#ffffff10] rotate-[215deg]", style: {
                left: meteor.left,
                animationDelay: meteor.delay,
                animationDuration: meteor.duration,
            }, children: _jsx("div", { className: "pointer-events-none absolute top-1/2 -z-10 h-px w-[80px] -translate-y-1/2 bg-gradient-to-r from-white/60 to-transparent" }) }, meteor.id))) }));
}
