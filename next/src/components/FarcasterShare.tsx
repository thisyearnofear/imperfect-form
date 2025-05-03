import React from "react";

interface FarcasterShareProps {
  reps: number;
  exerciseMode: string;
  timeSpent: string;
}

/**
 * Component for sharing workout achievements to Farcaster
 */
export default function FarcasterShare({
  reps,
  exerciseMode,
  timeSpent,
}: FarcasterShareProps) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://imperfectform.fun";

  // Generate the frame URL
  const frameUrl = `${baseUrl}/api/frames/workout?reps=${reps}&exerciseMode=${exerciseMode}&timeSpent=${timeSpent}`;

  // Generate the Warpcast share URL
  const warpcastUrl = `https://warpcast.com/~/compose?text=I%20just%20completed%20${reps}%20${exerciseMode}%20in%20${timeSpent}!&embeds[]=${encodeURIComponent(
    frameUrl
  )}`;

  const handleShare = () => {
    // Open Warpcast in a new tab
    window.open(warpcastUrl, "_blank");
  };

  return (
    <div className="flex flex-col items-center mt-4">
      <button
        onClick={handleShare}
        className="bg-[#fcb131] text-black font-bold py-2 px-4 rounded-lg flex items-center"
      >
        <span className="mr-2">Share to Farcaster</span>
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

      <div className="mt-4 text-sm text-gray-400">
        Share your achievement with the Farcaster community!
      </div>
    </div>
  );
}
