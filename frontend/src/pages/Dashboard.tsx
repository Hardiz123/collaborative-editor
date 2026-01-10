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
import { ThemeToggle } from '@/components/ui/theme-toggle';

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
        refetchInterval: 10000
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
            <div className="w-full max-w-4xl flex justify-between items-center">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Button variant="outline" onClick={() => setShowLogoutConfirm(true)} className="gap-2">
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Logout</span>
                    </Button>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, type: "spring" }}
                className="w-full max-w-4xl"
            >
                <Card className="w-full glass-panel">
                    <CardHeader className="pb-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-semibold">
                                Welcome back, {user?.username}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {user?.email}
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Your Documents</h3>
                                <Button
                                    onClick={handleCreateDocument}
                                    disabled={isCreating}
                                    className="gap-2"
                                >
                                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    New Document
                                </Button>
                            </div>

                            {isLoading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : documents?.length === 0 ? (
                                <div className="text-center p-8 bg-muted/50 rounded-lg border border-border">
                                    <p className="text-muted-foreground mb-4">No documents yet. Create your first document to get started.</p>
                                    <Button variant="outline" onClick={handleCreateDocument}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Document
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {documents?.map((doc) => (
                                        <div
                                            key={doc.id}
                                            onClick={() => navigate(`/editor/${doc.id}`)}
                                            className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-all cursor-pointer flex items-start gap-3 group relative"
                                        >
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <FileText className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold truncate">{doc.title}</h4>
                                                <p className="text-xs text-muted-foreground">
                                                    Updated {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                                                </p>
                                                {doc.owner_id !== user?.userID && (
                                                    <span className="inline-block mt-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                                                        Shared
                                                    </span>
                                                )}
                                            </div>
                                            {doc.owner_id === user?.userID && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
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
                    </CardContent>
                </Card>
            </motion.div>

            <AnimatePresence>
                {showLogoutConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowLogoutConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Card className="w-full max-w-md glass-panel">
                                <CardHeader className="text-center">
                                    <CardTitle className="text-xl font-semibold">Confirm Logout</CardTitle>
                                </CardHeader>
                                <CardContent className="text-center">
                                    <p className="text-muted-foreground mb-6">
                                        Are you sure you want to log out?
                                    </p>
                                    <div className="flex gap-4 justify-center">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowLogoutConfirm(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => logout()}
                                            disabled={isAuthLoading}
                                        >
                                            {isAuthLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Logout
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Dialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Delete Document</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-foreground">{documentToDelete?.title}</span>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDocumentToDelete(null)}
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
