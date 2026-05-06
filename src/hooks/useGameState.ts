'use client';

import React, { useState, useCallback } from 'react';

interface UseGameStateOptions {
  initialMode?: 'pushups' | 'squats';
  workoutDuration?: number;
}

interface GameState {
  started: boolean;
  timeLeft: number;
  repCount: number;
  mode: 'pushups' | 'squats';
  showSummary: boolean;
}

interface GameActions {
  start: () => void;
  stop: () => void;
  reset: () => void;
  setMode: (mode: 'pushups' | 'squats') => void;
  incrementReps: (count?: number) => void;
  showSummaryModal: () => void;
  hideSummaryModal: () => void;
}

export function useGameState(options: UseGameStateOptions = {}): [GameState, GameActions] {
  const { initialMode = 'pushups', workoutDuration = 120 } = options;

  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(workoutDuration);
  const [repCount, setRepCount] = useState(0);
  const [mode, setMode] = useState<'pushups' | 'squats'>(initialMode);
  const [showSummary, setShowSummary] = useState(false);

  const start = useCallback(() => {
    setStarted(true);
    setTimeLeft(workoutDuration);
    setRepCount(0);
  }, [workoutDuration]);

  const stop = useCallback(() => {
    setStarted(false);
    setShowSummary(true);
  }, []);

  const reset = useCallback(() => {
    setStarted(false);
    setTimeLeft(workoutDuration);
    setRepCount(0);
    setShowSummary(false);
  }, [workoutDuration]);

  const changeMode = useCallback((newMode: 'pushups' | 'squats') => {
    setMode(newMode);
  }, []);

  const incrementReps = useCallback((count = 1) => {
    setRepCount((prev) => prev + count);
  }, []);

  const showSummaryModal = useCallback(() => {
    setShowSummary(true);
  }, []);

  const hideSummaryModal = useCallback(() => {
    setShowSummary(false);
  }, []);

  return [
    {
      started,
      timeLeft,
      repCount,
      mode,
      showSummary,
    },
    {
      start,
      stop,
      reset,
      setMode: changeMode,
      incrementReps,
      showSummaryModal,
      hideSummaryModal,
    },
  ];
}

// Timer hook for workout duration
export function useWorkoutTimer(
  duration: number,
  onTick: (remaining: number) => void,
  onComplete: () => void
) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = React.useRef(onComplete);
  const onTickRef = React.useRef(onTick);

  // Keep refs updated
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
    onTickRef.current = onTick;
  }, [onComplete, onTick]);

  const start = React.useCallback(() => {
    setTimeLeft(duration);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        onTickRef.current(next);
        if (next <= 0) {
          clearInterval(timerRef.current!);
          onCompleteRef.current();
          return 0;
        }
        return next;
      });
    }, 1000);
  }, [duration]);

  const stop = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const reset = React.useCallback(() => {
    stop();
    setTimeLeft(duration);
  }, [stop, duration]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return { timeLeft, start, stop, reset };
}

export default useGameState;
