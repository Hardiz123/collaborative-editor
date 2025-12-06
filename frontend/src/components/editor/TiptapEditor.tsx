import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import Highlight from '@tiptap/extension-highlight';
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
        enableContentCheck: true,
        onCreate: ({ editor: currentEditor }) => {
            // Set initial user when editor is created and view is ready
            if (currentUser && provider) {
                // Use requestAnimationFrame to ensure view is mounted
                requestAnimationFrame(() => {
                    if (currentEditor.view) {
                        currentEditor.commands.updateUser(currentUser);
                    }
                });
            }
            
            // Handle provider sync event
            if (provider) {
                provider.on('sync', (isSynced: boolean) => {
                    // Update user after sync - wait for view to be ready
                    if (isSynced && currentUser) {
                        requestAnimationFrame(() => {
                            if (currentEditor.view) {
                                currentEditor.commands.updateUser(currentUser);
                            }
                        });
                    }
                });
            }
        },
        extensions: [
            StarterKit.configure({
                // Disable undo/redo as Yjs handles it
                undoRedo: false,
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
            Highlight,
            // Yjs Collaboration
            Collaboration.extend().configure({
                document: ydoc,
            }),
            ...(provider
                ? [CollaborationCaret.configure({
                    provider,
                    user: currentUser,
                })]
                : []),
        ],
        editable,
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[500px] p-4 text-white',
            },
        },
    }, [provider, ydoc, currentUser]);

    // Update user when it changes - ensure editor view is mounted
    useEffect(() => {
        if (editor && currentUser && provider) {
            // Use requestAnimationFrame to ensure view is ready
            requestAnimationFrame(() => {
                if (editor.view) {
                    console.log('Updating user:', currentUser);
                    // Call updateUser command directly (no need for focus)
                    editor.commands.updateUser(currentUser);
                }
            });
        }
    }, [editor, currentUser, provider]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (editor) {
                editor.destroy();
            }
        };
    }, [editor]);

    if (!editor) {
        return null;
    }

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
