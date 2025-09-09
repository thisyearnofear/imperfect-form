'use client';

import React, { forwardRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useEnhancedChainTheme } from '@/contexts/ChainThemeContext';
import type { ChainId, ComponentSize, ComponentVariant, ChainTheme } from '@/types/theme';

// Utility function for combining class names
const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter((cls): cls is string => Boolean(cls) && typeof cls === 'string').join(' ');
};

// Base component props interface
interface BaseThemeProps {
  className?: string;
  variant?: ComponentVariant;
  size?: ComponentSize;
  disabled?: boolean;
}

// Theme Button Component
interface ThemeButtonProps extends BaseThemeProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const ThemeButton = forwardRef<HTMLButtonElement, ThemeButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      icon,
      fullWidth = false,
      onClick,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const { currentTheme } = useEnhancedChainTheme();
    const chainId = currentTheme.id;

    const baseClasses = [
      'theme-button',
      `theme-button--${variant}`,
      `theme-button--${size}`,
      `theme-button--${chainId}`,
      fullWidth && 'theme-button--full-width',
      loading && 'theme-button--loading',
      disabled && 'theme-button--disabled',
      className,
    ];

    return (
      <button
        ref={ref}
        type={type}
        className={cn(...baseClasses)}
        disabled={disabled || loading}
        onClick={onClick}
        style={
          {
            '--button-primary': currentTheme.palette.primary,
            '--button-secondary': currentTheme.palette.secondary,
            '--button-accent': currentTheme.palette.accent,
          } as React.CSSProperties
        }
        {...props}
      >
        {loading && <span className="theme-button__spinner" />}
        {icon && <span className="theme-button__icon">{icon}</span>}
        <span className="theme-button__content">{children}</span>
      </button>
    );
  }
);

ThemeButton.displayName = 'ThemeButton';

// Theme Card Component
interface ThemeCardProps extends BaseThemeProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  image?: string;
  actions?: React.ReactNode;
  hoverable?: boolean;
  padding?: ComponentSize;
  style?: React.CSSProperties;
}

const ThemeCard: React.FC<ThemeCardProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  title,
  subtitle,
  image,
  actions,
  hoverable = false,
  padding = 'md',
  disabled = false,
}) => {
  const { currentTheme } = useEnhancedChainTheme();
  const chainId = currentTheme.id;

  const cardClasses = [
    'theme-card',
    `theme-card--${variant}`,
    `theme-card--${size}`,
    `theme-card--${chainId}`,
    `theme-card--padding-${padding}`,
    hoverable && 'theme-card--hoverable',
    disabled && 'theme-card--disabled',
    className,
  ];

  return (
    <div
      className={cn(...cardClasses)}
      style={
        {
          '--card-background': currentTheme.palette.surface,
          '--card-border': currentTheme.palette.primary,
          '--card-shadow': currentTheme.shadows.colored,
        } as React.CSSProperties
      }
    >
      {image && (
        <div className="theme-card__image">
          <Image src={image} alt={title || 'Card image'} width={300} height={200} />
        </div>
      )}

      {(title || subtitle) && (
        <div className="theme-card__header">
          {title && <h3 className="theme-card__title">{title}</h3>}
          {subtitle && <p className="theme-card__subtitle">{subtitle}</p>}
        </div>
      )}

      <div className="theme-card__content">{children}</div>

      {actions && <div className="theme-card__actions">{actions}</div>}
    </div>
  );
};

// Theme Input Component
interface ThemeInputProps extends BaseThemeProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const ThemeInput = forwardRef<HTMLInputElement, ThemeInputProps>(
  (
    {
      type = 'text',
      placeholder,
      value,
      onChange,
      label,
      error,
      leftIcon,
      rightIcon,
      className,
      variant = 'primary',
      size = 'md',
      disabled = false,
      ...props
    },
    ref
  ) => {
    const { currentTheme } = useEnhancedChainTheme();
    const chainId = currentTheme.id;

    const inputClasses = [
      'theme-input',
      `theme-input--${variant}`,
      `theme-input--${size}`,
      `theme-input--${chainId}`,
      error ? 'theme-input--error' : '',
      disabled ? 'theme-input--disabled' : '',
      leftIcon ? 'theme-input--with-left-icon' : '',
      rightIcon ? 'theme-input--with-right-icon' : '',
      className || '',
    ].filter(Boolean);

    return (
      <div className="theme-input-wrapper">
        {label && <label className="theme-input__label">{label}</label>}

        <div className="theme-input__container">
          {leftIcon && (
            <span className="theme-input__icon theme-input__icon--left">{leftIcon}</span>
          )}

          <input
            ref={ref}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className={cn(...inputClasses)}
            disabled={disabled}
            style={
              {
                '--input-border': currentTheme.components.input.border,
                '--input-focus': currentTheme.palette.primary,
                '--input-error': currentTheme.palette.error,
              } as React.CSSProperties
            }
            {...props}
          />

          {rightIcon && (
            <span className="theme-input__icon theme-input__icon--right">{rightIcon}</span>
          )}
        </div>

        {error && <span className="theme-input__error">{error}</span>}
      </div>
    );
  }
);

