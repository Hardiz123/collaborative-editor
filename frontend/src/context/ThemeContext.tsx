import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        // Check localStorage first
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        if (savedTheme === 'light' || savedTheme === 'dark') {
            return savedTheme;
        }
        // Default to light mode for professional appearance
        return 'light';
    });

    useEffect(() => {
        // Apply theme to document root
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        
        // Persist to localStorage
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setThemeState(prev => prev === 'light' ? 'dark' : 'light');
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
