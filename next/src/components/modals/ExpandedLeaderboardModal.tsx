"use client";

import React, { useState } from "react";
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
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [breakdownType, setBreakdownType] = useState<
    "pushups" | "squats" | null
  >(null);

  if (!isOpen) return null;

  // Aggregate scores across networks for each user
  const aggregateScores = (leaderboard: Score[]) => {
    const combined: Record<
      string,
      { totalScore: number; networks: Record<string, number> }
    > = {};
    leaderboard.forEach((entry) => {
      if (!combined[entry.user]) {
        combined[entry.user] = { totalScore: 0, networks: {} };
      }
      combined[entry.user].totalScore += entry.score;
      if (!combined[entry.user].networks[entry.network]) {
        combined[entry.user].networks[entry.network] = 0;
      }
      combined[entry.user].networks[entry.network] += entry.score;
    });
    return combined;
  };

  const pushupAggregated = aggregateScores(pushupLeaderboard);
  const squatAggregated = aggregateScores(squatLeaderboard);

  // Sort users by total score
  const sortedPushupUsers = Object.entries(pushupAggregated)
    .sort(([, a], [, b]) => b.totalScore - a.totalScore)
    .map(([user, data]) => ({ user, ...data }));
  const sortedSquatUsers = Object.entries(squatAggregated)
    .sort(([, a], [, b]) => b.totalScore - a.totalScore)
    .map(([user, data]) => ({ user, ...data }));

  const handleUserClick = (user: string, type: "pushups" | "squats") => {
    setSelectedUser(user);
    setBreakdownType(type);
  };

  const closeBreakdown = () => {
    setSelectedUser(null);
    setBreakdownType(null);
  };

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
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-2 rounded-lg">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-yellow-500">
                <th className="px-4 py-3 text-yellow-400 font-bold">#</th>
                <th className="px-4 py-3 text-yellow-400 font-bold">Athlete</th>
                <th className="px-4 py-3 text-yellow-400 font-bold">
                  Total Score
                </th>
                <th className="px-4 py-3 text-yellow-400 font-bold">
                  Networks
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPushupUsers.slice(0, 10).map((entry, i) => (
                <tr
                  key={`pushup-${entry.user}-${i}`}
                  className={`text-center border-b border-gray-700/50 last:border-none hover:bg-yellow-500/10 transition-colors cursor-pointer ${
                    i === 0
                      ? "bg-yellow-500/30"
                      : i === 1
                      ? "bg-yellow-500/20"
                      : i === 2
                      ? "bg-yellow-500/10"
                      : ""
                  }`}
                  onClick={() => handleUserClick(entry.user, "pushups")}
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
                    {entry.totalScore}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center space-x-1">
                      {Object.keys(entry.networks).map((network) => (
                        <div
                          key={network}
                          className={`w-3 h-3 rounded-full ${
                            network === "polygon"
                              ? "bg-pink-400"
                              : network === "base"
                              ? "bg-blue-400"
                              : network === "monad"
                              ? "bg-gray-400"
                              : "bg-yellow-400"
                          }`}
                          title={
                            network === "polygon"
                              ? "Polygon"
                              : network === "base"
                              ? "Base"
                              : network === "monad"
                              ? "Monad"
                              : "Celo"
                          }
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {sortedPushupUsers.slice(0, 10).map((entry, i) => (
            <div
              key={`pushup-mobile-${entry.user}-${i}`}
              className={`bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-3 rounded-lg cursor-pointer hover:from-yellow-500/30 hover:to-orange-500/30 transition-all ${
                i === 0 ? "ring-2 ring-yellow-400" : i === 1 ? "ring-2 ring-gray-300" : i === 2 ? "ring-2 ring-orange-400" : ""
              }`}
              onClick={() => handleUserClick(entry.user, "pushups")}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <span className="text-xl font-bold">
                    {i === 0 ? "#1" : i === 1 ? "#2" : i === 2 ? "#3" : `#${i + 1}`}
                  </span>
                  <div>
                    <div className="font-bold text-white text-sm">
                      {displayNames[entry.user] || shortenAddress(entry.user)}
                    </div>
                    <div className="flex space-x-1 mt-1">
                      {Object.keys(entry.networks).map((network) => (
                        <div
                          key={network}
                          className={`w-4 h-4 rounded-full ${
                            network === "polygon" ? "bg-pink-400" : network === "base" ? "bg-blue-400" : network === "monad" ? "bg-gray-400" : "bg-yellow-400"
                          }`}
                          title={network === "polygon" ? "Polygon" : network === "base" ? "Base" : network === "monad" ? "Monad" : "Celo"}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-yellow-400 font-bold text-xl">
                  {entry.totalScore}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Squats Leaderboard */}
      <div>
        <h3 className="text-lg font-bold mb-2 bg-gradient-to-r from-green-400 to-teal-500 text-white px-4 py-2 rounded-lg shadow-lg transform rotate-1">
          Squats Champions
        </h3>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto bg-gradient-to-r from-green-500/20 to-teal-500/20 p-2 rounded-lg">
          <table className="min-w-full">
            <thead>
              <tr className="border-b  border-b-2 border-green-500">
                <th className="px-4 py-3 text-green-400 font-bold">#</th>
                <th className="px-4 py-3 text-green-400 font-bold">Athlete</th>
                <th className="px-4 py-3 text-green-400 font-bold">
                  Total Score
                </th>
                <th className="px-4 py-3 text-green-400 font-bold">Networks</th>
              </tr>
            </thead>
            <tbody>
              {sortedSquatUsers.slice(0, 10).map((entry, i) => (
                <tr
                  key={`squat-${entry.user}-${i}`}
                  className={`text-center border-b border-gray-700/50 last:border-none hover:bg-green-500/10 transition-colors cursor-pointer ${
                    i === 0
                      ? "bg-green-500/30"
                      : i === 1
                      ? "bg-green-500/20"
                      : i === 2
                      ? "bg-green-500/10"
                      : ""
                  }`}
                  onClick={() => handleUserClick(entry.user, "squats")}
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
                    {entry.totalScore}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center space-x-1">
                      {Object.keys(entry.networks).map((network) => (
                        <div
                          key={network}
                          className={`w-3 h-3 rounded-full ${
                            network === "polygon"
                              ? "bg-pink-400"
                              : network === "base"
                              ? "bg-blue-400"
                              : network === "monad"
                              ? "bg-gray-400"
                              : "bg-yellow-400"
                          }`}
                          title={
                            network === "polygon"
                              ? "Polygon"
                              : network === "base"
                              ? "Base"
                              : network === "monad"
                              ? "Monad"
                              : "Celo"
                          }
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {sortedSquatUsers.slice(0, 10).map((entry, i) => (
            <div
              key={`squat-mobile-${entry.user}-${i}`}
              className={`bg-gradient-to-r from-green-500/20 to-teal-500/20 p-3 rounded-lg cursor-pointer hover:from-green-500/30 hover:to-teal-500/30 transition-all ${
                i === 0 ? "ring-2 ring-green-400" : i === 1 ? "ring-2 ring-gray-300" : i === 2 ? "ring-2 ring-teal-400" : ""
              }`}
              onClick={() => handleUserClick(entry.user, "squats")}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <span className="text-xl font-bold">
                    {i === 0 ? "#1" : i === 1 ? "#2" : i === 2 ? "#3" : `#${i + 1}`}
                  </span>
                  <div>
                    <div className="font-bold text-white text-sm">
                      {displayNames[entry.user] || shortenAddress(entry.user)}
                    </div>
                    <div className="flex space-x-1 mt-1">
                      {Object.keys(entry.networks).map((network) => (
                        <div
                          key={network}
                          className={`w-4 h-4 rounded-full ${
                            network === "polygon" ? "bg-pink-400" : network === "base" ? "bg-blue-400" : network === "monad" ? "bg-gray-400" : "bg-yellow-400"
                          }`}
                          title={network === "polygon" ? "Polygon" : network === "base" ? "Base" : network === "monad" ? "Monad" : "Celo"}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-green-400 font-bold text-xl">
                  {entry.totalScore}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score Breakdown Modal */}
      {selectedUser && breakdownType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                Score Breakdown for{" "}
                {displayNames[selectedUser] || shortenAddress(selectedUser)}
              </h3>
              <button
                onClick={closeBreakdown}
                className="text-gray-400 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(
                breakdownType === "pushups"
                  ? pushupAggregated[selectedUser].networks
                  : squatAggregated[selectedUser].networks
              ).map(([network, score]) => (
                <div
                  key={network}
                  className="flex justify-between items-center p-2 bg-gray-700 rounded"
                >
                  <span
                    className={`font-bold ${
                      network === "polygon"
                        ? "text-pink-400"
                        : network === "base"
                        ? "text-blue-400"
                        : network === "monad"
                        ? "text-yellow-400"
                        : "text-green-400"
                    }`}
                  >
                    {network === "polygon"
                      ? "Polygon"
                      : network === "base"
                      ? "Base"
                      : network === "monad"
                      ? "Monad"
                      : "Celo"}
                  </span>
                  <span className="text-white">{score}</span>
                </div>
              ))}
            </div>
            <button
              onClick={closeBreakdown}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
};

export default ExpandedLeaderboardModal;
