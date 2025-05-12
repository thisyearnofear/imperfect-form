"use client";

import React from "react";
import Image from "next/image";

interface MedalProps {
  repCount: number;
  exerciseType: "pushups" | "squats";
}

const Medal: React.FC<MedalProps> = ({ repCount, exerciseType }) => {
  // Determine medal type based on rep count and exercise type
  const getMedalType = () => {
    if (exerciseType === "pushups") {
      if (repCount >= 30) return "gold";
      if (repCount >= 20) return "silver";
      if (repCount >= 10) return "bronze";
    } else {
      // Squats
      if (repCount >= 25) return "gold";
      if (repCount >= 15) return "silver";
      if (repCount >= 5) return "bronze";
    }
    return "participation";
  };

  const medalType = getMedalType();

  // Medal image paths
  const medalImages = {
    gold: "/medals/gold.svg",
    silver: "/medals/silver.svg",
    bronze: "/medals/bronze.svg",
    participation: "/medals/participation.svg",
  };

  // Medal descriptions
  const medalDescriptions = {
    gold: "Gold Medal - Outstanding Performance!",
    silver: "Silver Medal - Great Effort!",
    bronze: "Bronze Medal - Good Job!",
    participation: "Participation Award - Keep Going!",
  };

  return (
    <div className="medal-container flex flex-col items-center my-4">
      <div className="medal-image relative w-24 h-24 mb-2">
        <Image
          src={medalImages[medalType]}
          alt={medalDescriptions[medalType]}
          width={96}
          height={96}
          priority
        />
      </div>
      <div className="medal-description text-center text-lg font-bold">
        {medalDescriptions[medalType]}
      </div>
    </div>
  );
};

export default Medal;
