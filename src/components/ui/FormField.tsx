'use client';

import React, { forwardRef } from 'react';
import '@/styles/animations.css';

type FieldSize = 'sm' | 'md' | 'lg';
type FieldVariant = 'primary' | 'secondary' | 'error';

interface BaseFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  size?: FieldSize;
  variant?: FieldVariant;
  required?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

interface InputProps extends BaseFieldProps, React.InputHTMLAttributes<HTMLInputElement> {}

interface TextareaProps extends BaseFieldProps, React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

interface SelectProps extends BaseFieldProps, React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

interface CheckboxProps extends BaseFieldProps, React.InputHTMLAttributes<HTMLInputElement> {}

interface RadioProps extends BaseFieldProps, React.InputHTMLAttributes<HTMLInputElement> {}

// Shared styles
const sizeClasses: Record<FieldSize, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

const variantClasses: Record<FieldVariant, string> = {
  primary:
    'bg-gray-800 border border-gray-600 focus:border-[#fcb131] focus:ring-1 focus:ring-[#fcb131]',
  secondary:
    'bg-gray-900 border border-gray-700 focus:border-gray-500 focus:ring-1 focus:ring-gray-500',
  error: 'bg-gray-800 border border-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-400',
};

const baseFieldClasses =
  'w-full rounded-lg text-white focus:outline-none transition-colors placeholder-gray-500';

/**
 * FormField Input Component
 * Unified input handling with label, error states, and icons
 */
export const FormInput = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      disabled = false,
      size = 'md',
      variant = 'primary',
      required = false,
      fullWidth = true,
      leftIcon,
      rightIcon,
      className = '',
      ...props
    },
    ref
  ) => {
    const effectiveVariant = error ? 'error' : variant;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-white mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            disabled={disabled}
            className={`
              ${baseFieldClasses}
              ${sizeClasses[size]}
              ${variantClasses[effectiveVariant]}
              ${leftIcon ? 'pl-9' : ''}
              ${rightIcon ? 'pr-9' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${className}
              form-focus-glow
            `}
            {...props}
          />

          {rightIcon && (
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {rightIcon}
            </span>
          )}
        </div>

        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        {hint && !error && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
      </div>
    );
  }
);
FormInput.displayName = 'FormInput';

/**
 * FormField Textarea Component
 * Multi-line text input with consistent styling
 */
export const FormTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      disabled = false,
      size = 'md',
      variant = 'primary',
      required = false,
      fullWidth = true,
      className = '',
      ...props
    },
    ref
  ) => {
    const effectiveVariant = error ? 'error' : variant;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-white mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          disabled={disabled}
          className={`
            ${baseFieldClasses}
            ${sizeClasses[size]}
            ${variantClasses[effectiveVariant]}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            resize-vertical min-h-[120px]
            ${className}
          `}
          {...props}
        />

        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        {hint && !error && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
      </div>
    );
  }
);
FormTextarea.displayName = 'FormTextarea';

/**
 * FormField Select Component
 * Dropdown with consistent styling
 */
export const FormSelect = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      disabled = false,
      size = 'md',
      variant = 'primary',
      required = false,
      fullWidth = true,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const effectiveVariant = error ? 'error' : variant;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-white mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <select
          ref={ref}
          disabled={disabled}
          className={`
            ${baseFieldClasses}
            ${sizeClasses[size]}
            ${variantClasses[effectiveVariant]}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            appearance-none pr-9
            ${className}
          `}
          {...props}
        >
          {children}
        </select>

        {/* Dropdown arrow indicator */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>

        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        {hint && !error && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
      </div>
    );
  }
);
FormSelect.displayName = 'FormSelect';

/**
 * FormField Checkbox Component
 * Single checkbox with label
 */
export const FormCheckbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, disabled = false, required = false, className = '', ...props }, ref) => {
    return (
      <div className="flex items-center">
        <input
          ref={ref}
          type="checkbox"
          disabled={disabled}
          className={`
            w-4 h-4 rounded border-gray-600 text-[#fcb131] bg-gray-800
            focus:ring-[#fcb131] focus:ring-offset-0
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${className}
          `}
          {...props}
        />

        {label && (
          <label
            className={`ml-2 text-sm text-white ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {error && <p className="text-red-400 text-xs mt-1 w-full">{error}</p>}
      </div>
    );
  }
);
FormCheckbox.displayName = 'FormCheckbox';

/**
 * FormField Radio Component
 * Single radio button with label
 */
export const FormRadio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, error, disabled = false, required = false, className = '', ...props }, ref) => {
    return (
      <div className="flex items-center">
        <input
          ref={ref}
          type="radio"
          disabled={disabled}
          className={`
            w-4 h-4 border-gray-600 text-[#fcb131] bg-gray-800
            focus:ring-[#fcb131] focus:ring-offset-0
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${className}
          `}
          {...props}
        />

        {label && (
          <label
            className={`ml-2 text-sm text-white ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {error && <p className="text-red-400 text-xs mt-1 w-full">{error}</p>}
      </div>
    );
  }
);
FormRadio.displayName = 'FormRadio';

/**
 * Export all form field components
 */
export default {
  Input: FormInput,
  Textarea: FormTextarea,
  Select: FormSelect,
  Checkbox: FormCheckbox,
  Radio: FormRadio,
};
