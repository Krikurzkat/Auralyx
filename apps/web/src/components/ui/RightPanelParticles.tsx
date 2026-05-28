import { useId, useMemo } from "react";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { particlesInit } from "./particlesInit";

interface RightPanelParticlesProps {
  variant: "queue" | "lyrics";
  colors?: [string, string];
}

export default function RightPanelParticles({ variant, colors }: RightPanelParticlesProps) {
  const reactId = useId();
  const particleId = `right-panel-${variant}-${reactId.replace(/:/g, "")}`;
  const accentA = colors?.[0] || "#8B5CF6";
  const accentB = colors?.[1] || "#A855F7";

  const options = useMemo(
    () => ({
      background: {
        color: {
          value: "transparent",
        },
      },
      fpsLimit: 60,
      particles: {
        color: {
          value:
            variant === "queue"
              ? ["#ffffff", accentA, accentB, "#a78bfa"]
              : ["#ffffff", "#d8d4ff", accentA],
        },
        links: {
          enable: false,
        },
        move: {
          enable: true,
          direction: variant === "queue" ? "top" : "none",
          random: true,
          speed: variant === "queue" ? { min: 0.18, max: 0.42 } : { min: 0.08, max: 0.24 },
          straight: false,
          outModes: {
            default: "out",
          },
          drift: variant === "queue" ? 0.2 : 0.08,
        },
        number: {
          density: {
            enable: true,
          },
          value: variant === "queue" ? 24 : 14,
        },
        opacity: {
          value: variant === "queue" ? { min: 0.08, max: 0.28 } : { min: 0.06, max: 0.2 },
          animation: {
            enable: true,
            speed: variant === "queue" ? 0.45 : 0.28,
            sync: false,
          },
        },
        shape: {
          type: "circle",
        },
        size: {
          value: variant === "queue" ? { min: 0.6, max: 1.9 } : { min: 0.5, max: 1.5 },
          animation: {
            enable: true,
            speed: variant === "queue" ? 0.35 : 0.2,
            sync: false,
          },
        },
      },
      detectRetina: true,
    }),
    [accentA, accentB, variant]
  );

  return (
    <ParticlesProvider init={particlesInit}>
      <Particles
        id={particleId}
        className="absolute inset-0 pointer-events-none opacity-70 mix-blend-screen"
        options={options as any}
      />
    </ParticlesProvider>
  );
}
