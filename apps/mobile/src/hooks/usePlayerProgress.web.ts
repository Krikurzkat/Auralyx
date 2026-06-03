export function usePlayerProgress(_updateInterval?: number) {
  return {
    position: 0,
    duration: 0,
    buffered: 0,
  };
}
