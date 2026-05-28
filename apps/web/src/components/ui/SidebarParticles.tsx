import { useId, useMemo } from "react";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { particlesInit } from "./particlesInit";

interface SidebarParticlesProps {
  variant: "logo" | "active";
  className?: string;
}

export default function SidebarParticles({ variant, className = "absolute inset-0" }: SidebarParticlesProps) {
  const reactId = useId();
  const particleId = `sidebar-${variant}-${reactId.replace(/:/g, "")}`;

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
          value: variant === "logo"
            ? ["#ffffff", "#67e8f9", "#a78bfa", "#f0abfc"]
            : ["#ffffff", "var(--accent)", "#c084fc"],
        },
        links: {
          enable: false,
        },
        move: {
          enable: true,
          direction: variant === "logo" ? "none" : "right",
          random: true,
          speed: variant === "logo" ? { min: 0.08, max: 0.22 } : { min: 0.1, max: 0.3 },
          straight: false,
          outModes: {
            default: "out",
          },
          drift: variant === "logo" ? 0.06 : 0.18,
        },
        number: {
          density: {
            enable: true,
          },
          value: variant === "logo" ? 10 : 6,
        },
        opacity: {
          value: variant === "logo" ? { min: 0.12, max: 0.42 } : { min: 0.1, max: 0.32 },
          animation: {
            enable: true,
            speed: variant === "logo" ? 0.45 : 0.35,
            sync: false,
          },
        },
        shape: {
          type: "circle",
        },
        size: {
          value: variant === "logo" ? { min: 0.7, max: 1.8 } : { min: 0.6, max: 1.4 },
          animation: {
            enable: true,
            speed: 0.25,
            sync: false,
          },
        },
      },
      detectRetina: true,
    }),
    [variant]
  );

  return (
    <ParticlesProvider init={particlesInit}>
      <Particles
        id={particleId}
        className={`${className} pointer-events-none opacity-70 mix-blend-screen`}
        options={options as any}
      />
    </ParticlesProvider>
  );
}
