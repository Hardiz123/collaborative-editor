import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TiptapEditor from '@/components/editor/TiptapEditor';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getDocument, updateDocument } from '@/services/documents';
import { CollaboratorModal } from '@/components/ui/collaborator-modal';
import { CollaboratorAvatars } from '@/components/CollaboratorAvatars';
import { useAuth } from '@/context/AuthContext';

const EditorPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [showShareModal, setShowShareModal] = useState(false);

    // Mock collaborators - will be replaced with real-time data from WebSocket
    const [mockCollaborators] = useState([
        {
            userId: user?.userID || 'current-user',
            username: user?.username || 'You',
            email: user?.email || '',
            isCurrentUser: true,
        },
        // Add some mock collaborators for testing
        {
            userId: 'user-2',
            username: 'Alice Johnson',
            email: 'alice@example.com',
            isCurrentUser: false,
        },
        {
            userId: 'user-3',
            username: 'Bob Smith',
            email: 'bob@example.com',
            isCurrentUser: false,
        },
    ]);

    // Fetch document
    const { data: document, isLoading } = useQuery({
        queryKey: ['document', id],
        queryFn: () => getDocument(id!),
        enabled: !!id,
    });

    // Update effect
    useEffect(() => {
        if (document) {
            setTitle(document.title);
            setContent(document.content);
        }
    }, [document]);

    // Save mutation
    const mutation = useMutation({
        mutationFn: (data: { title: string; content: string }) => updateDocument(id!, data),
    });

    const debouncedSave = useCallback(
        (newTitle: string, newContent: string) => {
            if (!id) return;
            mutation.mutate({ title: newTitle, content: newContent });
        },
        [id, mutation]
    );

    // Debounced effect for auto-saving
    useEffect(() => {
        if (!document) return;

        // Skip first render or if no changes
        if (title === document.title && content === document.content) return;

        const timer = setTimeout(() => {
            debouncedSave(title, content);
        }, 1000);

        return () => clearTimeout(timer);
    }, [title, content, debouncedSave, document]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    const handleContentChange = (newContent: string) => {
        setContent(newContent);
    };

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
                    <div className="text-white/60 text-sm">
                        {mutation.isPending ? (
                            <span className="flex items-center gap-2 animate-pulse">
                                <Save className="h-4 w-4" /> Saving...
                            </span>
                        ) : (
                            <span>Saved</span>
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
                className="w-full max-w-5xl"
            >
                <CollaboratorAvatars collaborators={mockCollaborators} maxDisplay={5} />
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-full max-w-5xl flex-1 min-h-0"
            >
                <TiptapEditor content={content} onChange={handleContentChange} />
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
