import { useEffect, useState, useRef } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useUIStore } from '../../stores/uiStore';
import { shallow } from 'zustand/shallow';
import {
  RiComputerLine,
  RiHeadphoneLine,
  RiSpeaker2Line,
  RiCheckLine,
  RiEqualizerLine,
  RiCarLine,
  RiFullscreenLine,
  RiCloseLine,
  RiVolumeUpLine,
} from 'react-icons/ri';

interface DevicesMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullscreen: () => void;
}

interface AudioOutputDevice {
  deviceId: string;
  label: string;
}

export default function DevicesMenu({ isOpen, onClose, onOpenFullscreen }: DevicesMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { currentTrack, isPlaying, volume, primaryAudioRef, secondaryAudioRef } = usePlayerStore((state) => ({
    currentTrack: state.currentTrack,
    isPlaying: state.isPlaying,
    volume: state.volume,
    primaryAudioRef: state.primaryAudioRef,
    secondaryAudioRef: state.secondaryAudioRef,
  }), shallow);
  const { setVisualizerOpen, setDriveModeOpen } = useUIStore();

  const [devices, setDevices] = useState<AudioOutputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');

  // Enumerate actual output devices if supported
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadDevices = async () => {
      try {
        if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          const outputs = allDevices
            .filter((d) => d.kind === 'audiooutput')
            .map((d, idx) => ({
              deviceId: d.deviceId,
              label: d.label || (idx === 0 ? 'Default Audio Output' : `Audio Device ${idx + 1}`),
            }));

          if (isMounted) {
            setDevices(outputs);
          }
        }
      } catch (err) {
        console.warn('Unable to enumerate audio devices:', err);
      }
    };

    loadDevices();

    const handleDeviceChange = () => {
      loadDevices();
    };

    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange);
    return () => {
      isMounted = false;
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange);
    };
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDeviceSelect = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);

    const audios = [primaryAudioRef, secondaryAudioRef].filter(Boolean) as HTMLAudioElement[];
    for (const audio of audios) {
      if ('setSinkId' in audio && typeof (audio as any).setSinkId === 'function') {
        try {
          await (audio as any).setSinkId(deviceId === 'default' ? '' : deviceId);
        } catch (err) {
          console.warn('Could not set audio sinkId:', err);
        }
      }
    }
  };

  const getDeviceIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('headphone') || l.includes('headset') || l.includes('earphone')) {
      return <RiHeadphoneLine size={16} className="text-white/70" />;
    }
    if (l.includes('speaker')) {
      return <RiSpeaker2Line size={16} className="text-white/70" />;
    }
    return <RiComputerLine size={16} className="text-white/70" />;
  };

  return (
    <div
      ref={menuRef}
      role="dialog"
      aria-label="Connect to a device"
      className="absolute bottom-[calc(100%+14px)] right-0 z-50 w-80 overflow-hidden rounded-2xl border border-white/10 shadow-2xl backdrop-blur-2xl animate-scale-in"
      style={{
        background: 'rgba(18, 18, 22, 0.95)',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
        <div className="flex items-center gap-2">
          <RiComputerLine className="text-accent" size={17} />
          <span className="text-xs font-bold uppercase tracking-wider text-white">Connect to a Device</span>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <RiCloseLine size={16} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Current Active Device Banner */}
        <div className="rounded-xl border border-accent/25 bg-accent/10 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent shadow-sm">
              <RiComputerLine size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  {isPlaying && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  )}
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                  {isPlaying ? 'Playing on' : 'Listening on'}
                </span>
              </div>
              <div className="truncate text-xs font-semibold text-white">This Computer (Web Browser)</div>
              {currentTrack && (
                <div className="truncate text-[10px] text-white/50">{currentTrack.title}</div>
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-accent/80">
              <RiVolumeUpLine size={14} />
              <span>{volume}%</span>
            </div>
          </div>
        </div>

        {/* Audio Output Devices List */}
        <div>
          <div className="px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
            Audio Outputs
          </div>
          <div className="space-y-1">
            {devices.length > 0 ? (
              devices.map((device) => {
                const isSelected = selectedDeviceId === device.deviceId;
                return (
                  <button
                    key={device.deviceId}
                    onClick={() => handleDeviceSelect(device.deviceId)}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition ${
                      isSelected
                        ? 'bg-white/10 text-white font-medium border border-white/10'
                        : 'text-white/70 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {getDeviceIcon(device.label)}
                      <span className="truncate">{device.label}</span>
                    </div>
                    {isSelected && <RiCheckLine size={16} className="text-accent shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white">
                <div className="flex items-center gap-2.5 min-w-0">
                  <RiSpeaker2Line size={16} className="text-accent" />
                  <span className="truncate">Default System Output</span>
                </div>
                <RiCheckLine size={16} className="text-accent shrink-0" />
              </div>
            )}
          </div>
        </div>

        {/* Experience & Player Modes */}
        <div className="border-t border-white/[0.08] pt-2.5">
          <div className="px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
            Player Modes
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => {
                onClose();
                setVisualizerOpen(true);
              }}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/5 bg-white/5 p-2 text-center transition hover:border-accent/40 hover:bg-accent/10 active:scale-95 group"
            >
              <RiEqualizerLine size={18} className="text-white/60 transition group-hover:text-accent" />
              <span className="text-[10px] font-semibold text-white/70 group-hover:text-white">Visualizer</span>
            </button>
            <button
              onClick={() => {
                onClose();
                setDriveModeOpen(true);
                onOpenFullscreen();
              }}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/5 bg-white/5 p-2 text-center transition hover:border-accent/40 hover:bg-accent/10 active:scale-95 group"
            >
              <RiCarLine size={18} className="text-white/60 transition group-hover:text-accent" />
              <span className="text-[10px] font-semibold text-white/70 group-hover:text-white">Drive Mode</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenFullscreen();
              }}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/5 bg-white/5 p-2 text-center transition hover:border-accent/40 hover:bg-accent/10 active:scale-95 group"
            >
              <RiFullscreenLine size={18} className="text-white/60 transition group-hover:text-accent" />
              <span className="text-[10px] font-semibold text-white/70 group-hover:text-white">Fullscreen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
