'use client';

import React, { useState } from 'react';

interface VerifyButtonProps {
  onVerificationStart?: () => void;
  onVerificationComplete?: () => void;
  className?: string;
}

/**
 * Simple verification button - Step 2 of integration
 */
const VerifyButton: React.FC<VerifyButtonProps> = ({
  onVerificationStart,
  onVerificationComplete,
  className = '',
}) => {
  const [isVerifying, setIsVerifying] = useState(false);

  const handleClick = () => {
    console.log('🔍 Verification button clicked');
    setIsVerifying(true);
    onVerificationStart?.();

    // Simulate verification for now
    setTimeout(() => {
      console.log('✅ Mock verification complete');
      setIsVerifying(false);
      onVerificationComplete?.();
    }, 2000);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isVerifying}
      className={`
        bg-gradient-to-r from-blue-500 to-purple-600 
        hover:from-blue-600 hover:to-purple-700 
        disabled:from-gray-500 disabled:to-gray-600
        text-white font-bold py-2 px-4 rounded-lg 
        transition-all duration-200 transform hover:scale-105
        disabled:transform-none disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isVerifying ? (
        <span className="flex items-center space-x-2">
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
          <span>Verifying...</span>
        </span>
      ) : (
        '🏆 Verify as Human'
      )}
    </button>
  );
};

export default VerifyButton;
