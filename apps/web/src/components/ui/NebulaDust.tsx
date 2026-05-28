import { useMemo, useId } from "react";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { particlesInit } from "./particlesInit";

interface NebulaDustProps {
  id?: string;
}

export default function NebulaDust({ id }: NebulaDustProps) {
  const reactId = useId();
  const particleId = id || `tsparticles-nebula-${reactId.replace(/:/g, '')}`;

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
          value: ["#8b5cf6", "#3b82f6", "#a855f7", "#ffffff"], // Purple, Blue, Pink, White
        },
        links: {
          enable: false,
        },
        move: {
          enable: true,
          direction: "none",
          random: true,
          speed: 0.2, // Very slow drifting
          straight: false,
          outModes: {
            default: "out",
          },
        },
        number: {
          density: {
            enable: true,
          },
          value: 50, // Sparse dust
        },
        opacity: {
          value: { min: 0.1, max: 0.5 },
          animation: {
            enable: true,
            speed: 0.3,
            sync: false,
          },
        },
        shape: {
          type: "circle",
        },
        size: {
          value: { min: 0.5, max: 2.5 },
          animation: {
            enable: true,
            speed: 0.5,
            sync: false,
          }
        },
      },
      detectRetina: true,
    }),
    []
  );

  return (
    <ParticlesProvider init={particlesInit}>
      <Particles 
        id={particleId} 
        className="absolute inset-0 z-0 pointer-events-none mix-blend-screen opacity-60" 
        options={options as any} 
      />
    </ParticlesProvider>
  );
}
