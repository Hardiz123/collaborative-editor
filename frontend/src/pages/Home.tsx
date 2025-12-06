import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { getUser } from '../services/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut, Plus, FileText } from 'lucide-react';
import bananaFeature from '@/assets/banana-feature.png';

const Home = () => {
    const { logout, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [documents, setDocuments] = useState<any[]>([]);

    useEffect(() => {
        const savedDocs = JSON.parse(localStorage.getItem('collaborative_docs') || '{}');
        setDocuments(Object.values(savedDocs).sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    }, []);

    const createNewDocument = () => {
        const newId = Date.now().toString();
        navigate(`/editor/${newId}`);
    };

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

                            <div className="mt-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-white">Your Documents</h3>
                                    <Button onClick={createNewDocument} className="bg-white text-purple-600 hover:bg-gray-100 font-bold">
                                        <Plus className="mr-2 h-4 w-4" /> New Document
                                    </Button>
                                </div>

                                {documents.length === 0 ? (
                                    <div className="text-center p-8 bg-white/5 rounded-xl border border-white/10">
                                        <p className="text-white/60 mb-4">No documents yet. Start creating!</p>
                                        <Button variant="outline" onClick={createNewDocument} className="border-white/20 text-white hover:bg-white/10">
                                            Create your first doc
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {documents.map((doc) => (
                                            <Link key={doc.id} to={`/editor/${doc.id}`}>
                                                <div className="p-4 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all hover:-translate-y-1 cursor-pointer backdrop-blur-sm flex items-start gap-3">
                                                    <div className="p-2 bg-white/10 rounded-lg">
                                                        <FileText className="h-6 w-6 text-yellow-300" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-white truncate">{doc.title}</h4>
                                                        <p className="text-xs text-white/60">
                                                            Edited {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
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
