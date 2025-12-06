import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TiptapEditor from '@/components/editor/TiptapEditor';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getDocument, updateDocument } from '@/services/documents';
import { CollaboratorModal } from '@/components/ui/collaborator-modal';
import { CollaboratorAvatars } from '@/components/CollaboratorAvatars';
import { useDocumentWebSocket } from '@/hooks/useDocumentWebSocket';
import { useYjsProvider } from '@/hooks/useYjsProvider';
import { useAuth } from '@/context/AuthContext';

const EditorPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [showShareModal, setShowShareModal] = useState(false);

    // Fetch document
    const { data: document, isLoading } = useQuery({
        queryKey: ['document', id],
        queryFn: () => getDocument(id!),
        enabled: !!id,
    });

    // WebSocket for real-time collaboration (presence)
    const { collaborators, isConnected } = useDocumentWebSocket({
        documentId: id!,
        enabled: !!id && !!document,
    });

    // Parse JWT token once to get user info
    const [tokenUser, setTokenUser] = useState<{ userID: string; username: string; email: string } | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found');
            return;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('Parsed JWT payload:', payload);
            const userData = {
                userID: payload.user_id || payload.sub || '',
                username: payload.username || '',
                email: payload.email || '',
            };
            console.log('Extracted user data:', userData);
            setTokenUser(userData);
        } catch (error) {
            console.error('Failed to parse token:', error);
        }
    }, []);

    // Yjs for real-time text editing
    const getUserColor = (userId: string) => {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
        const hash = userId.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
        return colors[hash % colors.length];
    };

    const currentUser = useMemo(() => {
        const userId = user?.userID || tokenUser?.userID || 'anonymous';
        const username = user?.username || tokenUser?.username || 'Anonymous';

        console.log('Creating currentUser:', { user, tokenUser, userId, username });

        return {
            name: username,
            color: getUserColor(userId),
        };
    }, [user, tokenUser]);

    const { ydoc, provider, synced } = useYjsProvider({
        documentId: id!,
        // Enable collaboration as soon as the document is loaded.
        // We allow anonymous fallback so cursors still appear even if the token is missing.
        enabled: !!id && !!document,
        username: currentUser.name,
        userColor: currentUser.color,
    });

    // Update title and content when document loads
    useEffect(() => {
        if (document) {
            setTitle(document.title);
            setContent(document.content || '');
            setIsInitialLoad(true);
            // Mark initial load as complete after a short delay to avoid saving on mount
            const timer = setTimeout(() => {
                setIsInitialLoad(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [document]);

    // Title save mutation
    const titleMutation = useMutation({
        mutationFn: (newTitle: string) => updateDocument(id!, { title: newTitle, content: content }),
    });

    // Content save mutation
    const contentMutation = useMutation({
        mutationFn: (newContent: string) => updateDocument(id!, { title: title, content: newContent }),
    });

    // Debounced title save
    useEffect(() => {
        if (!document || title === document.title || isInitialLoad) return;

        const timer = setTimeout(() => {
            console.log('Saving title:', title);
            titleMutation.mutate(title);
        }, 1000);

        return () => clearTimeout(timer);
    }, [title, document, isInitialLoad]);

    // Debounced content save
    useEffect(() => {
        if (!document || content === document.content || isInitialLoad) return;

        const timer = setTimeout(() => {
            console.log('Saving content (length):', content.length);
            contentMutation.mutate(content);
        }, 2000); // Slightly longer delay for content to reduce API calls

        return () => clearTimeout(timer);
    }, [content, document, isInitialLoad]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    // Debug logging
    console.log('EditorPage state:', {
        isLoading,
        hasDocument: !!document,
        hasUser: !!user,
        userId: user?.userID,
        username: user?.username,
        provider: !!provider
    });

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-zinc-950 text-white">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="page-container flex-col !justify-start !pt-8 gap-6">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-5xl flex items-center justify-between gap-4"
            >
                <div className="flex items-center gap-4 flex-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/dashboard')}
                        className="text-white hover:bg-white/10"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <Input
                        value={title}
                        onChange={handleTitleChange}
                        className="bg-transparent border-none text-2xl font-bold text-white focus-visible:ring-0 px-0 h-auto placeholder:text-white/50"
                        placeholder="Untitled Document"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-white/60 text-sm flex items-center gap-2">
                        {(titleMutation.isPending || contentMutation.isPending) ? (
                            <span className="flex items-center gap-2 animate-pulse">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Saving...
                            </span>
                        ) : synced ? (
                            <span className="text-green-400">✓ Synced</span>
                        ) : (
                            <span className="animate-pulse">Syncing...</span>
                        )}
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowShareModal(true)}
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                    >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                    </Button>
                </div>
            </motion.div>

            {/* Collaborator Avatars */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="w-full max-w-5xl flex items-center gap-4"
            >
                <CollaboratorAvatars 
                    collaborators={collaborators} 
                    currentUser={currentUser}
                    currentUserId={user?.userID || tokenUser?.userID}
                    maxDisplay={5} 
                />
                {isConnected && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        Live
                    </span>
                )}
            </motion.div>

            {/* Editor */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-full max-w-5xl flex-1 min-h-0"
            >
                {provider ? (
                    <TiptapEditor
                        ydoc={ydoc}
                        provider={provider}
                        currentUser={currentUser}
                        initialContent={document?.content}
                        onContentChange={(newContent) => {
                            setContent(newContent);
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/60">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        Connecting to collaboration server...
                    </div>
                )}
            </motion.div>

            <CollaboratorModal
                documentId={id!}
                open={showShareModal}
                onOpenChange={setShowShareModal}
            />
        </div>
    );
};

export default EditorPage;
