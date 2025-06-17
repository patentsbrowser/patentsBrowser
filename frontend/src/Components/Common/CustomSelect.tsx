import React, { forwardRef } from 'react';
import './CustomSelect.scss';

export type SelectVariant = 'default' | 'filled' | 'outlined';
export type SelectSize = 'sm' | 'md' | 'lg';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  variant?: SelectVariant;
  size?: SelectSize;
  label?: string;
  hint?: string;
  error?: string;
  success?: string;
  options: Option[];
  placeholder?: string;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const CustomSelect = forwardRef<HTMLSelectElement, CustomSelectProps>(({
  variant = 'default',
  size = 'md',
  label,
  hint,
  error,
  success,
  options,
  placeholder = 'Select an option',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  id,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  const wrapperClasses = [
    'select-wrapper',
    `select-${variant}`,
    `select-${size}`,
    fullWidth && 'select-full-width',
    error && 'select-error',
    success && 'select-success',
    disabled && 'select-disabled',
    loading && 'select-loading',
    leftIcon && 'select-with-left-icon',
    rightIcon && 'select-with-right-icon',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={selectId} className="select-label">
          {label}
        </label>
      )}
      
      <div className="select-container">
        {leftIcon && (
          <span className="select-icon select-icon-left">
            {leftIcon}
          </span>
        )}
        
        <select
          ref={ref}
          id={selectId}
          className="select-field"
          disabled={disabled || loading}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {loading ? (
          <span className="select-icon select-icon-right">
            <span className="select-spinner" />
          </span>
        ) : rightIcon ? (
          <span className="select-icon select-icon-right">
            {rightIcon}
          </span>
        ) : (
          <span className="select-icon select-icon-right select-arrow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        )}
      </div>
      
      {error && (
        <span className="select-message select-error-message">
          <span className="select-message-icon">⚠️</span>
          {error}
        </span>
      )}
      
      {success && !error && (
        <span className="select-message select-success-message">
          <span className="select-message-icon">✅</span>
          {success}
        </span>
      )}
      
      {hint && !error && !success && (
        <span className="select-message select-hint-message">
          {hint}
        </span>
      )}
    </div>
  );
});

CustomSelect.displayName = 'CustomSelect';

export default CustomSelect;
