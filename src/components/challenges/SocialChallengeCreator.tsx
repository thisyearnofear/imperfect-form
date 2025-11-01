/**
 * Social Challenge Creator Component
 *
 * Allows users to create fitness challenges with friends and followers
 * from their social graphs (Farcaster, Twitter, etc.)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui';
import {
  MemoryButton,
  MemoryInput,
  MemoryTextarea,
  MemorySelect,
} from '@/components/ui/MemoryButton';
import { usePlatform } from '@/contexts/PlatformContext';
import { getMemoryClient, type IdentityNode } from '@/services/memoryApi';
import { createRemoteLogger } from '@/utils/remoteLogger';
import toast from 'react-hot-toast';

const logger = createRemoteLogger('SocialChallengeCreator');

interface ChallengeParticipant {
  id: string;
  username: string;
  platform: string;
  avatar?: string;
  isSelected: boolean;
}

interface SocialChallengeCreatorProps {
  onChallengeCreated?: (challenge: ChallengeData) => void;
  className?: string;
}

interface ChallengeData {
  title: string;
  description: string;
  type: 'pushups' | 'squats' | 'mixed';
  duration: number; // days
  participants: string[];
  isPrivate: boolean;
}

export default function SocialChallengeCreator({
  onChallengeCreated,
  className = '',
}: SocialChallengeCreatorProps) {
  const { wallet, user: farcasterUser } = usePlatform();
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<ChallengeParticipant[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [challengeData, setChallengeData] = useState<ChallengeData>({
    title: '',
    description: '',
    type: 'pushups',
    duration: 7,
    participants: [],
    isPrivate: false,
  });

  // Load friends from social graphs
  useEffect(() => {
    const loadFriends = async () => {
      if (!farcasterUser?.fid && !wallet.address) return;

      setLoading(true);
      try {
        const client = getMemoryClient();
        let followers: string[] = [];
        let following: string[] = [];

        // Get Farcaster connections if available
        if (farcasterUser?.fid) {
          try {
            followers = await client.getFarcasterFollowers(farcasterUser.fid, 20);
            following = await client.getFarcasterFollowing(farcasterUser.fid, 20);
          } catch (error) {
            logger.warn('Failed to load Farcaster connections', error);
          }
        }

        // Combine and deduplicate
        const allConnections = [...new Set([...followers, ...following])];

        // Get identity graphs for connections to get usernames/avatars
        const friendsData: ChallengeParticipant[] = [];
        for (const connection of allConnections.slice(0, 10)) {
          // Limit to 10 for performance
          try {
            // Try to get identity graph by Farcaster ID
            const identityGraph = await client.getIdentityGraphByFarcasterId(parseInt(connection));
            const primaryIdentity = identityGraph.identities.find(
              (id) => id.platform === 'farcaster'
            );

            if (primaryIdentity) {
              friendsData.push({
                id: connection,
                username: primaryIdentity.username || connection,
                platform: 'farcaster',
                avatar: primaryIdentity.avatar,
                isSelected: false,
              });
            }
          } catch (error) {
            // Fallback: just use FID
            friendsData.push({
              id: connection,
              username: connection,
              platform: 'farcaster',
              isSelected: false,
            });
          }
        }

        setFriends(friendsData);
        logger.info('Loaded social connections', { count: friendsData.length });
      } catch (error) {
        logger.error('Failed to load friends', error);
        toast.error('Failed to load friends list');
      } finally {
        setLoading(false);
      }
    };

    loadFriends();
  }, [farcasterUser?.fid, wallet.address]);

  const toggleFriendSelection = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const handleCreateChallenge = async () => {
    if (!challengeData.title.trim()) {
      toast.error('Please enter a challenge title');
      return;
    }

    if (selectedFriends.size === 0) {
      toast.error('Please select at least one friend');
      return;
    }

    const finalChallenge: ChallengeData = {
      ...challengeData,
      participants: Array.from(selectedFriends),
    };

    try {
      // Here you would typically save to your backend
      logger.info('Creating social challenge', finalChallenge);
      toast.success('Challenge created successfully!');

      onChallengeCreated?.(finalChallenge);

      // Reset form
      setChallengeData({
        title: '',
        description: '',
        type: 'pushups',
        duration: 7,
        participants: [],
        isPrivate: false,
      });
      setSelectedFriends(new Set());
    } catch (error) {
      logger.error('Failed to create challenge', error);
      toast.error('Failed to create challenge');
    }
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-6 border border-gray-700 ${className}`}>
      <h2 className="text-xl font-bold text-[#fcb131] mb-6">Create Social Challenge</h2>

      {/* Challenge Details */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Challenge Title</label>
          <MemoryInput
            type="text"
            value={challengeData.title}
            onChange={(e) => setChallengeData((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., Push-up Challenge 2025"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <MemoryTextarea
            value={challengeData.description}
            onChange={(e) => setChallengeData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your challenge..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Exercise Type</label>
            <MemorySelect
              value={challengeData.type}
              onChange={(e) =>
                setChallengeData((prev) => ({ ...prev, type: e.target.value as any }))
              }
            >
              <option value="pushups">Push-ups</option>
              <option value="squats">Squats</option>
              <option value="mixed">Mixed</option>
            </MemorySelect>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Duration (Days)</label>
            <MemorySelect
              value={challengeData.duration}
              onChange={(e) =>
                setChallengeData((prev) => ({ ...prev, duration: parseInt(e.target.value) }))
              }
            >
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
            </MemorySelect>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="private"
            checked={challengeData.isPrivate}
            onChange={(e) => setChallengeData((prev) => ({ ...prev, isPrivate: e.target.checked }))}
            className="mr-2"
          />
          <label htmlFor="private" className="text-sm text-gray-300">
            Make this challenge private (only invited friends can see it)
          </label>
        </div>
      </div>

      {/* Friends Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[#fcb131] mb-3">
          Invite Friends ({selectedFriends.size} selected)
        </h3>

        {loading ? (
          <div className="flex items-center justify-center p-4">
            <Spinner />
            <span className="ml-2 text-gray-400">Loading friends...</span>
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center p-4 text-gray-400">
            <p>No friends found. Connect your social accounts to invite friends!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedFriends.has(friend.id)
                    ? 'bg-[#fcb131]/10 border-[#fcb131]'
                    : 'bg-gray-800 border-gray-600 hover:border-gray-500'
                }`}
                onClick={() => toggleFriendSelection(friend.id)}
              >
                <div className="flex items-center space-x-3">
                  {friend.avatar ? (
                    <img
                      src={friend.avatar}
                      alt={friend.username}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-xs">
                      {friend.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-white">{friend.username}</div>
                    <div className="text-xs text-gray-400 capitalize">{friend.platform}</div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 border-2 rounded ${
                    selectedFriends.has(friend.id)
                      ? 'bg-[#fcb131] border-[#fcb131]'
                      : 'border-gray-500'
                  }`}
                >
                  {selectedFriends.has(friend.id) && <span className="text-black text-xs">✓</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Button */}
      <MemoryButton
        onClick={handleCreateChallenge}
        disabled={!challengeData.title.trim() || selectedFriends.size === 0}
        variant="primary"
        size="lg"
        fullWidth
      >
        Create Challenge
      </MemoryButton>

      {/* Memory Protocol Attribution */}
      <div className="mt-4 text-center text-xs text-gray-500">
        Social features powered by{' '}
        <a
          href="https://memoryproto.co"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#fcb131] hover:underline"
        >
          Memory Protocol
        </a>
      </div>
    </div>
  );
}
