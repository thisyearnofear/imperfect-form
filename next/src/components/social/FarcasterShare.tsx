import React from "react";

interface FarcasterShareProps {
  reps: number;
  exerciseMode: string;
  timeSpent: string;
  network?: string;
}

/**
 * Component for sharing workout achievements to Farcaster
 */
import { useState, useEffect, useCallback } from 'react';

// Helper function to get the display name for a network
function getNetworkDisplayName(network: string | undefined): string {
  switch (network) {
    case 'polygon':
      return 'Polygon';
    case 'base':
      return 'Base';
    case 'celo':
      return 'Celo';
    case 'monad':
      return 'Monad';
    default:
      return 'Farcaster';
  }
}

export default function FarcasterShare({
  reps,
  exerciseMode,
  timeSpent,
  network,
}: FarcasterShareProps) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://imperfectform.fun";
  const [isLoading, setIsLoading] = useState(false);
  const [signerUuid, setSignerUuid] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [shareCompleted, setShareCompleted] = useState(false);

  // Removed unused frameUrl variable

  // Handle Neynar sign-in
  const handleSignIn = useCallback(() => {
    console.log('Opening Neynar sign in window');
    // Open a dialog with Neynar Sign In
    const neynarWindow = window.open('', '_blank', 'width=600,height=600');
    if (!neynarWindow) {
      alert('Pop-up blocked! Please allow pop-ups for this site.');
      return;
    }
    
    neynarWindow.document.write(`
      <html>
        <head>
          <title>Sign In with Neynar</title>
          <script src="https://neynarxyz.github.io/siwn/raw/1.2.0/index.js" async></script>
          <style>
            body {
              background-color: #000;
              font-family: 'Arial', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              color: #fff;
              background-image: linear-gradient(45deg, #000 25%, #111 25%, #111 50%, #000 50%, #000 75%, #111 75%, #111 100%);
              background-size: 40px 40px;
            }
            .neynar-container {
              background-color: #000;
              border: 3px solid #fcb131;
              border-radius: 10px;
              padding: 30px;
              text-align: center;
              max-width: 350px;
            }
            h2 {
              color: #fcb131;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="neynar-container">
            <h2>Imperfect Form</h2>
            <div 
              class="neynar_signin" 
              data-client_id="9c260f93-357a-4952-8090-a03f10e742f4" 
              data-success-callback="onSignInSuccess"
              data-theme="dark"
            ></div>
          </div>
          <script>
            function onSignInSuccess(data) {
              console.log('Neynar sign in successful:', data);
              window.opener.postMessage({ type: 'NEYNAR_SIGN_IN', data }, '*');
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    neynarWindow.document.close();
  }, []);

  // Handle direct share via API with memoization to prevent re-renders
  const handleDirectShare = useCallback(async () => {
    if (!signerUuid) {
      handleSignIn();
      return;
    }
    
    if (shareCompleted) {
      return; // Prevent multiple calls if already shared
    }
    
    setIsLoading(true);
    
    try {
      // Use the dynamically generated workout image
      const imageUrl = `${baseUrl}/api/frames/workout/image?reps=${reps}&exerciseMode=${exerciseMode}&timeSpent=${timeSpent}`;
      
      console.log(`Attempting to share with signerUuid: ${signerUuid}`);
      console.log(`Network: ${network}, Image URL: ${imageUrl}`);
      
      const response = await fetch('/api/farcaster/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signerUuid,
          reps,
          exerciseMode, 
          timeSpent,
          network,
          imageUrl
        }),
      });
      
      // Log the response status and text for debugging
      console.log(`Farcaster API response status: ${response.status}`);
      
      // Clone the response to read it twice
      const responseClone = response.clone();
      const responseText = await responseClone.text();
      console.log(`Farcaster API response text: ${responseText}`);
      
      try {
        const result = JSON.parse(responseText);
        
        if (result.success) {
          console.log('Share successful!');
          setShareCompleted(true);
          // Remove alert as it can break the flow
          // alert('Successfully shared to Farcaster!');
        } else {
          console.error('Share failed:', result.error);
          setShowFallback(true);
        }
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        setShowFallback(true);
      }
    } catch (error) {
      console.error('Error sharing to Farcaster:', error);
      setShowFallback(true);
    } finally {
      setIsLoading(false);
    }
  }, [signerUuid, reps, exerciseMode, timeSpent, network, baseUrl, shareCompleted, handleSignIn]);

  // Listen for message from pop-up window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NEYNAR_SIGN_IN') {
        console.log('Received signer data:', event.data.data);
        const uuid = event.data.data.signer_uuid;
        setSignerUuid(uuid);
        console.log(`Set signerUuid to: ${uuid}`);
        
        // Automatically trigger share if signerUuid is received
        // We'll do this with a small delay to ensure state is updated
        setTimeout(() => {
          // Only auto-share if we're not already sharing or completed
          if (uuid && !isLoading && !shareCompleted) {
            console.log('Auto-sharing after sign-in');
            handleDirectShare();
          }
        }, 500);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleDirectShare, isLoading, shareCompleted]);

  // Fallback to traditional warpcast sharing
  const handleFallbackShare = () => {
    // Generate a fallback Warpcast URL based on the network
    const warpcastBaseUrl = 'https://warpcast.com/~/compose?text=';
    const text = encodeURIComponent(`I just completed ${reps} ${exerciseMode} in ${timeSpent} on Imperfect Form! 💪\n\nCome join the Onchain Olympics at https://imperfectform.fun`);
    const channelTag = network ? `&embeds[]=https://warpcast.com/~/channel/${network}` : '';
    const fullWarpcastUrl = `${warpcastBaseUrl}${text}${channelTag}`;
    
    window.open(fullWarpcastUrl, '_blank');
  };

  return (
    <div className="flex flex-col items-center mt-4">
      {shareCompleted ? (
        <div className="flex flex-col items-center text-center">
          <div className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg flex items-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Shared Successfully!</span>
          </div>
          <p className="text-sm text-green-500">Your achievement has been shared to the {getNetworkDisplayName(network)} community!</p>
        </div>
      ) : (
        <button
          onClick={handleDirectShare}
          className="bg-[#fcb131] text-black font-bold py-2 px-4 rounded-lg flex items-center"
          disabled={isLoading || shareCompleted}
        >
          <span className="mr-2">
            {isLoading 
              ? 'Sharing...' 
              : signerUuid 
                ? 'Share to Farcaster' 
                : 'Sign in with Farcaster'}
          </span>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.64 8.8C16.49 10.38 15.84 14.22 15.51 15.99C15.37 16.74 15.09 16.99 14.83 17.02C14.25 17.07 13.81 16.64 13.25 16.27C12.37 15.69 11.87 15.33 11.02 14.77C10.03 14.12 10.67 13.76 11.24 13.18C11.39 13.03 13.95 10.7 14 10.49C14.0069 10.4476 14.0069 10.4043 14 10.362C13.9884 10.3208 13.9679 10.2834 13.94 10.253C13.9068 10.2266 13.8694 10.2068 13.83 10.1943C13.7905 10.1818 13.7489 10.1769 13.708 10.18C13.61 10.18 13.5 10.18 13.39 10.27C13.25 10.38 11.5 11.61 8.12 14.03C7.7 14.3 7.32 14.43 6.98 14.42C6.6 14.41 5.88 14.19 5.35 14C4.7 13.77 4.18 13.64 4.22 13.27C4.24 13.08 4.5 12.89 5 12.7C8.57 11.08 10.9 10 12 9.45C15.19 7.88 15.83 7.65 16.26 7.65C16.36 7.65 16.58 7.67 16.73 7.8C16.84 7.9 16.88 8.05 16.89 8.16C16.9 8.23 16.91 8.43 16.89 8.59L16.64 8.8Z"
              fill="black"
            />
          </svg>
        </button>
      )}

      {showFallback && (
        <button
          onClick={handleFallbackShare}
          className="mt-2 bg-gray-700 text-white py-2 px-4 rounded-lg flex items-center"
        >
          Manual Share via Warpcast
        </button>
      )}

      <div className="mt-4 text-sm text-gray-400">
        {!shareCompleted && (
          signerUuid 
            ? network 
              ? `Share to the ${getNetworkDisplayName(network)} community on Farcaster!` 
              : 'Share your achievement with the Farcaster community!'
            : 'Sign in to share with Farcaster directly!'
        )}
      </div>
    </div>
  );
}
