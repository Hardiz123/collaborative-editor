import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TiptapEditor from '@/components/editor/TiptapEditor';
import { motion } from 'framer-motion';

interface DocumentData {
    id: string;
    title: string;
    content: string;
    updatedAt: string;
}

const EditorPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [title, setTitle] = useState('Untitled Document');
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const isFirstRender = useRef(true);

    // Load document
    useEffect(() => {
        if (!id) return;

        const savedDocs = JSON.parse(localStorage.getItem('collaborative_docs') || '{}');
        const doc = savedDocs[id];

        if (doc) {
            setTitle(doc.title);
            setContent(doc.content);
        } else {
            // New document, initialize
            const newDoc: DocumentData = {
                id,
                title: 'Untitled Document',
                content: '<p>Start writing...</p>',
                updatedAt: new Date().toISOString(),
            };
            savedDocs[id] = newDoc;
            localStorage.setItem('collaborative_docs', JSON.stringify(savedDocs));
            setContent(newDoc.content);
        }
    }, [id]);

    // Save document
    const saveDocument = useCallback((newContent: string, newTitle: string) => {
        if (!id) return;
        setIsSaving(true);

        const savedDocs = JSON.parse(localStorage.getItem('collaborative_docs') || '{}');
        savedDocs[id] = {
            id,
            title: newTitle,
            content: newContent,
            updatedAt: new Date().toISOString(),
        };

        localStorage.setItem('collaborative_docs', JSON.stringify(savedDocs));

        // Fake network delay for UX
        setTimeout(() => setIsSaving(false), 500);
    }, [id]);

    // Debounced save effect
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            saveDocument(content, title);
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [content, title, saveDocument]);

    // Handle content change
    const handleContentChange = (newContent: string) => {
        setContent(newContent);
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
    };

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
                <div className="flex items-center gap-2 text-white/60 text-sm">
                    {isSaving ? (
                        <span className="flex items-center gap-2 animate-pulse">
                            <Save className="h-4 w-4" /> Saving...
                        </span>
                    ) : (
                        <span>Saved locally</span>
                    )}
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="w-full max-w-5xl flex-1"
            >
                <TiptapEditor content={content} onChange={handleContentChange} />
            </motion.div>
        </div>
    );
};

export default EditorPage;
