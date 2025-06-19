"use client";

import React from "react";
import "@/styles/leaderboard.css";
import { shortenAddress } from "@/utils/formatters";
import { Dialog } from "@/components/ui";
import { Score } from "@/types";

interface ExpandedLeaderboardModalProps {
  pushupLeaderboard: Score[];
  squatLeaderboard: Score[];
  displayNames: Record<string, string>;
  isOpen: boolean;
  onClose: () => void;
}

const ExpandedLeaderboardModal: React.FC<ExpandedLeaderboardModalProps> = ({
  pushupLeaderboard,
  squatLeaderboard,
  displayNames,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Onchain Olympians Leaderboard"
      description="Out of difficulties grow miracles"
      maxWidth="800px" // Wider width for the leaderboard
    >
      <div className="flex justify-center items-center mb-4">
        <div className="olympic-rings" aria-label="Olympic Rings">
          <div className="ring blue" />
          <div className="ring black" />
          <div className="ring red" />
          <div className="ring yellow" />
          <div className="ring green" />
        </div>

        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.reload();
            }
          }}
          className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-3 py-2 rounded-full text-lg font-bold hover:scale-110 transition-transform duration-200 shadow-lg"
          title="Refresh leaderboard"
        >
          ↻
        </button>
      </div>

      <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 p-1 rounded-lg mb-6">
        <div className="bg-black p-2 rounded-md">
          <p className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 font-bold">
            Compete globally and earn your place in the Onchain Olympics!
          </p>
        </div>
      </div>

      {/* Push-ups Leaderboard */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-2 rounded-lg shadow-lg transform -rotate-1">
          Push-ups Champions
        </h3>
        <div className="overflow-x-auto bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-2 rounded-lg">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-yellow-500">
                <th className="px-4 py-3 text-yellow-400 font-bold">#</th>
                <th className="px-4 py-3 text-yellow-400 font-bold">Athlete</th>
                <th className="px-4 py-3 text-yellow-400 font-bold">Score</th>
                <th className="px-4 py-3 text-yellow-400 font-bold">Network</th>
              </tr>
            </thead>
            <tbody>
              {pushupLeaderboard.slice(0, 10).map((entry, i) => (
                <tr
                  key={`pushup-${entry.user}-${entry.network}-${i}`}
                  className={`text-center border-b border-gray-700/50 last:border-none hover:bg-yellow-500/10 transition-colors ${
                    i === 0
                      ? "bg-yellow-500/30"
                      : i === 1
                      ? "bg-yellow-500/20"
                      : i === 2
                      ? "bg-yellow-500/10"
                      : ""
                  }`}
                >
                  <td className="px-4 py-3 font-bold">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-white">
                      {displayNames[entry.user] || shortenAddress(entry.user)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-yellow-400">
                    {entry.score}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        entry.network === "polygon"
                          ? "bg-pink-500/20 text-pink-400"
                          : entry.network === "base"
                          ? "bg-blue-500/20 text-blue-400"
                          : entry.network === "monad"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {entry.network === "polygon" ? "Polygon" : 
                       entry.network === "base" ? "Base" : 
                       entry.network === "monad" ? "Monad" : "Celo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Squats Leaderboard */}
      <div>
        <h3 className="text-lg font-bold mb-2 bg-gradient-to-r from-green-400 to-teal-500 text-white px-4 py-2 rounded-lg shadow-lg transform rotate-1">
          Squats Champions
        </h3>
        <div className="overflow-x-auto bg-gradient-to-r from-green-500/20 to-teal-500/20 p-2 rounded-lg">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-green-500">
                <th className="px-4 py-3 text-green-400 font-bold">#</th>
                <th className="px-4 py-3 text-green-400 font-bold">Athlete</th>
                <th className="px-4 py-3 text-green-400 font-bold">Score</th>
                <th className="px-4 py-3 text-green-400 font-bold">Network</th>
              </tr>
            </thead>
            <tbody>
              {squatLeaderboard.slice(0, 10).map((entry, i) => (
                <tr
                  key={`squat-${entry.user}-${entry.network}-${i}`}
                  className={`text-center border-b border-gray-700/50 last:border-none hover:bg-green-500/10 transition-colors ${
                    i === 0
                      ? "bg-green-500/30"
                      : i === 1
                      ? "bg-green-500/20"
                      : i === 2
                      ? "bg-green-500/10"
                      : ""
                  }`}
                >
                  <td className="px-4 py-3 font-bold">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-white">
                      {displayNames[entry.user] || shortenAddress(entry.user)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-green-400">
                    {entry.score}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        entry.network === "polygon"
                          ? "bg-pink-500/20 text-pink-400"
                          : entry.network === "base"
                          ? "bg-blue-500/20 text-blue-400"
                          : entry.network === "monad"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {entry.network === "polygon" ? "Polygon" : 
                       entry.network === "base" ? "Base" : 
                       entry.network === "monad" ? "Monad" : "Celo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Dialog>
  );
};

export default ExpandedLeaderboardModal;
