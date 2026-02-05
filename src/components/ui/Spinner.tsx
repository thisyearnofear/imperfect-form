'use client';
import React from 'react';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Spinner: React.FC<SpinnerProps> = ({ className, size = 'md' }) => {
  const sizeMap = {
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
  };

  const pxSize = sizeMap[size];

  return (
    <>
      <div className={`spinner ${className || ''}`} />
      <style jsx>{`
        .spinner {
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top: 3px solid currentColor;
          border-radius: 50%;
          width: ${pxSize};
          height: ${pxSize};
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
};

export default Spinner;
