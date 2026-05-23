import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, label, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-text-main mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={`flex h-10 w-full rounded-md border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-main placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-ember focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all ${
            error ? 'border-red-500 focus:ring-red-500' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
