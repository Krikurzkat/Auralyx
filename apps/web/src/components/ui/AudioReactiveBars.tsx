import { memo, useEffect, useState } from 'react';
import { subscribeAudioBands, type AudioBands } from '../../utils/audioVisualizer';

const SILENT: AudioBands = { bass: 0, mids: 0, treble: 0 };

interface AudioReactiveBarsProps {
  isActive: boolean;
  className?: string;
}

function AudioReactiveBars({ isActive, className = '' }: AudioReactiveBarsProps) {
  const [bands, setBands] = useState<AudioBands>(SILENT);

  useEffect(() => {
    if (!isActive) {
      setBands(SILENT);
      return;
    }
    return subscribeAudioBands(setBands);
  }, [isActive]);

  return (
    <span className={`inline-flex h-5 items-end gap-[3px] ${className}`} aria-hidden="true">
      {[bands.bass, bands.mids, bands.treble].map((level, index) => (
        <span
          key={index}
          className="w-[3px] rounded-full bg-accent"
          style={{
            height: `${3 + level * 16}px`,
            transition: 'height 55ms linear',
            opacity: isActive ? 0.78 + level * 0.22 : 0.45,
          }}
        />
      ))}
    </span>
  );
}

export default memo(AudioReactiveBars);
