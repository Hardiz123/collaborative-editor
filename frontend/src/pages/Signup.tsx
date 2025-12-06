import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { signup, isLoading, error } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        signup(
            { username, email, password },
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
                        ✨
                    </div>
                    <CardTitle className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-400">
                        Join the Party!
                    </CardTitle>
                    <CardDescription className="text-gray-200 text-lg">
                        Create your account to get started
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="John Doe"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus-visible:ring-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-2 rounded-xl transition-all transform hover:scale-105"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign Up Now! 🎉"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center">
                    <p className="text-sm text-white/80 font-medium">
                        Already have an account?{' '}
                        <Link to="/login" className="text-cyan-300 hover:text-cyan-200 hover:underline font-bold">
                            Sign in
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Signup;
