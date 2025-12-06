import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import EditorToolbar from './EditorToolbar';
import { useEffect } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface TiptapEditorProps {
    ydoc: Y.Doc;
    provider: WebsocketProvider | null;
    currentUser: { name: string; color: string };
    editable?: boolean;
}

const TiptapEditor = ({ ydoc, provider, currentUser, editable = true }: TiptapEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // Disable history extension as Yjs handles undo/redo
                history: false,
            }),
            Image,
            Link.configure({
                openOnClick: false,
            }),
            Placeholder.configure({
                placeholder: 'Start writing your amazing story...',
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Underline,
            // Yjs Collaboration
            Collaboration.configure({
                document: ydoc,
            }),
            // Collaborative cursors - only add if provider exists
            ...(provider ? [CollaborationCursor.configure({
                provider: provider,
                user: currentUser,
            })] : []),
        ],
        editable,
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[500px] p-4 text-white',
            },
        },
    }, [provider]); // Re-create editor when provider changes

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (editor) {
                editor.destroy();
            }
        };
    }, [editor]);

    return (
        <div className="w-full flex flex-col rounded-xl overflow-hidden border border-white/20 bg-white/5 backdrop-blur-sm shadow-xl">
            <EditorToolbar editor={editor} />
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

export default TiptapEditor;
