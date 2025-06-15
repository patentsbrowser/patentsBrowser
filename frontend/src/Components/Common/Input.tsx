import React, { forwardRef } from 'react';
import './Input.scss';

export type InputVariant = 'default' | 'filled' | 'outlined';
export type InputSize = 'sm' | 'md' | 'lg';
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  hint?: string;
  error?: string;
  success?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  variant = 'default',
  size = 'md',
  label,
  hint,
  error,
  success,
  leftIcon,
  rightIcon,
  fullWidth = false,
  loading = false,
  className = '',
  disabled,
  type = 'text',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const wrapperClasses = [
    'input-wrapper',
    `input-${variant}`,
    `input-${size}`,
    fullWidth && 'input-full-width',
    error && 'input-error',
    success && 'input-success',
    disabled && 'input-disabled',
    loading && 'input-loading',
    leftIcon && 'input-with-left-icon',
    rightIcon && 'input-with-right-icon',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      
      <div className="input-container">
        {leftIcon && (
          <span className="input-icon input-icon-left">
            {leftIcon}
          </span>
        )}
        
        <input
          ref={ref}
          id={inputId}
          type={type}
          className="input-field"
          disabled={disabled || loading}
          {...props}
        />
        
        {loading ? (
          <span className="input-icon input-icon-right">
            <span className="input-spinner" />
          </span>
        ) : rightIcon ? (
          <span className="input-icon input-icon-right">
            {rightIcon}
          </span>
        ) : null}
      </div>
      
      {error && (
        <span className="input-message input-error-message">
          <span className="input-message-icon">⚠️</span>
          {error}
        </span>
      )}
      
      {success && !error && (
        <span className="input-message input-success-message">
          <span className="input-message-icon">✅</span>
          {success}
        </span>
      )}
      
      {hint && !error && !success && (
        <span className="input-message input-hint-message">
          {hint}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
