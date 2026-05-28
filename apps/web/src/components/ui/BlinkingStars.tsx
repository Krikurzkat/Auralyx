import { useMemo } from "react";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { particlesInit } from "./particlesInit";

export default function BlinkingStars() {
  const options = useMemo(
    () => ({
      background: {
        color: {
          value: "transparent",
        },
      },
      fpsLimit: 120,
      particles: {
        color: {
          value: "#ffffff",
        },
        links: {
          enable: false,
        },
        move: {
          enable: false,
        },
        number: {
          density: {
            enable: true,
          },
          value: 100,
        },
        opacity: {
          value: { min: 0.1, max: 0.8 },
          animation: {
            enable: true,
            speed: 0.5,
            sync: false,
          },
        },
        shape: {
          type: "circle",
        },
        size: {
          value: { min: 0.5, max: 1.5 },
        },
      },
      detectRetina: true,
    }),
    []
  );

  return (
    <ParticlesProvider init={particlesInit}>
      <Particles id="tsparticles-blinking" className="absolute inset-0 -z-10 pointer-events-none opacity-40 mix-blend-screen" options={options as any} />
    </ParticlesProvider>
  );
}
