import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2';
    
    const variants = {
      primary: 'bg-ember text-white hover:bg-fire shadow-sm shadow-fire/10',
      secondary: 'bg-bg-page text-text-main hover:bg-surface/50 border border-border-subtle',
      outline: 'border border-border-subtle bg-transparent hover:bg-bg-page text-text-main'
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
