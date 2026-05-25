# Debug Session: manual-skip-stall

Status: OPEN

Symptom:
- With `Manual Skip Fade` set to `3 seconds`, clicking a different track can leave playback stalled instead of starting after the fade.

Expected:
- Clicking a different track should either crossfade into the new track or fall back to a direct switch, and playback should continue.

Hypotheses:
- H1: Manual track clicks are not entering the manual crossfade branch.
- H2: The inactive audio element starts loading but never becomes the active playback slot.
- H3: A rejected or interrupted `play()` leaves store state updated while audio never advances.
- H4: Another reset, `load()`, or pause path interrupts playback during the configured manual fade window.

Plan:
- Add instrumentation only.
- Reproduce with runtime evidence.
- Identify the confirmed hypothesis.
- Apply the smallest fix based on evidence.
- Re-verify with post-fix logs.
