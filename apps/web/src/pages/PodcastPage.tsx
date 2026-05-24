import { useNavigate } from 'react-router-dom';
import { RiMicLine } from 'react-icons/ri';

export default function PodcastPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-[70vh] flex-col items-center justify-center text-center px-4">
      <RiMicLine size={80} className="text-dimText mb-6" />
      <h1 className="text-4xl font-bold text-white mb-4">Podcasts Not Supported</h1>
      <p className="text-softText max-w-md mx-auto mb-8">
        Total Music is currently optimized for your Music library. Online podcasts are not supported in this offline-first environment.
      </p>
      <button
        onClick={() => navigate('/local')}
        className="rounded-full bg-accent px-6 py-3 font-bold text-white shadow-glow transition hover:scale-105"
      >
        Go to Local Library
      </button>
    </div>
  );
}
