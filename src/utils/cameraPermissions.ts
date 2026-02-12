import { isFarcasterMiniApp } from './farcasterMiniApp';

export interface CameraResult {
  granted: boolean;
  stream?: MediaStream;
  error?: string;
}

export async function requestCameraPermission(
  constraints: MediaStreamConstraints
): Promise<CameraResult> {
  try {
    // Check if running in Farcaster mini app
    if (isFarcasterMiniApp()) {
      // Farcaster mini app camera access might be restricted
      // Return a mock stream or handle differently
      console.log('Requesting camera in Farcaster mini app context');
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    return {
      granted: true,
      stream,
    };
  } catch (error: any) {
    console.error('Camera permission error:', error);
    return {
      granted: false,
      error: error.message || 'Camera permission denied',
    };
  }
}

export function cleanupCameraStream(stream: MediaStream | null) {
  if (!stream) return;

  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

export function monitorCameraStream(stream: MediaStream, onDisconnect: () => void): () => void {
  // Monitor stream for disconnections
  const tracks = stream.getTracks();

  const checkTrackStatus = () => {
    const allActive = tracks.every((track) => track.readyState === 'live');
    if (!allActive) {
      onDisconnect();
    }
  };

  // Check periodically
  const intervalId = setInterval(checkTrackStatus, 1000);

  // Also listen for track ended events
  tracks.forEach((track) => {
    track.addEventListener('ended', onDisconnect);
  });

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    tracks.forEach((track) => {
      track.removeEventListener('ended', onDisconnect);
    });
  };
}

export function getFarcasterCameraConstraints(): MediaStreamConstraints {
  // Return constraints optimized for Farcaster mini apps
  return {
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: 'user',
      frameRate: { ideal: 15 }, // Lower frame rate for mini apps
    },
  };
}
