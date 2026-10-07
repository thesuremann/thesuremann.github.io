export interface TimerState {
  elapsedMs: number;
  startedAt: number | null;
  running: boolean;
}

export interface TimerSnapshot {
  elapsedMs: number;
  running: boolean;
}

export function createTimerState(): TimerState {
  return {
    elapsedMs: 0,
    startedAt: null,
    running: false
  };
}

export function getElapsedMs(timer: Readonly<TimerState>, now = Date.now()): number {
  if (!timer.running || timer.startedAt === null) {
    return timer.elapsedMs;
  }
  return timer.elapsedMs + (now - timer.startedAt);
}

export function startTimer(timer: TimerState, now = Date.now()): void {
  timer.elapsedMs = 0;
  timer.startedAt = now;
  timer.running = true;
}

export function pauseTimer(timer: TimerState, now = Date.now()): void {
  if (!timer.running || timer.startedAt === null) return;
  timer.elapsedMs += now - timer.startedAt;
  timer.startedAt = null;
  timer.running = false;
}

export function captureTimerSnapshot(
  timer: Readonly<TimerState>,
  now = Date.now()
): TimerSnapshot {
  return {
    elapsedMs: getElapsedMs(timer, now),
    running: timer.running
  };
}

export function restoreTimerFromSnapshot(
  timer: TimerState,
  snapshot: Readonly<TimerSnapshot>,
  now = Date.now()
): void {
  timer.elapsedMs = snapshot.elapsedMs;
  timer.running = Boolean(snapshot.running);
  timer.startedAt = timer.running ? now : null;
}
