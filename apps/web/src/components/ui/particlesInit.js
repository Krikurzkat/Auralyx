import { loadSlim } from "@tsparticles/slim";
const globalParticles = globalThis;
export const particlesInit = globalParticles.__auralyxParticlesInit ?? (globalParticles.__auralyxParticlesInit = async (engine) => {
    await loadSlim(engine);
});
