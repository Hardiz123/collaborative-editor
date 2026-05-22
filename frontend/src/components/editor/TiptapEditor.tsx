import { useEditor, EditorContent, Editor } from '@tiptap/react';
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
import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface TiptapEditorProps {
    ydoc: Y.Doc;
    provider: WebsocketProvider | null;
    currentUser: { name: string; color: string };
    editable?: boolean;
    onContentChange?: (content: string) => void;
    initialContent?: string;
    onEditorReady?: (editor: Editor | null) => void;
}

const TiptapEditor = ({ ydoc, provider, currentUser, editable = true, onContentChange, initialContent, onEditorReady }: TiptapEditorProps) => {
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
            Image.configure({
                allowBase64: true,
            }),
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
                class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[500px] p-4',
            },
        },
    }, [provider, ydoc, currentUser]);

    // Keep awareness user data in sync for cursor rendering
    useEffect(() => {
        if (provider && currentUser) {
            provider.awareness.setLocalStateField('user', {
                name: currentUser.name,
                color: currentUser.color,
            });
        }
    }, [provider, currentUser]);

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

    // Expose the editor instance to the parent component
    useEffect(() => {
        if (editor && onEditorReady) {
            onEditorReady(editor);
        }
        return () => {
            if (onEditorReady) {
                onEditorReady(null);
            }
        };
    }, [editor, onEditorReady]);

    // Track what content we last loaded from DB so we know if user has made edits
    const initializedContentRef = useRef<string | null>(null);

    // Initialize / re-initialize content from database
    useEffect(() => {
        if (!editor || !initialContent || !provider) return;
        if (initialContent.trim() === '') return;

        const applyContent = () => {
            const currentEditorHTML = editor.getHTML();
            const isEditorEmpty = !currentEditorHTML || currentEditorHTML === '<p></p>';
            const isShowingStaleInit = currentEditorHTML === initializedContentRef.current;

            // Apply DB content if:
            // 1. Editor is empty (e.g. Yjs server just started), OR
            // 2. Editor still shows the old initialContent (React Query returned fresher data)
            if (isEditorEmpty || isShowingStaleInit) {
                console.log('Setting editor content from DB:', initialContent.substring(0, 60));
                editor.commands.setContent(initialContent);
                initializedContentRef.current = initialContent;
            }
        };

        // Always register the sync listener FIRST, so we don't miss it
        const handleSync = (isSynced: boolean) => {
            if (isSynced) setTimeout(applyContent, 100);
        };
        provider.on('sync', handleSync);

        // ALSO call immediately if provider is already synced (race condition safety)
        if (provider.synced) {
            applyContent();
        }

        return () => {
            provider.off('sync', handleSync);
        };
    }, [editor, provider, initialContent]);

    // Set --caret-color CSS variable on collaboration caret elements for each user
    useEffect(() => {
        if (!editor || !provider) return;

        const updateCaretColors = () => {
            // Check if editor view is available
            if (!editor.view) return;

            // Get all awareness states (all connected users)
            const awarenessStates = provider.awareness.getStates();

            // Find all label elements (we'll find carets through labels)
            const allLabels = document.querySelectorAll('.collaboration-carets__label, .collaboration-caret__label, .collaboration-cursor__label');

            // For each user, find their caret and set the color
            awarenessStates.forEach((state) => {
                const user = state.user;
                if (!user || !user.color) return;

                // Match carets to users by checking the label text content
                allLabels.forEach((labelEl) => {
                    const label = labelEl as HTMLElement;
                    if (label.textContent === user.name) {
                        // Find the associated caret element
                        const caret = label.parentElement?.querySelector('.collaboration-carets, .collaboration-carets__caret, .collaboration-caret, .collaboration-cursor__caret') as HTMLElement;

                        if (caret) {
                            caret.style.setProperty('--caret-color', user.color);
                        }

                        // Set color on label
                        label.style.setProperty('--caret-color', user.color);
                        label.style.backgroundColor = user.color;
                    }
                });
            });
        };

        // Update colors when awareness changes
        const handleAwarenessChange = () => {
            setTimeout(updateCaretColors, 100);
        };

        provider.awareness.on('change', handleAwarenessChange);

        // Initial update
        const timer = setTimeout(updateCaretColors, 500);

        // Also update when provider syncs
        provider.on('sync', (isSynced: boolean) => {
            if (isSynced) {
                setTimeout(updateCaretColors, 200);
            }
        });

        // Use MutationObserver to watch for new caret elements
        // Only set up observer if editor view is available
        let observer: MutationObserver | null = null;
        let viewCheckInterval: NodeJS.Timeout | null = null;

        const setupObserver = () => {
            // Check if editor view is available before accessing dom
            if (editor.view && 'dom' in editor.view && editor.view.dom) {
                observer = new MutationObserver(() => {
                    updateCaretColors();
                });
                observer.observe(editor.view.dom, {
                    childList: true,
                    subtree: true,
                });
                return true;
            }
            return false;
        };

        // Try to set up observer immediately
        if (!setupObserver()) {
            // Wait for view to be available
            viewCheckInterval = setInterval(() => {
                if (setupObserver()) {
                    if (viewCheckInterval) {
                        clearInterval(viewCheckInterval);
                        viewCheckInterval = null;
                    }
                }
            }, 100);

            // Cleanup interval after 5 seconds if view never becomes available
            setTimeout(() => {
                if (viewCheckInterval) {
                    clearInterval(viewCheckInterval);
                    viewCheckInterval = null;
                }
            }, 5000);
        }

        return () => {
            clearTimeout(timer);
            provider.awareness.off('change', handleAwarenessChange);
            if (observer) {
                observer.disconnect();
            }
            if (viewCheckInterval) {
                clearInterval(viewCheckInterval);
            }
        };
    }, [editor, provider]);

    // Listen to content changes and notify parent
    useEffect(() => {
        if (!editor || !onContentChange) return;

        const handleUpdate = () => {
            const html = editor.getHTML();
            // Don't report empty paragraph — this fires on first Yjs sync before
            // DB content is loaded and would trigger an empty PUT request.
            if (!html || html === '<p></p>') return;
            onContentChange(html);
        };

        // Listen to editor updates (debounced to avoid too many calls)
        editor.on('update', handleUpdate);
        // Also listen to Yjs sync events to catch remote changes
        if (provider) {
            provider.on('sync', (isSynced: boolean) => {
                if (isSynced) {
                    // Small delay to ensure content is synced
                    setTimeout(handleUpdate, 100);
                }
            });
        }

        return () => {
            editor.off('update', handleUpdate);
        };
    }, [editor, provider, onContentChange]);

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
        <div className="w-full flex flex-col rounded-xl overflow-hidden border border-border bg-card shadow-lg">
            {editable && <EditorToolbar editor={editor} />}
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

export default TiptapEditor;
