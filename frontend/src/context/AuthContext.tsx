import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login as loginApi, signup as signupApi, logout as logoutApi, User } from '../services/auth';

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (variables: { email: string; password: string }, options?: any) => void;
    signup: (variables: { username: string; email: string; password: string }, options?: any) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const queryClient = useQueryClient();

    useEffect(() => {
        // Initial user load is handled by the Home component or a separate useQuery
        // Here we just sync token state
        if (!token) {
            setUser(null);
        }
    }, [token]);

    const loginMutation = useMutation({
        mutationFn: loginApi,
        onSuccess: (data) => {
            localStorage.setItem('token', data.token);
            setToken(data.token);
            setUser(data.user);
        },
    });

    const signupMutation = useMutation({
        mutationFn: signupApi,
        onSuccess: (data) => {
            localStorage.setItem('token', data.token);
            setToken(data.token);
            setUser(data.user);
        },
    });

    const logoutMutation = useMutation({
        mutationFn: logoutApi,
        onSettled: () => {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            queryClient.clear();
        },
    });

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                login: loginMutation.mutate,
                signup: signupMutation.mutate,
                logout: logoutMutation.mutate,
                isAuthenticated: !!token,
                isLoading: loginMutation.isPending || signupMutation.isPending || logoutMutation.isPending,
                error: loginMutation.error || signupMutation.error || logoutMutation.error,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
