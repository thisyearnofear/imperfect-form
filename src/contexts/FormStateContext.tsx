'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useNotification } from '@/hooks/useNotification';

/**
 * FormStateContext - Unified form state management
 * Core Principles: DRY, MODULAR, CLEAN
 * Provides consistent form state handling across all forms
 */

type FormStatus = 'idle' | 'validating' | 'submitting' | 'success' | 'error';

type ValidationError = {
  field: string;
  message: string;
};

type FormValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
};

interface FormStateContextType {
  status: FormStatus;
  errors: ValidationError[];
  isLoading: boolean;
  isSubmitting: boolean;
  isSuccess: boolean;
  isError: boolean;
  validateForm: (validationFn: () => FormValidationResult) => boolean;
  handleSubmit: (submitFn: () => Promise<void>) => Promise<void>;
  resetForm: () => void;
  setFieldError: (field: string, message: string) => void;
  clearFieldError: (field: string) => void;
  clearAllErrors: () => void;
}

const FormStateContext = createContext<FormStateContextType | undefined>(undefined);

export function FormStateProvider({ children }: { children: ReactNode }) {
  const notify = useNotification();
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errors, setErrors] = useState<ValidationError[]>([]);

  /**
   * Validate form using provided validation function
   * Returns true if valid, false if invalid
   */
  const validateForm = useCallback((validationFn: () => FormValidationResult): boolean => {
    setStatus('validating');
    const result = validationFn();

    if (!result.isValid) {
      setErrors(result.errors);
      setStatus('error');
      return false;
    }

    setErrors([]);
    setStatus('idle');
    return true;
  }, []);

  /**
   * Handle form submission with loading states and error handling
   */
  const handleSubmit = useCallback(
    async (submitFn: () => Promise<void>) => {
      setStatus('submitting');

      try {
        await submitFn();
        setStatus('success');
        notify.success('Operation completed successfully!');
      } catch (error) {
        setStatus('error');
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        notify.error(errorMessage);
        console.error('Form submission error:', error);
      }
    },
    [notify]
  );

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setStatus('idle');
    setErrors([]);
  }, []);

  /**
   * Set error for specific field
   */
  const setFieldError = useCallback(
    (field: string, message: string) => {
      setErrors((prev) => {
        const existingErrorIndex = prev.findIndex((e) => e.field === field);

        if (existingErrorIndex >= 0) {
          // Update existing error
          const newErrors = [...prev];
          newErrors[existingErrorIndex] = { field, message };
          return newErrors;
        }

        // Add new error
        return [...prev, { field, message }];
      });

      if (status !== 'error') {
        setStatus('error');
      }
    },
    [status]
  );

  /**
   * Clear error for specific field
   */
  const clearFieldError = useCallback(
    (field: string) => {
      setErrors((prev) => prev.filter((e) => e.field !== field));

      if (errors.length === 1) {
        setStatus('idle');
      }
    },
    [errors.length]
  );

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors([]);
    if (status === 'error') {
      setStatus('idle');
    }
  }, [status]);

  const value = {
    status,
    errors,
    isLoading: status === 'validating' || status === 'submitting',
    isSubmitting: status === 'submitting',
    isSuccess: status === 'success',
    isError: status === 'error',
    validateForm,
    handleSubmit,
    resetForm,
    setFieldError,
    clearFieldError,
    clearAllErrors,
  };

  return <FormStateContext.Provider value={value}>{children}</FormStateContext.Provider>;
}

export function useFormState() {
  const context = useContext(FormStateContext);
  if (!context) {
    throw new Error('useFormState must be used within a FormStateProvider');
  }
  return context;
}

/**
 * FormStateWrapper - Convenience component for wrapping forms
 * Provides automatic form state management
 */
export function FormStateWrapper({
  children,
  onSubmit,
  validate,
  className = '',
}: {
  children: ReactNode;
  onSubmit: () => Promise<void>;
  validate?: () => FormValidationResult;
  className?: string;
}) {
  const { handleSubmit, validateForm } = useFormState();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate if validation function provided
    if (validate) {
      const isValid = validateForm(validate);
      if (!isValid) return;
    }

    // Submit form
    await handleSubmit(onSubmit);
  };

  return (
    <form onSubmit={handleFormSubmit} className={className}>
      {children}
    </form>
  );
}
