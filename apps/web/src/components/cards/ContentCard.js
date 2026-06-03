import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { RiPlayFill } from 'react-icons/ri';
export default function ContentCard({ id, title, subtitle, gradient, coverUrl, type, round = false, onClick }) {
    const navigate = useNavigate();
    const handleClick = () => {
        if (onClick) {
            onClick();
            return;
        }
        switch (type) {
            case 'album':
                navigate(`/album/${id}`);
                break;
            case 'artist':
                navigate(`/artist/${id}`);
                break;
            case 'playlist':
                navigate(`/playlist/${id}`);
                break;
            case 'podcast':
                navigate(`/podcast/${id}`);
                break;
            case 'category':
                navigate(`/search?category=${id}`);
                break;
        }
    };
    const handlePlay = (e) => {
        e.stopPropagation();
        handleClick();
    };
    return (_jsxs("div", { onClick: handleClick, role: "button", tabIndex: 0, className: "group w-full cursor-pointer rounded-md border border-white/5 bg-glass-card backdrop-blur-xl/80 p-1.5 text-left transition-all hover:-translate-y-0.5 hover:border-white/10 hover:bg-glass-card backdrop-blur-xl hover:shadow-card-hover", children: [_jsxs("div", { className: "relative mb-1", children: [coverUrl ? (_jsx("img", { src: coverUrl, alt: title, className: `aspect-square w-full ${round ? 'rounded-full' : 'rounded-sm'} object-cover` })) : (_jsx("div", { className: `aspect-square w-full ${round ? 'rounded-full' : 'rounded-sm'}`, style: {
                            background: gradient
                                ? `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
                                : 'linear-gradient(135deg, #333, #222)',
                        }, children: _jsx("div", { className: `flex h-full w-full items-center justify-center ${round ? 'rounded-full' : 'rounded-sm'} text-sm font-bold text-white/20`, children: type === 'artist' ? title[0] : '♪' }) })), _jsx("button", { onClick: handlePlay, className: "play-overlay absolute bottom-0.5 right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow-sm transition hover:scale-105 hover:bg-accent-hover", children: _jsx(RiPlayFill, { size: 12, className: "ml-0.5" }) })] }), _jsx("h3", { className: "truncate text-[10px] font-semibold leading-tight", children: title }), _jsx("p", { className: "truncate text-[8px] text-softText leading-tight", children: subtitle })] }));
}
