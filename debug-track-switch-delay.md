# Debug Session: track-switch-delay

- Status: OPEN
- Symptom: Selecting a new song still feels delayed; an older fade or animation path may still be blocking the visible switch.
- Goal: Find the runtime path that still waits before showing the next track, especially around player fade logic and fullscreen/GSAP transition logic.

## Hypotheses

1. Manual track clicks are still triggering an older fade-out path before the new track becomes active.
2. The fullscreen player keeps a separate delayed visual swap (`displayTrack` / timeout) that makes the new song appear late even when audio changes immediately.
3. A GSAP timeline in the fullscreen player is still animating stale state and delaying the visible content update.
4. Multiple event paths (`playTrack`, `nextTrack`, `ended`, queue clicks) are racing, so a manual click is followed by another transition stage.
5. Audio source changes immediately, but the UI is rendering from a lagging track state, making the bug look like an audio fade issue.

## Plan

1. Instrument player store track switching and ended handling.
2. Instrument fullscreen player visual transition state and GSAP open/close flow.
3. Reproduce with rapid song clicks and compare timestamps.
4. Confirm root cause from logs before changing logic.