ThemeInput.displayName = 'ThemeInput';

// Theme Badge Component
interface ThemeBadgeProps extends BaseThemeProps {
  children: React.ReactNode;
  color?: 'primary' | 'secondary' | 'accent';
  dot?: boolean;
}

const ThemeBadge: React.FC<ThemeBadgeProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  color = 'primary',
  dot = false,
  disabled = false,
}) => {
  const { currentTheme } = useEnhancedChainTheme();
  const chainId = currentTheme.id;

  const badgeClasses = [
    'theme-badge',
    `theme-badge--${variant}`,
    `theme-badge--${size}`,
    `theme-badge--${chainId}`,
    `theme-badge--${color}`,
    dot && 'theme-badge--dot',
    disabled && 'theme-badge--disabled',
    className,
  ];

  return (
    <span
      className={cn(...badgeClasses)}
      style={
        {
          '--badge-primary': currentTheme.palette.primary,
          '--badge-secondary': currentTheme.palette.secondary,
          '--badge-accent': currentTheme.palette.accent,
        } as React.CSSProperties
      }
    >
      {dot && <span className="theme-badge__dot" />}
      {children}
    </span>
  );
};

// Theme Modal Component
interface ThemeModalProps extends BaseThemeProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
}

const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  showCloseButton = true,
  className,
  variant = 'primary',
  size = 'md',
  disabled = false,
}) => {
  const { currentTheme } = useEnhancedChainTheme();
  const chainId = currentTheme.id;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalClasses = [
    'theme-modal',
    `theme-modal--${variant}`,
    `theme-modal--${size}`,
    `theme-modal--${chainId}`,
    disabled && 'theme-modal--disabled',
    className,
  ];

  return (
    <div className="theme-modal-overlay" onClick={onClose}>
      <div
        className={cn(...modalClasses)}
        onClick={(e) => e.stopPropagation()}
        style={
          {
            '--modal-background': currentTheme.palette.background,
            '--modal-border': currentTheme.palette.primary,
            '--modal-shadow': currentTheme.shadows.xl,
          } as React.CSSProperties
        }
      >
        {(title || showCloseButton) && (
          <div className="theme-modal__header">
            {title && <h2 className="theme-modal__title">{title}</h2>}
            {showCloseButton && (
              <button className="theme-modal__close" onClick={onClose} aria-label="Close modal">
                ×
              </button>
            )}
          </div>
        )}

        <div className="theme-modal__content">{children}</div>

        {footer && <div className="theme-modal__footer">{footer}</div>}
      </div>
    </div>
  );
};

// Theme Spinner Component
interface ThemeSpinnerProps extends BaseThemeProps {
  color?: 'primary' | 'secondary' | 'accent';
}

const ThemeSpinner: React.FC<ThemeSpinnerProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  color = 'primary',
  disabled = false,
}) => {
  const { currentTheme } = useEnhancedChainTheme();
  const chainId = currentTheme.id;

  const spinnerClasses = [
    'theme-spinner',
    `theme-spinner--${variant}`,
    `theme-spinner--${size}`,
    `theme-spinner--${chainId}`,
    `theme-spinner--${color}`,
    disabled && 'theme-spinner--disabled',
    className,
  ];

  return (
    <div
      className={cn(...spinnerClasses)}
      style={
        {
          '--spinner-primary': currentTheme.palette.primary,
          '--spinner-secondary': currentTheme.palette.secondary,
          '--spinner-accent': currentTheme.palette.accent,
        } as React.CSSProperties
      }
    >
      <div className="theme-spinner__circle" />
    </div>
  );
};

