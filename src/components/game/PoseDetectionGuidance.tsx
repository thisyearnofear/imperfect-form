'use client';

import React, { useState, useEffect } from 'react';
import { createRemoteLogger } from '@/utils/remoteLogger';

const logger = createRemoteLogger('PoseDetectionGuidance');

interface PoseDetectionGuidanceProps {
  isVisible: boolean;
  hasCamera: boolean;
  hasPoseDetection: boolean;
  poseDetected: boolean;
  onDismiss?: () => void;
}

export default function PoseDetectionGuidance({
  isVisible,
  hasCamera,
  hasPoseDetection,
  poseDetected,
  onDismiss,
}: PoseDetectionGuidanceProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Determine current guidance step based on state
  useEffect(() => {
    if (!hasCamera) {
      setCurrentStep(0); // Camera setup
    } else if (!hasPoseDetection) {
      setCurrentStep(1); // Pose detection loading
    } else if (!poseDetected) {
      setCurrentStep(2); // Position guidance
    } else {
      setCurrentStep(3); // Ready to go
    }
  }, [hasCamera, hasPoseDetection, poseDetected]);

  const guidanceSteps = [
    {
      title: '📹 Camera',
      subtitle: 'Allow access',
      content: ['Show full body', 'Good lighting'],
      icon: '📹',
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-500/30',
    },
    {
      title: '🤖 Loading',
      subtitle: 'Initializing...',
      content: ['One moment'],
      icon: '🤖',
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      borderColor: 'border-purple-500/30',
    },
    {
      title: '🎯 Position',
      subtitle: 'Full body in view',
      content: ['Stand clear', 'Visible head to feet'],
      icon: '🎯',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      borderColor: 'border-yellow-500/30',
    },
    {
      title: '✅ Ready',
      subtitle: 'Detected',
      content: ['Go!'],
      icon: '✅',
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-500/30',
    },
  ];

  const currentGuidance = guidanceSteps[currentStep];

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`max-w-md w-full ${currentGuidance.bgColor} ${currentGuidance.borderColor} border rounded-lg p-6 text-center space-y-4`}
      >
        {/* Header */}
        <div className="space-y-2">
          <div className="text-4xl">{currentGuidance.icon}</div>
          <h2 className={`text-xl font-bold ${currentGuidance.color}`}>{currentGuidance.title}</h2>
          <p className="text-gray-300 text-sm">{currentGuidance.subtitle}</p>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center space-x-2">
          {guidanceSteps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index <= currentStep ? currentGuidance.color.replace('text-', 'bg-') : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="space-y-2">
          {currentGuidance.content.map((item, index) => (
            <p key={index} className="text-gray-300 text-sm">
              {item}
            </p>
          ))}
        </div>

        {/* Loading indicator for steps 0 and 1 */}
        {(currentStep === 0 || currentStep === 1) && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-center space-x-3 pt-2">
          {currentStep === 3 && onDismiss && (
            <button
              onClick={onDismiss}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Start
            </button>
          )}
        </div>

        {/* Skip option */}
        {onDismiss && currentStep < 3 && (
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-gray-400 text-xs underline"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
