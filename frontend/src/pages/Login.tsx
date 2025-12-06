import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const { login, isLoading, error } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        login(
            { email: identifier, password },
            {
                onSuccess: () => {
                    navigate('/dashboard');
                },
            }
        );
    };

    return (
        <div className="page-container">
            <Card className="w-[400px] glass-panel border-0 text-white shadow-2xl">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2 animate-bounce-small">
                        🚀
                    </div>
                    <CardTitle className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-orange-400">
                        Welcome Back!
                    </CardTitle>
                    <CardDescription className="text-gray-200 text-lg">
                        Ready to jump back in?
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="identifier">Email or Username</Label>
                            <Input
                                id="identifier"
                                type="text"
                                placeholder="Email or Username"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus-visible:ring-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <PasswordInput
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus-visible:ring-primary"
                            />
                        </div>
                        {error && (
                            <div className="text-red-400 text-sm text-center">
                                {error.message}
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-bold py-2 rounded-xl transition-all transform hover:scale-105"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Let's Go! 🚀"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center">
                    <p className="text-sm text-white/80 font-medium">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-yellow-300 hover:text-yellow-200 hover:underline font-bold">
                            Sign up
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Login;
