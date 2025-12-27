'use client';

import React, { useState } from 'react';
import {
  ThemeButton,
  ThemeCard,
  ThemeBadge,
  ThemeModal,
  ThemeSpinner,
  ThemeTooltip,
  ThemeProgress,
  ChainIndicator,
  ThemePreview,
} from '@/components/theme/ThemeComponents';
import { FormInput } from '@/components/ui';
import { useEnhancedChainTheme } from '@/contexts/ChainThemeContext';
import { CHAIN_THEMES } from '@/lib/themes/chainThemes';
import type { ChainId } from '@/types/theme';

/**
 * Theme Demo Component
 *
 * Comprehensive demonstration of the enhanced chain-specific theming system.
 * Shows all theme components, chain switching, and theme features.
 */
export const ThemeDemo: React.FC = () => {
  const { currentTheme, setTheme } = useEnhancedChainTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [progress, setProgress] = useState(65);
  const [isLoading, setIsLoading] = useState(false);

  const chains: ChainId[] = ['base', 'celo', 'polygon', 'monad'];

  const handleThemeSwitch = (chainId: ChainId) => {
    setIsLoading(true);
    setTimeout(() => {
      setTheme(chainId);
      setIsLoading(false);
    }, 500);
  };

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);
  };

  return (
    <div className="theme-demo" style={{ padding: '2rem', minHeight: '100vh' }}>
      {/* Header Section */}
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: currentTheme.palette.text,
            marginBottom: '1rem',
          }}
        >
          Enhanced Chain Theming System
        </h1>
        <p
          style={{
            fontSize: '1.125rem',
            color: currentTheme.palette.textSecondary,
            marginBottom: '2rem',
          }}
        >
          {currentTheme.description}
        </p>

        {/* Current Chain Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <ChainIndicator chainId={currentTheme.id} showName size="lg" />
        </div>
      </div>

      {/* Chain Switcher */}
      <ThemeCard title="Chain Selection" hoverable style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {chains.map((chainId) => (
            <ThemePreview
              key={chainId}
              theme={CHAIN_THEMES[chainId]}
              chainId={chainId}
              compact
              className={currentTheme.id === chainId ? 'active' : ''}
              style={{
                cursor: 'pointer',
                opacity: currentTheme.id === chainId ? 1 : 0.7,
                transform: currentTheme.id === chainId ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s ease-out',
              }}
              onClick={() => handleThemeSwitch(chainId)}
            />
          ))}
        </div>

        <div
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {chains.map((chainId) => (
            <ThemeButton
              key={chainId}
              variant={currentTheme.id === chainId ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleThemeSwitch(chainId)}
              disabled={isLoading}
            >
              {chainId.charAt(0).toUpperCase() + chainId.slice(1)}
            </ThemeButton>
          ))}
        </div>

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <ThemeSpinner size="sm" />
          </div>
        )}
      </ThemeCard>

      {/* Component Showcase */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem',
        }}
      >
        {/* Buttons Demo */}
        <ThemeCard title="Buttons" hoverable>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <ThemeButton variant="primary" size="sm">
                Primary
              </ThemeButton>
              <ThemeButton variant="secondary" size="sm">
                Secondary
              </ThemeButton>
              <ThemeButton variant="accent" size="sm">
                Accent
              </ThemeButton>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <ThemeButton variant="ghost" size="sm">
                Ghost
              </ThemeButton>
              <ThemeButton variant="outline" size="sm">
                Outline
              </ThemeButton>
              <ThemeButton variant="primary" size="sm" loading>
                Loading
              </ThemeButton>
            </div>
            <ThemeButton variant="primary" fullWidth>
              Full Width Button
            </ThemeButton>
          </div>
        </ThemeCard>

        {/* Inputs Demo */}
        <ThemeCard title="Form Elements" hoverable>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormInput
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <FormInput
              label="Password"
              type="password"
              placeholder="Enter password"
              rightIcon={<span>👁️</span>}
            />
            <FormInput
              label="Amount"
              type="number"
              placeholder="0.00"
              leftIcon={<span>💰</span>}
              error={inputValue.length > 0 && inputValue.length < 3 ? 'Too short' : undefined}
            />
          </div>
        </ThemeCard>

        {/* Badges and Indicators */}
        <ThemeCard title="Badges & Indicators" hoverable>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <ThemeBadge color="primary">Primary</ThemeBadge>
              <ThemeBadge color="secondary">Secondary</ThemeBadge>
              <ThemeBadge color="accent">Accent</ThemeBadge>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <ThemeBadge dot color="primary">
                Online
              </ThemeBadge>
              <ThemeBadge dot color="secondary">
                Pending
              </ThemeBadge>
              <ThemeBadge size="lg">Large Badge</ThemeBadge>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <ChainIndicator showName />
              <ThemeSpinner size="sm" />
            </div>
          </div>
        </ThemeCard>

        {/* Progress Demo */}
        <ThemeCard title="Progress & Loading" hoverable>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <ThemeProgress value={progress} showLabel />
            <ThemeProgress value={85} size="sm" />
            <ThemeProgress value={45} size="lg" />
            <ThemeButton variant="secondary" size="sm" onClick={simulateProgress}>
              Simulate Progress
            </ThemeButton>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <ThemeSpinner size="xs" />
              <ThemeSpinner size="sm" />
              <ThemeSpinner size="md" />
              <ThemeSpinner size="lg" />
            </div>
          </div>
        </ThemeCard>

        {/* Interactive Elements */}
        <ThemeCard title="Interactive Elements" hoverable>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <ThemeTooltip content="This is a helpful tooltip!" position="top">
              <ThemeButton variant="ghost" size="sm">
                Hover for Tooltip
              </ThemeButton>
            </ThemeTooltip>

            <ThemeButton variant="primary" onClick={() => setIsModalOpen(true)}>
              Open Modal
            </ThemeButton>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ color: currentTheme.palette.textSecondary }}>Theme Color:</span>
              <div
                style={{
                  width: '2rem',
                  height: '2rem',
                  backgroundColor: currentTheme.palette.primary,
                  borderRadius: '0.25rem',
                  border: `2px solid ${currentTheme.palette.text}`,
                }}
              />
            </div>
          </div>
        </ThemeCard>

        {/* Theme Information */}
        <ThemeCard title="Theme Details" hoverable>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <strong style={{ color: currentTheme.palette.text }}>Chain:</strong>
              <span style={{ color: currentTheme.palette.textSecondary, marginLeft: '0.5rem' }}>
                {currentTheme.displayName}
              </span>
            </div>
            <div>
              <strong style={{ color: currentTheme.palette.text }}>Network:</strong>
              <span style={{ color: currentTheme.palette.textSecondary, marginLeft: '0.5rem' }}>
                {currentTheme.metadata.networkType}
              </span>
            </div>
            <div>
              <strong style={{ color: currentTheme.palette.text }}>Chain ID:</strong>
              <span style={{ color: currentTheme.palette.textSecondary, marginLeft: '0.5rem' }}>
                {currentTheme.metadata.chainId}
              </span>
            </div>
            <div>
              <strong style={{ color: currentTheme.palette.text }}>Brand Color:</strong>
              <span style={{ color: currentTheme.palette.textSecondary, marginLeft: '0.5rem' }}>
                {currentTheme.metadata.brandColor}
              </span>
            </div>
          </div>
        </ThemeCard>
      </div>

      {/* Modal Demo */}
      <ThemeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Theme Modal Example"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <ThemeButton variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </ThemeButton>
            <ThemeButton variant="primary" onClick={() => setIsModalOpen(false)}>
              Confirm
            </ThemeButton>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: currentTheme.palette.text }}>
            This modal demonstrates the theme-aware modal component with proper styling that adapts
            to the current chain theme.
          </p>

          <FormInput label="Modal Input" placeholder="Type something..." />

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <ThemeBadge color="primary">Modal</ThemeBadge>
            <ThemeBadge color="secondary">Theme</ThemeBadge>
            <ThemeBadge color="accent">Demo</ThemeBadge>
          </div>
        </div>
      </ThemeModal>

      {/* Footer */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '3rem',
          padding: '2rem',
          borderTop: `1px solid ${currentTheme.palette.primary}`,
          color: currentTheme.palette.textMuted,
        }}
      >
        <p>
          Enhanced Chain-Specific Theming System • Built with React, TypeScript, and CSS Custom
          Properties
        </p>
        <div style={{ marginTop: '1rem' }}>
          <ChainIndicator chainId={currentTheme.id} showName />
        </div>
      </div>
    </div>
  );
};

export default ThemeDemo;
