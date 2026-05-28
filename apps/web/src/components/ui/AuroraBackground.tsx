export default function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-20">
      <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-500/30 blur-[120px] animate-aurora-1 mix-blend-screen" />
      <div className="absolute top-[20%] -right-[10%] w-[60%] h-[80%] rounded-full bg-purple-500/30 blur-[130px] animate-aurora-2 mix-blend-screen" />
      <div className="absolute -bottom-[20%] left-[20%] w-[80%] h-[60%] rounded-full bg-indigo-500/30 blur-[140px] animate-aurora-3 mix-blend-screen" />
    </div>
  );
}