// Theme Tooltip Component
interface ThemeTooltipProps extends BaseThemeProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const ThemeTooltip: React.FC<ThemeTooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 500,
  className,
  variant = 'primary',
  size = 'md',
  disabled = false,
}) => {
  const { currentTheme } = useEnhancedChainTheme();
  const chainId = currentTheme.id;
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (disabled) return;
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  const tooltipClasses = [
    'theme-tooltip',
    `theme-tooltip--${variant}`,
    `theme-tooltip--${size}`,
    `theme-tooltip--${chainId}`,
    `theme-tooltip--${position}`,
    isVisible && 'theme-tooltip--visible',
    disabled && 'theme-tooltip--disabled',
    className,
  ];

  return (
    <div className="theme-tooltip-wrapper" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
      {children}
      <div
        className={cn(...tooltipClasses)}
        style={
          {
            '--tooltip-background': currentTheme.palette.surface,
            '--tooltip-text': currentTheme.palette.text,
            '--tooltip-border': currentTheme.palette.primary,
          } as React.CSSProperties
        }
      >
        {content}
      </div>
    </div>
  );
};

// Theme Progress Component
interface ThemeProgressProps extends BaseThemeProps {
  value: number;
  max?: number;
  showLabel?: boolean;
}

const ThemeProgress: React.FC<ThemeProgressProps> = ({
  value,
  max = 100,
  showLabel = false,
  className,
  variant = 'primary',
  size = 'md',
  disabled = false,
}) => {
  const { currentTheme } = useEnhancedChainTheme();
  const chainId = currentTheme.id;
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const progressClasses = [
    'theme-progress',
    `theme-progress--${variant}`,
    `theme-progress--${size}`,
    `theme-progress--${chainId}`,
    disabled && 'theme-progress--disabled',
    className,
  ];

  return (
    <div className="theme-progress-wrapper">
      {showLabel && <div className="theme-progress__label">{Math.round(percentage)}%</div>}
      <div
        className={cn(...progressClasses)}
        style={
          {
            '--progress-background': currentTheme.palette.surface,
            '--progress-fill': currentTheme.palette.primary,
            '--progress-border': currentTheme.palette.primary,
          } as React.CSSProperties
        }
      >
        <div className="theme-progress__fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

// Chain Indicator Component
interface ChainIndicatorProps {
  chainId?: ChainId;
  showName?: boolean;
  size?: ComponentSize;
  className?: string;
}

const ChainIndicator: React.FC<ChainIndicatorProps> = ({
  chainId,
  showName = false,
  size = 'md',
  className,
}) => {
  const { currentTheme } = useEnhancedChainTheme();
  const displayChainId = chainId || currentTheme.id;

  const indicatorClasses = [
    'chain-indicator',
    `chain-indicator--${displayChainId}`,
    `chain-indicator--${size}`,
    showName && 'chain-indicator--with-name',
    className,
  ];

  return (
    <div
      className={cn(...indicatorClasses)}
      style={
        {
          '--indicator-color': currentTheme.palette.primary,
          '--indicator-background': currentTheme.palette.surface,
        } as React.CSSProperties
      }
    >
      <div className="chain-indicator__dot" />
      {showName && (
        <span className="chain-indicator__name">
          {displayChainId.charAt(0).toUpperCase() + displayChainId.slice(1)}
        </span>
      )}
    </div>
  );
};

// Theme Preview Component
interface ThemePreviewProps {
  theme: ChainTheme;
  chainId: ChainId;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const ThemePreview: React.FC<ThemePreviewProps> = ({
  theme,
  chainId,
  compact = false,
  className,
  style,
  onClick,
}) => {
  const previewClasses = [
    'theme-preview',
    `theme-preview--${chainId}`,
    compact && 'theme-preview--compact',
    className,
  ];

  return (
    <div
      className={cn(...previewClasses)}
      style={
        {
          '--preview-primary': theme.palette.primary,
          '--preview-secondary': theme.palette.secondary,
          '--preview-accent': theme.palette.accent,
          '--preview-background': theme.palette.background,
          '--preview-surface': theme.palette.surface,
          '--preview-text': theme.palette.text,
          ...style,
        } as React.CSSProperties
      }
      onClick={onClick}
    >
      <div className="theme-preview__header">
        <ChainIndicator chainId={chainId} showName={!compact} />
        {!compact && (
          <div className="theme-preview__colors">
            <div className="theme-preview__color theme-preview__color--primary" />
            <div className="theme-preview__color theme-preview__color--secondary" />
            <div className="theme-preview__color theme-preview__color--accent" />
          </div>
        )}
      </div>

      {!compact && (
        <div className="theme-preview__content">
          <div className="theme-preview__sample-button">Sample Button</div>
          <div className="theme-preview__sample-card">
            <div className="theme-preview__sample-text">Sample Text</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export all components
export {
  ThemeButton,
  ThemeCard,
  ThemeInput,
  ThemeBadge,
  ThemeModal,
  ThemeSpinner,
  ThemeTooltip,
  ThemeProgress,
  ChainIndicator,
  ThemePreview,
};
