'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createRemoteLogger } from '@/utils/remoteLogger';

const logger = createRemoteLogger('NeynarAuthContext');

// Neynar user interface (from SIWN)
export interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url?: string;
  signer_uuid: string;
  bio?: {
    text: string;
  };
  follower_count: number;
  following_count: number;
  verifications?: string[];
  verified_addresses?: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
  power_badge?: boolean;
}

export interface NeynarAuthState {
  user: NeynarUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface NeynarAuthContextType extends NeynarAuthState {
  signIn: () => void;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const NeynarAuthContext = createContext<NeynarAuthContextType | null>(null);

interface NeynarAuthProviderProps {
  children: ReactNode;
  clientId: string;
}

export function NeynarAuthProvider({ children }: NeynarAuthProviderProps) {
  const [user, setUser] = useState<NeynarUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = user !== null;

  // Load user from localStorage on mount
  useEffect(() => {
    const loadStoredUser = () => {
      try {
        const storedUser = localStorage.getItem('neynar_user');
        const storedSignerUuid = localStorage.getItem('neynar_signer_uuid');

        if (storedUser && storedSignerUuid) {
          const parsedUser = JSON.parse(storedUser);
          // Ensure signer_uuid is included
          if (!parsedUser.signer_uuid) {
            parsedUser.signer_uuid = storedSignerUuid;
          }
          setUser(parsedUser);
          logger.info('Loaded user from localStorage', {
            fid: parsedUser.fid,
            username: parsedUser.username,
          });
        }
      } catch (err) {
        logger.error('Failed to load user from localStorage:', err);
        // Clear corrupted data
        localStorage.removeItem('neynar_user');
        localStorage.removeItem('neynar_signer_uuid');
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  // Handle SIWN success callback
  const handleSignInSuccess = (data: {
    signer_uuid: string;
    fid: number;
    user: Partial<NeynarUser>;
  }) => {
    try {
      logger.info('SIWN success callback received:', data);

      const { signer_uuid, fid, user: userData } = data;

      if (!signer_uuid || !fid || !userData) {
        throw new Error('Missing required data from SIWN callback');
      }

      const neynarUser: NeynarUser = {
        fid,
        username: userData.username || '',
        display_name: userData.display_name || '',
        pfp_url: userData.pfp_url,
        signer_uuid,
        bio: userData.bio,
        follower_count: userData.follower_count || 0,
        following_count: userData.following_count || 0,
        verifications: userData.verifications,
        verified_addresses: userData.verified_addresses,
        power_badge: userData.power_badge,
      };

      // Store in state and localStorage
      setUser(neynarUser);
      localStorage.setItem('neynar_user', JSON.stringify(neynarUser));
      localStorage.setItem('neynar_signer_uuid', signer_uuid);

      setError(null);
      logger.info('User authenticated successfully', {
        fid,
        username: userData.username,
      });
    } catch (err) {
      logger.error('Failed to handle sign-in success:', err);
      setError('Failed to authenticate user');
    }
  };

  // Sign in function
  const signIn = () => {
    setError(null);
    // The actual sign-in is handled by the NeynarAuthButton component
    // This function can be used to trigger additional logic if needed
    logger.info('Sign-in initiated');
  };

  // Sign out function
  const signOut = () => {
    setUser(null);
    localStorage.removeItem('neynar_user');
    localStorage.removeItem('neynar_signer_uuid');
    setError(null);
    logger.info('User signed out');
  };

  // Refresh user data
  const refreshUser = async () => {
    if (!user?.signer_uuid) return;

    try {
      setIsLoading(true);
      // In a real implementation, you might want to fetch fresh user data from Neynar API
      // For now, we'll just keep the existing user data
      logger.info('User data refreshed');
    } catch (err) {
      logger.error('Failed to refresh user data:', err);
      setError('Failed to refresh user data');
    } finally {
      setIsLoading(false);
    }
  };

  // Set up global callback for SIWN
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (
        window as unknown as {
          onNeynarSignInSuccess?: typeof handleSignInSuccess;
        }
      ).onNeynarSignInSuccess = handleSignInSuccess;

      return () => {
        delete (
          window as unknown as {
            onNeynarSignInSuccess?: typeof handleSignInSuccess;
          }
        ).onNeynarSignInSuccess;
      };
    }
  }, []);

  const contextValue: NeynarAuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    signIn,
    signOut,
    refreshUser,
  };

  return <NeynarAuthContext.Provider value={contextValue}>{children}</NeynarAuthContext.Provider>;
}

export function useNeynarAuth(): NeynarAuthContextType {
  const context = useContext(NeynarAuthContext);
  if (!context) {
    throw new Error('useNeynarAuth must be used within a NeynarAuthProvider');
  }
  return context;
}

// Utility function to check if user has valid authentication
export function hasValidNeynarAuth(user: NeynarUser | null): boolean {
  return user !== null && !!user.signer_uuid && !!user.fid;
}
