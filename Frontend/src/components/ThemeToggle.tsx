import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    // Verificar localStorage ou preferência do sistema
    const savedTheme = localStorage.getItem('sgpf_theme');
    return savedTheme === 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('sgpf_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('sgpf_theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-lg bg-bg-card border border-border-subtle hover:bg-surface/50 dark:hover:bg-dark/20 transition-all duration-300 shadow-sm group"
      aria-label="Alternar tema"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-ember-light group-hover:rotate-45 transition-transform duration-500" />
      ) : (
        <Moon className="w-5 h-5 text-muted group-hover:-rotate-12 transition-transform duration-500" />
      )}
    </button>
  );
}
