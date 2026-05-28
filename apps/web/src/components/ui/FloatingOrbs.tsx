import { useMemo } from "react";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { particlesInit } from "./particlesInit";

interface FloatingOrbsProps {
  variant?: "default" | "drive";
}

export default function FloatingOrbs({ variant = "default" }: FloatingOrbsProps) {
  const isDriveMode = variant === "drive";

  const options = useMemo(
    () => ({
      background: {
        color: { value: "transparent" },
      },
      fpsLimit: isDriveMode ? 60 : 120,
      particles: {
        color: {
          value: isDriveMode
            ? ["#ffffff", "#d8b4fe", "#a78bfa", "#93c5fd", "#f0abfc"]
            : ["#ffffff", "#c084fc", "#818cf8", "#f9a8d4", "#fbbf24"],
        },
        links: { enable: false },
        move: {
          enable: true,
          direction: "top" as const,
          random: true,
          speed: isDriveMode ? { min: 0.08, max: 0.18 } : { min: 0.3, max: 0.8 },
          straight: false,
          outModes: {
            default: "out" as const,
          },
          drift: isDriveMode ? 0.12 : 0.5,
        },
        number: {
          density: { enable: true },
          value: isDriveMode ? 42 : 40,
        },
        opacity: {
          value: isDriveMode ? { min: 0.2, max: 0.62 } : { min: 0.15, max: 0.6 },
          animation: {
            enable: true,
            speed: isDriveMode ? 0.22 : 0.8,
            sync: false,
          },
        },
        shape: {
          type: "circle",
        },
        size: {
          value: isDriveMode ? { min: 1.5, max: 5 } : { min: 1, max: 5 },
          animation: {
            enable: true,
            speed: isDriveMode ? 0.18 : 1,
            sync: false,
          },
        },
        shadow: {
          enable: true,
          color: "#c084fc",
          blur: isDriveMode ? 14 : 15,
        },
      },
      detectRetina: true,
    }),
    [isDriveMode]
  );

  return (
    <ParticlesProvider init={particlesInit}>
      <Particles
        id="tsparticles-floating-orbs"
        key={`floating-orbs-${variant}`}
        className={`absolute inset-0 pointer-events-none mix-blend-screen ${
          isDriveMode ? "opacity-65" : "opacity-50"
        }`}
        options={options as any}
      />
    </ParticlesProvider>
  );
}
