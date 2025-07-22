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
  const [progressiveDisplayNames, setProgressiveDisplayNames] =
    useState<Record<string, string>>(displayNames);

  // Progressive ENS resolution - update names as they come in
  React.useEffect(() => {
    setProgressiveDisplayNames(displayNames);
  }, [displayNames]);

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

  // Network color mapping for consistency
  const getNetworkColor = (network: string) => {
    switch (network) {
      case "polygon":
        return "bg-purple-500";
      case "base":
        return "bg-blue-500";
      case "monad":
        return "bg-gray-500";
      case "celo":
        return "bg-[#fcb131]";
      default:
        return "bg-gray-400";
    }
  };

  const getNetworkName = (network: string) => {
    switch (network) {
      case "polygon":
        return "Polygon";
      case "base":
        return "Base";
      case "monad":
        return "Monad";
      case "celo":
        return "Celo";
      default:
        return network;
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="🏆 Onchain Olympians Leaderboard 🏆"
      description="Out of difficulties grow miracles"
      maxWidth="900px"
    >
      {/* Header with consistent theming */}
      <div className="flex justify-center items-center mb-6">
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
          className="bg-[#fcb131] hover:bg-[#f39c12] text-black px-4 py-2 rounded-lg font-bold transition-all duration-200 shadow-lg border-2 border-[#fcb131] ml-4"
          title="Refresh leaderboard"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Consistent with main leaderboard styling */}
      <div className="bg-black/80 border-2 border-[#fcb131] rounded-lg p-4 mb-6 shadow-[0_0_20px_rgba(252,177,49,0.5)]">
        <p className="text-[#fcb131] font-bold text-center text-lg">
          🏆 Compete globally and earn your place in the Onchain Olympics! 🏆
        </p>
      </div>

      {/* Push-ups Leaderboard */}
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-4 text-[#fcb131] text-center border-b-2 border-[#fcb131] pb-2">
          💪 Push-ups Champions 💪
        </h3>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto bg-black/60 border border-[#fcb131]/30 rounded-lg">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-[#fcb131]">
                <th className="px-4 py-3 text-[#fcb131] font-bold">#</th>
                <th className="px-4 py-3 text-[#fcb131] font-bold">Athlete</th>
                <th className="px-4 py-3 text-[#fcb131] font-bold">
                  Total Score
                </th>
                <th className="px-4 py-3 text-[#fcb131] font-bold">Networks</th>
              </tr>
            </thead>
            <tbody>
              {sortedPushupUsers.slice(0, 10).map((entry, i) => (
                <tr
                  key={`pushup-${entry.user}-${i}`}
                  className={`text-center border-b border-[#fcb131]/20 last:border-none hover:bg-[#fcb131]/10 transition-colors cursor-pointer ${
                    i === 0
                      ? "bg-[#fcb131]/20"
                      : i === 1
                      ? "bg-[#fcb131]/15"
                      : i === 2
                      ? "bg-[#fcb131]/10"
                      : ""
                  }`}
                  onClick={() => handleUserClick(entry.user, "pushups")}
                >
                  <td
                    className="px-4 py-3 font-bold text-[#fcb131]"
                    style={{ color: "#fcb131" }}
                  >
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="font-bold text-[#fcb131]"
                      style={{ color: "#fcb131" }}
                    >
                      {progressiveDisplayNames[entry.user] ||
                        shortenAddress(entry.user)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#fcb131] text-lg">
                    {entry.totalScore}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center space-x-1">
                      {Object.entries(entry.networks).map(
                        ([network, score]) => (
                          <div
                            key={network}
                            className={`w-4 h-4 rounded-full ${getNetworkColor(
                              network
                            )} border border-white/20`}
                            title={`${getNetworkName(network)}: ${score}`}
                          />
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Optimized for small screens */}
        <div className="md:hidden space-y-2 px-1">
          {sortedPushupUsers.slice(0, 10).map((entry, i) => (
            <div
              key={`pushup-mobile-${entry.user}-${i}`}
              className={`bg-black/80 border border-[#fcb131]/50 rounded-lg p-3 cursor-pointer hover:bg-[#fcb131]/10 transition-colors ${
                i === 0 ? "border-[#fcb131] bg-[#fcb131]/10" : ""
              }`}
              onClick={() => handleUserClick(entry.user, "pushups")}
            >
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <span
                    className="text-lg flex-shrink-0 text-[#fcb131] font-bold"
                    style={{ color: "#fcb131" }}
                  >
                    {i === 0
                      ? "🥇"
                      : i === 1
                      ? "🥈"
                      : i === 2
                      ? "🥉"
                      : `#${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-bold text-[#fcb131] text-xs truncate"
                      style={{ color: "#fcb131" }}
                    >
                      {progressiveDisplayNames[entry.user] ||
                        shortenAddress(entry.user)}
                    </div>
                    <div className="flex space-x-1 mt-1">
                      {Object.entries(entry.networks).map(
                        ([network, score]) => (
                          <div
                            key={network}
                            className={`w-2 h-2 rounded-full ${getNetworkColor(
                              network
                            )} flex-shrink-0`}
                            title={`${getNetworkName(network)}: ${score}`}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-[#fcb131] font-bold text-lg flex-shrink-0 ml-2">
                  {entry.totalScore}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Squats Leaderboard */}
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-4 text-[#fcb131] text-center border-b-2 border-[#fcb131] pb-2">
          🏋️ Squats Champions 🏋️
        </h3>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto bg-black/60 border border-[#fcb131]/30 rounded-lg">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-[#fcb131]">
                <th className="px-4 py-3 text-[#fcb131] font-bold">#</th>
                <th className="px-4 py-3 text-[#fcb131] font-bold">Athlete</th>
                <th className="px-4 py-3 text-[#fcb131] font-bold">
                  Total Score
                </th>
                <th className="px-4 py-3 text-[#fcb131] font-bold">Networks</th>
              </tr>
            </thead>
            <tbody>
              {sortedSquatUsers.slice(0, 10).map((entry, i) => (
                <tr
                  key={`squat-${entry.user}-${i}`}
                  className={`text-center border-b border-[#fcb131]/20 last:border-none hover:bg-[#fcb131]/10 transition-colors cursor-pointer ${
                    i === 0
                      ? "bg-[#fcb131]/20"
                      : i === 1
                      ? "bg-[#fcb131]/15"
                      : i === 2
                      ? "bg-[#fcb131]/10"
                      : ""
                  }`}
                  onClick={() => handleUserClick(entry.user, "squats")}
                >
                  <td
                    className="px-4 py-3 font-bold text-[#fcb131]"
                    style={{ color: "#fcb131" }}
                  >
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="font-bold text-[#fcb131]"
                      style={{ color: "#fcb131" }}
                    >
                      {progressiveDisplayNames[entry.user] ||
                        shortenAddress(entry.user)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#fcb131] text-lg">
                    {entry.totalScore}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center space-x-1">
                      {Object.entries(entry.networks).map(
                        ([network, score]) => (
                          <div
                            key={network}
                            className={`w-4 h-4 rounded-full ${getNetworkColor(
                              network
                            )} border border-white/20`}
                            title={`${getNetworkName(network)}: ${score}`}
                          />
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Optimized for small screens */}
        <div className="md:hidden space-y-2 px-1">
          {sortedSquatUsers.slice(0, 10).map((entry, i) => (
            <div
              key={`squat-mobile-${entry.user}-${i}`}
              className={`bg-black/80 border border-[#fcb131]/50 rounded-lg p-3 cursor-pointer hover:bg-[#fcb131]/10 transition-colors ${
                i === 0 ? "border-[#fcb131] bg-[#fcb131]/10" : ""
              }`}
              onClick={() => handleUserClick(entry.user, "squats")}
            >
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <span
                    className="text-lg flex-shrink-0 text-[#fcb131] font-bold"
                    style={{ color: "#fcb131" }}
                  >
                    {i === 0
                      ? "🥇"
                      : i === 1
                      ? "🥈"
                      : i === 2
                      ? "🥉"
                      : `#${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-bold text-[#fcb131] text-xs truncate"
                      style={{ color: "#fcb131" }}
                    >
                      {progressiveDisplayNames[entry.user] ||
                        shortenAddress(entry.user)}
                    </div>
                    <div className="flex space-x-1 mt-1">
                      {Object.entries(entry.networks).map(
                        ([network, score]) => (
                          <div
                            key={network}
                            className={`w-2 h-2 rounded-full ${getNetworkColor(
                              network
                            )} flex-shrink-0`}
                            title={`${getNetworkName(network)}: ${score}`}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-[#fcb131] font-bold text-lg flex-shrink-0 ml-2">
                  {entry.totalScore}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Breakdown Modal */}
      {selectedUser && breakdownType && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2002]"
          onClick={closeBreakdown}
        >
          <div
            className="bg-black border-2 border-[#fcb131] rounded-lg p-6 max-w-md w-full mx-4 shadow-[0_0_25px_rgba(252,177,49,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-bold text-[#fcb131] mb-4 text-center">
              {progressiveDisplayNames[selectedUser] ||
                shortenAddress(selectedUser)}
            </h4>
            <p className="text-white mb-4 text-center">
              {breakdownType === "pushups" ? "💪 Push-ups" : "🏋️ Squats"}{" "}
              breakdown by network:
            </p>
            <div className="space-y-2">
              {Object.entries(
                breakdownType === "pushups"
                  ? pushupAggregated[selectedUser]?.networks || {}
                  : squatAggregated[selectedUser]?.networks || {}
              ).map(([network, score]) => (
                <div
                  key={network}
                  className="flex justify-between items-center bg-black/40 p-2 rounded border border-[#fcb131]/20"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${getNetworkColor(
                        network
                      )}`}
                    />
                    <span className="text-white font-medium">
                      {getNetworkName(network)}
                    </span>
                  </div>
                  <span className="text-[#fcb131] font-bold">{score}</span>
                </div>
              ))}
            </div>
            <button
              onClick={closeBreakdown}
              className="w-full mt-4 bg-[#fcb131] hover:bg-[#f39c12] text-black font-bold py-2 px-4 rounded transition-colors"
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
