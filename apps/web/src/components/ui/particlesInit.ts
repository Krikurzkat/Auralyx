import { loadSlim } from "@tsparticles/slim";

const globalParticles = globalThis as typeof globalThis & {
  __auralyxParticlesInit?: (engine: any) => Promise<void>;
};

export const particlesInit = globalParticles.__auralyxParticlesInit ??= async (engine: any) => {
  await loadSlim(engine);
};
