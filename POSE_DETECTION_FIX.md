# Pose Detection Issue Analysis and Fix

## Problem Statement

Users are reporting that the app gets stuck at the pose detection stage and does not progress to allowing them to count exercises.

## Root Cause Analysis

### What Changed in Recent Commits

In commit `d78688e` (refactor: simplify dialog system and consolidate input components), the `PoseDetectionGuidance.tsx` component was **completely deleted** (145 lines removed).

This component was responsible for:

1. Showing users what stage of initialization they're in
2. Providing clear guidance text for each phase
3. **Automatically dismissing when pose was detected**

### The Missing Logic

The old `PoseDetectionGuidance` component had this logic in `Game.tsx`:

```tsx
const handlePoseStateChange = useCallback(
  (newState: {
    hasCamera: boolean;
    hasPoseDetection: boolean;
    poseDetected: boolean;
    isLoading: boolean;
  }) => {
    setPoseState(newState);

    // Show guidance when camera starts but pose isn't detected yet
    if (started && newState.hasCamera && !newState.poseDetected) {
      setShowPoseGuidance(true);
    }

    // Hide guidance when pose is detected
    if (newState.poseDetected) {
      setShowPoseGuidance(false);
    }
  },
  [started]
);
```

**This logic was removed** during the refactoring. Now `handlePoseStateChange` callback in `Game.tsx` only updates the pose state:

```tsx
const handlePoseStateChange = useCallback(
  (newState: {...}) => {
    setPoseState(newState);  // ❌ Missing show/hide guidance logic
  },
  []
);
```

### How the New System Works

The refactored code uses a `UnifiedLoader` component that shows as an overlay based on:

```tsx
<UnifiedLoader
  phase={loadingPhase}
  progress={detectionProgress?.percentage}
  isVisible={started && !poseState.poseDetected}
  isOverlay={true}
/>
```

The `loadingPhase` is calculated by the `useLoadingPhase` hook:

```tsx
export function useLoadingPhase(poseState: PoseState): LoadingPhase {
  return useMemo(() => {
    if (!poseState.hasCamera) return 'initial';
    if (!poseState.hasPoseDetection) return 'ai';
    if (!poseState.poseDetected) return 'positioning';
    return 'ready';
  }, [poseState.hasCamera, poseState.hasPoseDetection, poseState.poseDetected]);
}
```

### Potential Issues

1. **State Update Timing**: The `poseState` updates might not be propagating correctly from the `usePoseDetection` hook to the `Game` component
2. **Missing Debug Information**: Without logging, it's difficult to track what stage the app is stuck at
3. **Silent Failures**: If pose detection fails or encounters an error, there's no clear indication to the user

## Fixes Implemented

### 1. Added Debug Logging to Game.tsx

Added console logging to track pose state changes:

```tsx
const handlePoseStateChange = useCallback(
  (newState: {
    hasCamera: boolean;
    hasPoseDetection: boolean;
    poseDetected: boolean;
    isLoading: boolean;
  }) => {
    setPoseState(newState);

    // Debug logging to track state changes
    if (process.env.NODE_ENV === 'development') {
      console.log('🎭 Pose state changed:', {
        hasCamera: newState.hasCamera,
        hasPoseDetection: newState.hasPoseDetection,
        poseDetected: newState.poseDetected,
        isLoading: newState.isLoading,
        loadingPhase: useLoadingPhase(newState),
      });
    }
  },
  []
);
```

### 2. Added Debug Logging to usePoseDetection.ts

Added logging when poses are detected and when detection fails:

```tsx
if (poses.length > 0) {
  const keypoints = poses[0].keypoints.map((kp: Keypoint) => ({ ...kp }));

  // Update pose detection state
  const currentTime = Date.now();
  lastPoseDetectedTime.current = currentTime;
  if (!poseDetected) {
    console.log('✅ Pose detected! Setting poseDetected to true');
    setPoseDetected(true);
  }
  // ... rest of code
} else {
  // Log when no poses detected for debugging
  if (Math.random() < 0.01) {
    // Only log occasionally to avoid spam
    console.log('🔍 No pose detected in this frame');
  }

  // Check if we should mark pose as not detected (after 2 seconds of no detection)
  const currentTime = Date.now();
  if (poseDetected && currentTime - lastPoseDetectedTime.current > 2000) {
    console.log('⚠️ No pose detected for 2 seconds, setting poseDetected to false');
    setPoseDetected(false);
  }
  // ... rest of code
}
```

