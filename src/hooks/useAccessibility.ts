'use client';

import { useCallback, useRef, useEffect } from 'react';

interface UseAccessibilityOptions {
  /** Initial focus element selector when modal/component opens */
  initialFocus?: string;
  /** Return focus element selector when closing */
  returnFocus?: string;
  /** Enable focus trapping in modal */
  trapFocus?: boolean;
  /** Prevent scroll when active */
  preventScroll?: boolean;
  /** Callback when escape is pressed */
  onEscape?: () => void;
}

/**
 * useAccessibility - Centralized accessibility management for interactive components
 *
 * Provides:
 * - Focus management (trap, return, initial focus)
 * - Keyboard navigation support
 * - ARIA attribute management
 * - Escape key handling
 *
 * @example
 * const { focusProps, getTabStopProps } = useAccessibility({
 *   trapFocus: true,
 *   onEscape: () => close(),
 * });
 */
export function useAccessibility(options: UseAccessibilityOptions = {}) {
  const { initialFocus, returnFocus, trapFocus = false, preventScroll = false, onEscape } = options;

  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the element that was focused before the component mounted
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;

    return () => {
      // Return focus when unmounting
      if (returnFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [returnFocus]);

  // Set initial focus
  useEffect(() => {
    if (initialFocus && containerRef.current) {
      const element = containerRef.current.querySelector<HTMLElement>(initialFocus);
      if (element) {
        element.focus();
      }
    }
  }, [initialFocus]);

  // Prevent scroll when active
  useEffect(() => {
    if (preventScroll) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [preventScroll]);

  // Handle keyboard events (escape to close)
  useEffect(() => {
    if (!onEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape]);

  // Focus trap implementation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!trapFocus || event.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusableElements = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: move backward
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: move forward
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [trapFocus]
  );

  // ARIA attributes for dialog
  const getDialogProps = useCallback(
    (props: Record<string, unknown> = {}) => ({
      role: 'dialog' as const,
      'aria-modal': true,
      'aria-labelledby': 'dialog-title',
      'aria-describedby': 'dialog-description',
      ...props,
    }),
    []
  );

  // ARIA attributes for button
  const getButtonProps = useCallback(
    (label: string, props: Record<string, unknown> = {}) => ({
      'aria-label': label,
      ...props,
    }),
    []
  );

  // ARIA attributes for input
  const getInputProps = useCallback(
    (label: string, props: Record<string, unknown> = {}) => ({
      'aria-label': label,
      'aria-describedby': `${label.toLowerCase().replace(/\s+/g, '-')}-description`,
      ...props,
    }),
    []
  );

  // ARIA attributes for listbox
  const getListboxProps = useCallback(
    (label: string, props: Record<string, unknown> = {}) => ({
      role: 'listbox' as const,
      'aria-label': label,
      tabIndex: 0,
      ...props,
    }),
    []
  );

  // ARIA attributes for listbox option
  const getOptionProps = useCallback(
    (index: number, selected: boolean, props: Record<string, unknown> = {}) => ({
      role: 'option' as const,
      'aria-selected': selected,
      'data-option-index': index,
      ...props,
    }),
    []
  );

  // ARIA attributes for tooltip trigger
  const getTooltipProps = useCallback(
    (content: string, props: Record<string, unknown> = {}) => ({
      'aria-describedby': `tooltip-${content.replace(/\s+/g, '-').toLowerCase()}`,
      ...props,
    }),
    []
  );

  // ARIA live region announcement
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute('role', 'status');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return {
    ref: containerRef,
    focusProps: {
      ref: containerRef,
      onKeyDown: handleKeyDown,
    },
    getDialogProps,
    getButtonProps,
    getInputProps,
    getListboxProps,
    getOptionProps,
    getTooltipProps,
    announce,
  };
}

export default useAccessibility;
