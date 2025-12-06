import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getUser } from '../services/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut } from 'lucide-react';

const Home = () => {
    const { logout } = useAuth();

    const { data: user, isLoading, error } = useQuery({
        queryKey: ['user'],
        queryFn: getUser,
        retry: false,
    });

    if (isLoading) {
        return (
            <div className="page-container">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container">
                <Card className="glass-panel border-red-500/50">
                    <CardContent className="pt-6 text-center">
                        <p className="text-red-400 mb-4">Failed to load user data</p>
                        <Button onClick={logout} variant="destructive">Logout</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="page-container flex-col gap-8 relative">
            <div className="absolute top-4 right-4">
                <Button variant="destructive" onClick={() => logout()} className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Logout
                </Button>
            </div>

            <Card className="w-full max-w-4xl glass-panel border-0 text-white shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 animate-pulse">
                        Welcome Home!
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-center mb-6">
                            Hello, <span className="text-yellow-300">{user?.username}</span>! 👋
                        </h2>
                        <p className="text-gray-400">
                            Email: {user?.email}
                        </p>
                        <p className="text-gray-400">
                            User ID: {user?.userID}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="p-6 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all hover:-translate-y-2 cursor-pointer backdrop-blur-sm">
                                    <div className="text-4xl mb-4">✨</div>
                                    <h3 className="font-bold text-xl mb-2 text-pink-300">Fun Feature {i}</h3>
                                    <p className="text-sm text-gray-200">This is a super cool feature loaded from the API!</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Home;
