// CeloSubmissionChoice.tsx - Component to let users choose between standardized and verified Celo submission

import React from 'react';
import { NetworkConfig } from '@/types/contracts';

interface CeloSubmissionChoiceProps {
  onSelectNetwork: (network: NetworkConfig) => void;
  standardCeloNetwork: NetworkConfig;
  verifiedCeloNetwork: NetworkConfig;
}

const CeloSubmissionChoice: React.FC<CeloSubmissionChoiceProps> = ({
  onSelectNetwork,
  standardCeloNetwork,
  verifiedCeloNetwork,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-semibold mb-3 text-center">Celo Network Options</h3>

      <div className="space-y-3">
        {/* Standard Celo Option */}
        <button
          onClick={() => onSelectNetwork(standardCeloNetwork)}
          className="w-full p-3 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg text-left hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 transform hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Standard Celo Leaderboard</h4>
              <p className="text-sm text-blue-200 mt-1">
                Quick and easy submission. No verification required.
              </p>
            </div>
            <div className="text-blue-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
        </button>

        {/* Verified Celo Option */}
        <button
          onClick={() => onSelectNetwork(verifiedCeloNetwork)}
          className="w-full p-3 bg-gradient-to-r from-green-600 to-emerald-700 rounded-lg text-left hover:from-green-700 hover:to-emerald-800 transition-all duration-200 transform hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Verified Celo Leaderboard</h4>
              <p className="text-sm text-green-200 mt-1">
                Get 10% bonus points for verified humans. Requires Self Protocol verification.
              </p>
              <div className="flex items-center mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-800 text-green-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified Bonus
                </span>
              </div>
            </div>
            <div className="text-green-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">
          Both submissions count toward separate leaderboards. Choose based on your preference.
        </p>
      </div>
    </div>
  );
};

export default CeloSubmissionChoice;
