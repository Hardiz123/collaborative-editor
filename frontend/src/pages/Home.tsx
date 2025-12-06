import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getUser } from '../services/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut } from 'lucide-react';

const Home = () => {
    const { logout, isLoading: isAuthLoading } = useAuth();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
        <div className="page-container flex-col gap-6 p-4 md:p-8 relative">
            <div className="w-full max-w-4xl flex justify-end">
                <Button variant="destructive" onClick={() => setShowLogoutConfirm(true)} className="gap-2 shadow-lg hover:shadow-xl transition-all">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                </Button>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, type: "spring" }}
                className="w-full max-w-4xl"
            >
                <Card className="w-full glass-panel border-0 text-white shadow-2xl">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 animate-pulse drop-shadow-lg">
                            Welcome Home!
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-center mb-6">
                                Hello, <span className="text-yellow-300">{user?.username}</span>! 👋
                            </h2>
                            <p className="text-white/80 font-medium text-base md:text-lg break-all">
                                Email: <span className="text-white font-bold">{user?.email}</span>
                            </p>
                            <p className="text-white/80 font-medium text-base md:text-lg break-all">
                                User ID: <span className="text-white font-mono text-xs md:text-sm bg-white/10 px-2 py-1 rounded">{user?.userID}</span>
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
            </motion.div>

            <AnimatePresence>
                {showLogoutConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowLogoutConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Card className="w-full max-w-md glass-panel border-0 text-white shadow-2xl">
                                <CardHeader className="text-center">
                                    <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-2">
                                        🤔
                                    </div>
                                    <CardTitle className="text-2xl font-bold">Are you sure?</CardTitle>
                                </CardHeader>
                                <CardContent className="text-center">
                                    <p className="text-white/80 mb-6">
                                        Do you really want to leave this fun party? 🥺
                                    </p>
                                    <div className="flex gap-4 justify-center">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowLogoutConfirm(false)}
                                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                                        >
                                            Nah, stay here
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => logout()}
                                            className="bg-red-500 hover:bg-red-600"
                                            disabled={isAuthLoading}
                                        >
                                            {isAuthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            Yes, log me out
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Home;
