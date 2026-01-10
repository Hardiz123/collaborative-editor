import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from './button';

export const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="transition-all duration-300 hover:bg-accent"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? (
                <Moon className="h-5 w-5 transition-transform duration-300 rotate-0" />
            ) : (
                <Sun className="h-5 w-5 transition-transform duration-300 rotate-0" />
            )}
        </Button>
    );
};
