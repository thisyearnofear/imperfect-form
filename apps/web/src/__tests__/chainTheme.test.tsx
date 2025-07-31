import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnhancedChainThemeProvider, useChainTheme } from '../contexts/ChainThemeContext';

function TestComponent() {
  const { currentTheme } = useChainTheme();
  return <div data-testid="theme">{currentTheme.id}</div>;
}

describe('ChainThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides default chain on mount', () => {
    render(
      <EnhancedChainThemeProvider>
        <TestComponent />
      </EnhancedChainThemeProvider>
    );
    expect(screen.getByTestId('theme').textContent).toBe('base');
  });

  it('responds to storage event', () => {
    render(
      <EnhancedChainThemeProvider>
        <TestComponent />
      </EnhancedChainThemeProvider>
    );
    // Simulate storage event to switch chain
    window.dispatchEvent(new StorageEvent('storage', { key: 'selectedNetwork', newValue: 'polygon' }));
    expect(screen.getByTestId('theme').textContent).toBe('polygon');
  });
});