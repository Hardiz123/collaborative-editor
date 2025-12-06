import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDocuments, createDocument, deleteDocument } from '@/services/documents';
import { getUser } from '@/services/auth';
import { Loader2, LogOut, Plus, FileText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const Dashboard = () => {
    const { logout, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<{ id: string, title: string } | null>(null);

    // Fetch user data
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getUser,
        retry: false,
    });

    // Fetch documents
    const { data: documents, isLoading } = useQuery({
        queryKey: ['documents'],
        queryFn: getDocuments,
    });

    // Create document mutation
    const createMutation = useMutation({
        mutationFn: createDocument,
        onSuccess: (data) => {
            navigate(`/editor/${data.id}`);
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to create document');
            setIsCreating(false);
        }
    });

    // Delete document mutation
    const deleteMutation = useMutation({
        mutationFn: deleteDocument,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            setDocumentToDelete(null);
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Failed to delete document');
        }
    });

    const handleCreateDocument = () => {
        setIsCreating(true);
        createMutation.mutate({
            title: 'Untitled Document',
            content: '<p>Start writing...</p>'
        });
    };

    const handleDeleteClick = (e: React.MouseEvent, doc: { id: string, title: string }) => {
        e.stopPropagation();
        setDocumentToDelete(doc);
    };

    const handleConfirmDelete = () => {
        if (documentToDelete) {
            deleteMutation.mutate(documentToDelete.id);
        }
    };

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
                                    <Button
                                        onClick={handleCreateDocument}
                                        disabled={isCreating}
                                        className="bg-white text-purple-600 hover:bg-gray-100 font-bold"
                                    >
                                        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                        New Document
                                    </Button>
                                </div>

                                {isLoading ? (
                                    <div className="flex justify-center p-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : documents?.length === 0 ? (
                                    <div className="text-center p-8 bg-white/5 rounded-xl border border-white/10">
                                        <p className="text-white/60 mb-4">No documents yet. Start creating!</p>
                                        <Button variant="outline" onClick={handleCreateDocument} className="border-white/20 text-white hover:bg-white/10">
                                            Create your first doc
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {documents?.map((doc) => (
                                            <div
                                                key={doc.id}
                                                onClick={() => navigate(`/editor/${doc.id}`)}
                                                className="p-4 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all hover:-translate-y-1 cursor-pointer backdrop-blur-sm flex items-start gap-3 group relative overflow-hidden"
                                            >
                                                <div className="p-2 bg-white/10 rounded-lg">
                                                    <FileText className="h-6 w-6 text-yellow-300" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-white truncate">{doc.title}</h4>
                                                    <p className="text-xs text-white/60">
                                                        Edited {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                                                    </p>
                                                    {doc.owner_id !== user?.userID && (
                                                        <span className="absolute top-2 right-2 text-[10px] bg-purple-500/50 text-white px-1.5 py-0.5 rounded-full border border-purple-400/30">
                                                            Shared
                                                        </span>
                                                    )}
                                                </div>
                                                {doc.owner_id === user?.userID && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white/50 hover:text-red-400 hover:bg-red-500/10"
                                                        onClick={(e) => handleDeleteClick(e, doc)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
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

            <Dialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
                <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white border-zinc-800">
                    <DialogHeader>
                        <DialogTitle>Delete Confirmation</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Are you sure you want to delete <span className="font-bold text-white">{documentToDelete?.title}</span>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setDocumentToDelete(null)}
                            className="text-white hover:bg-zinc-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Dashboard;
