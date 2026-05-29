export default function AuroraBackground() {
  return (
    <div className="aurora-bg absolute inset-0 overflow-hidden pointer-events-none -z-20">
      <div className="aurora-bg__blob aurora-bg__blob--blue absolute rounded-full bg-blue-500/30 animate-aurora-1 mix-blend-screen" />
      <div className="aurora-bg__blob aurora-bg__blob--purple absolute rounded-full bg-purple-500/30 animate-aurora-2 mix-blend-screen" />
      <div className="aurora-bg__blob aurora-bg__blob--indigo absolute rounded-full bg-indigo-500/30 animate-aurora-3 mix-blend-screen" />
    </div>
  );
}