### 3. Added Visual Debug Indicator

Added a debug overlay in Game.tsx to show when the loading overlay is visible:

```tsx
{
  /* Debug: Show overlay visibility state */
}
{
  process.env.NODE_ENV === 'development' && started && !poseState.poseDetected && (
    <div className="absolute top-2 right-2 bg-red-600 text-white text-xs p-2 rounded z-50">
      Debug: Overlay visible (started={started.toString()}, poseDetected=
      {poseState.poseDetected.toString()})
    </div>
  );
}
```

## How to Test

1. Start the development server: `npm run dev`
2. Open the browser console (F12)
3. Connect a wallet (required to start the game)
4. Click START
5. Watch the console for debug messages:

Expected console output:

```
🎭 Pose state changed: {hasCamera: true, hasPoseDetection: false, poseDetected: false, isLoading: true, loadingPhase: 'ai'}
🎭 Pose state changed: {hasCamera: true, hasPoseDetection: true, poseDetected: false, isLoading: false, loadingPhase: 'positioning'}
✅ Pose detected! Setting poseDetected to true
🎭 Pose state changed: {hasCamera: true, hasPoseDetection: true, poseDetected: true, isLoading: false, loadingPhase: 'ready'}
```

If the app is stuck, you'll see:

```
🎭 Pose state changed: {hasCamera: true, hasPoseDetection: true, poseDetected: false, isLoading: false, loadingPhase: 'positioning'}
🔍 No pose detected in this frame
🔍 No pose detected in this frame
⚠️ No pose detected for 2 seconds, setting poseDetected to false
```

## Possible Scenarios

### Scenario 1: Pose Detection Not Working

**Symptoms**: Console shows "🔍 No pose detected in this frame" repeatedly

**Possible Causes**:

- Camera permission not granted
- Poor lighting
- User not in frame
- TensorFlow model failed to initialize
- Browser compatibility issues

**Solutions**:

1. Check browser console for initialization errors
2. Verify camera permissions
3. Ensure good lighting and user is fully visible
4. Try a different browser

### Scenario 2: State Not Updating

**Symptoms**: Console shows "✅ Pose detected!" but overlay doesn't disappear

**Possible Causes**:

- React state update not triggering re-render
- Race condition in state updates
- Component not subscribing to state changes

**Solutions**:

1. Check if `poseState.poseDetected` is actually updating
2. Verify React is re-rendering the component
3. Check for any errors in the console

### Scenario 3: Timing Issue

**Symptoms**: Pose is detected but overlay takes a long time to disappear

**Possible Causes**:

- State update is delayed
- Component re-render is slow
- Multiple state updates in quick succession

**Solutions**:

1. Check the timing of state updates in console
2. Look for performance bottlenecks
3. Consider debouncing state updates

## Next Steps

1. **Run the app in development mode** and observe the console output
2. **Identify which scenario** is occurring based on console logs
3. **Implement appropriate fix** based on the identified issue
4. **Test thoroughly** with different devices and browsers
5. **Remove debug logging** once issue is resolved

## Additional Recommendations

1. **Add Error Boundaries**: Wrap the pose detection logic in an error boundary to catch and display errors gracefully
2. **Add Retry Logic**: Allow users to retry pose detection if it fails
3. **Add Timeout**: If pose detection takes too long, show a helpful message to the user
4. **Improve User Feedback**: Add visual indicators (e.g., skeleton overlay) to show the system is actively detecting poses
5. **Add Fallback**: If pose detection fails completely, allow users to manually start the game

## Files Modified

1. `src/components/game/Game.tsx` - Added debug logging and visual indicator
2. `src/modules/usePoseDetection.ts` - Added debug logging for pose detection events

## Related Commits

- `1555eff` - feat(ui): complete comprehensive UI refactoring with Core Principles
- `d78688e` - refactor: simplify dialog system and consolidate input components
- `71cd4f1` - refactor: improve exercise-to-submission transitions and consolidate celo submission flow
