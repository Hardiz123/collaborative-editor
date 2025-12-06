import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Code from '@tiptap/extension-code'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Typography from '@tiptap/extension-typography'
import EditorToolbar from './EditorToolbar';
import { useEffect, useState } from 'react';

interface TiptapEditorProps {
    content: string;
    onChange: (content: string) => void;
    editable?: boolean;
}

const TiptapEditor = ({ content, onChange, editable = true }: TiptapEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
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
            Document, Paragraph, Text, Code, Typography
        ],
        content,
        editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[500px] p-4 text-white',
            },
        },
    });

    const [, forceUpdate] = useState(0);

    useEffect(() => {
        if (!editor) return;

        const handleUpdate = () => {
            forceUpdate((prev) => prev + 1);
        };

        editor.on('selectionUpdate', handleUpdate);
        editor.on('update', handleUpdate);
        editor.on('transaction', handleUpdate);

        return () => {
            editor.off('selectionUpdate', handleUpdate);
            editor.off('update', handleUpdate);
            editor.off('transaction', handleUpdate);
        };
    }, [editor]);

    // Update content if it changes externally (e.g. loading from DB)
    // But be careful not to overwrite user input while typing
    useEffect(() => {
        if (editor && content && editor.getHTML() !== content) {
            // Only update if the content is significantly different to avoid cursor jumping
            // Ideally we'd compare JSON content, but HTML check is okay for initial load
            if (editor.getText() === '' && content !== '<p></p>') {
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

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
