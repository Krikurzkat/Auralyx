import { useNavigate } from 'react-router-dom';
import { RiPlayFill } from 'react-icons/ri';

interface ContentCardProps {
  id: string;
  title: string;
  subtitle: string;
  gradient?: [string, string];
  coverUrl?: string;
  type: 'album' | 'artist' | 'playlist' | 'podcast' | 'category';
  round?: boolean;
  onClick?: () => void;
}

export default function ContentCard({ id, title, subtitle, gradient, coverUrl, type, round = false, onClick }: ContentCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    switch (type) {
      case 'album': navigate(`/album/${id}`); break;
      case 'artist': navigate(`/artist/${id}`); break;
      case 'playlist': navigate(`/playlist/${id}`); break;
      case 'podcast': navigate(`/podcast/${id}`); break;
      case 'category': navigate(`/search?category=${id}`); break;
    }
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick();
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      className="group w-full cursor-pointer rounded-md border border-white/5 bg-card/80 p-1.5 text-left transition-all hover:-translate-y-0.5 hover:border-white/10 hover:bg-card hover:shadow-card-hover"
    >
      <div className="relative mb-1">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className={`aspect-square w-full ${round ? 'rounded-full' : 'rounded-sm'} object-cover`}
          />
        ) : (
          <div
            className={`aspect-square w-full ${round ? 'rounded-full' : 'rounded-sm'}`}
            style={{
              background: gradient
                ? `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
                : 'linear-gradient(135deg, #333, #222)',
            }}
          >
            <div className={`flex h-full w-full items-center justify-center ${round ? 'rounded-full' : 'rounded-sm'} text-sm font-bold text-white/20`}>
              {type === 'artist' ? title[0] : '♪'}
            </div>
          </div>
        )}
        {/* Play button overlay */}
        <button
          onClick={handlePlay}
          className="play-overlay absolute bottom-0.5 right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow-sm transition hover:scale-105 hover:bg-accent-hover"
        >
          <RiPlayFill size={12} className="ml-0.5" />
        </button>
      </div>
      <h3 className="truncate text-[10px] font-semibold leading-tight">{title}</h3>
      <p className="truncate text-[8px] text-softText leading-tight">{subtitle}</p>
    </div>
  );
}
