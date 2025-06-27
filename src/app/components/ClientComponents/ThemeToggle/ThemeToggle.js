'use client';
import './ThemeToggle.css';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  
  // Only update the component state after mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Only render after component has mounted to avoid hydration mismatch
  if (!mounted) return null;
  const currentTheme = theme;

  return (
    <button 
      className="theme-toggle" 
      onClick={handleToggleTheme} 
      aria-label="Toggle dark mode"
      suppressHydrationWarning
    >
      <div className={`toggle-icon ${currentTheme === 'dark' ? 'dark' : 'light'}`} suppressHydrationWarning>
        <div className="sun-moon">
          <div className="rays"></div>
        </div>
      </div>
    </button>
  );
}