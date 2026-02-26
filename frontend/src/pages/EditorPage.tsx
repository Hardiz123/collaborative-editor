import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TiptapEditor from '@/components/editor/TiptapEditor';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getDocument, updateDocument } from '@/services/documents';
import { CollaboratorModal } from '@/components/ui/collaborator-modal';
import { ShareLinkModal } from '@/components/ui/share-link-modal';
import { CollaboratorAvatars } from '@/components/CollaboratorAvatars';
import { useDocumentWebSocket } from '@/hooks/useDocumentWebSocket';
import { useYjsProvider } from '@/hooks/useYjsProvider';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const EditorPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);

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
    const [tokenUser, setTokenUser] = useState<{ userID: string; username: string; email: string; permission?: string } | null>(null);

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
                permission: payload.permission || 'edit', // 'read' or 'edit'
            };
            console.log('Extracted user data:', userData);
            setTokenUser(userData);
        } catch (error) {
            console.error('Failed to parse token:', error);
        }
    }, []);

    // Derive read-only state from token permission ('read' = view only)
    const isReadOnly = tokenUser?.permission === 'read';

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
        enabled: !!id && !!document,
        username: currentUser.name,
        userColor: currentUser.color,
    });

    const titleRef = useRef(title);
    const contentRef = useRef(content);
    const originalDocumentRef = useRef<{ title: string; content: string } | null>(null);

    // Keep refs in sync with state
    useEffect(() => {
        titleRef.current = title;
    }, [title]);

    useEffect(() => {
        contentRef.current = content;
    }, [content]);

    // Update title and content when document loads
    useEffect(() => {
        if (document) {
            setTitle(document.title);
            setContent(document.content || '');
            originalDocumentRef.current = {
                title: document.title,
                content: document.content || ''
            };
            setIsInitialLoad(true);
            const timer = setTimeout(() => {
                setIsInitialLoad(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [document]);

    // Save mutations
    const titleMutation = useMutation({
        mutationFn: (newTitle: string) => updateDocument(id!, { title: newTitle, content: contentRef.current }),
        onSuccess: (_, variables) => {
            if (originalDocumentRef.current) {
                originalDocumentRef.current.title = variables;
            }
        }
    });

    const contentMutation = useMutation({
        mutationFn: (newContent: string) => updateDocument(id!, { title: titleRef.current, content: newContent }),
        onSuccess: (_, variables) => {
            if (originalDocumentRef.current) {
                originalDocumentRef.current.content = variables;
            }
        }
    });

    // Debounced title save
    useEffect(() => {
        if (!document || isInitialLoad) return;
        if (title === originalDocumentRef.current?.title) return;

        const timer = setTimeout(() => {
            console.log('Saving title:', title);
            titleMutation.mutate(title);
        }, 300);

        return () => clearTimeout(timer);
    }, [title, document, isInitialLoad]);

    // Debounced content save
    useEffect(() => {
        if (!document || isInitialLoad) return;
        if (content === originalDocumentRef.current?.content) return;

        // Never overwrite real content with empty/blank — transient Yjs state
        const isEffectivelyEmpty = !content || content === '<p></p>';
        if (isEffectivelyEmpty && originalDocumentRef.current?.content) return;

        const timer = setTimeout(() => {
            console.log('Saving content (length):', content.length);
            contentMutation.mutate(content);
        }, 300);

        return () => clearTimeout(timer);
    }, [content, document, isInitialLoad]);

    // Save on unmount or exact back navigation
    useEffect(() => {
        return () => {
            // This runs when component unmounts
            if (!originalDocumentRef.current || !id) return;

            const currentTitle = titleRef.current;
            const currentContent = contentRef.current;
            const originalTitle = originalDocumentRef.current.title;
            const originalContent = originalDocumentRef.current.content;

            // Never overwrite real content with empty — happens when user
            // navigates away before Yjs/onContentChange has populated contentRef.
            const isEffectivelyEmpty = !currentContent || currentContent === '<p></p>';
            if (isEffectivelyEmpty && originalContent) return;

            const hasTitleChanged = currentTitle !== originalTitle;
            const hasContentChanged = currentContent !== originalContent;

            if (hasTitleChanged || hasContentChanged) {
                console.log('Unmounting, saving pending changes synchronous-like...');
                // Note: React Query's mutate is asynchronous, but we can do a fire-and-forget raw API call 
                // to be safer during unmount, or just rely on the browser not killing the request immediately
                updateDocument(id, {
                    title: currentTitle,
                    content: currentContent
                }).catch(err => console.error('Failed to save on unmount', err));
            }
        };
    }, [id]);

    const handleGoBack = () => {
        // We rely on the unmount effect to save data, 
        // but we can also manually navigate
        navigate('/dashboard');
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
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
                        onClick={handleGoBack}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    {isReadOnly ? (
                        <span className="text-2xl font-bold px-0 truncate">{title}</span>
                    ) : (
                        <Input
                            value={title}
                            onChange={handleTitleChange}
                            className="bg-transparent border-none text-2xl font-bold focus-visible:ring-0 px-0 h-auto"
                            placeholder="Untitled Document"
                        />
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-muted-foreground text-sm flex items-center gap-2">
                        {isReadOnly ? (
                            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                View Only
                            </span>
                        ) : (titleMutation.isPending || contentMutation.isPending) ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Saving...
                            </span>
                        ) : synced ? (
                            <span className="text-green-600 dark:text-green-400">✓ Synced</span>
                        ) : (
                            <span>Syncing...</span>
                        )}
                    </div>
                    {!isReadOnly && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowInviteModal(true)}
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Invite
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => setShowLinkModal(true)}
                            >
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                            </Button>
                        </>
                    )}
                    <ThemeToggle />
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
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full animate-pulse"></span>
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
                        editable={!isReadOnly}
                        onContentChange={(newContent) => {
                            if (!isReadOnly) setContent(newContent);
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        Connecting to collaboration server...
                    </div>
                )}
            </motion.div>

            <CollaboratorModal
                documentId={id!}
                open={showInviteModal}
                onOpenChange={setShowInviteModal}
            />
            <ShareLinkModal
                documentId={id!}
                open={showLinkModal}
                onOpenChange={setShowLinkModal}
            />
        </div>
    );
};

export default EditorPage;
