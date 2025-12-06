import { type Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    List,
    ListOrdered,
    Quote,
    Undo,
    Redo,
    Image as ImageIcon,
    Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface EditorToolbarProps {
    editor: Editor | null;
}

const EditorToolbar = ({ editor }: EditorToolbarProps) => {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        if (!editor) return;

        const handleUpdate = () => {
            forceUpdate((prev) => prev + 1);
        };

        editor.on('transaction', handleUpdate);
        editor.on('selectionUpdate', handleUpdate);
        editor.on('update', handleUpdate);

        return () => {
            editor.off('transaction', handleUpdate);
            editor.off('selectionUpdate', handleUpdate);
            editor.off('update', handleUpdate);
        };
    }, [editor]);

    if (!editor) {
        return null;
    }

    const addImage = () => {
        const url = window.prompt('Enter the URL of the image:');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('Enter the URL:', previousUrl);

        // cancelled
        if (url === null) {
            return;
        }

        // empty
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        // update link
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <div className="border border-white/20 bg-white/10 backdrop-blur-md rounded-t-xl p-2 flex flex-wrap gap-1 items-center sticky top-0 z-10">
            <TooltipProvider>
                <div className="flex items-center gap-1 border-r border-white/20 pr-2 mr-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Toggle
                                size="sm"
                                pressed={editor.isActive('bold')}
                                onPressedChange={() => editor.chain().focus().toggleBold().run()}
                                className="data-[state=on]:bg-yellow-400 data-[state=on]:text-black hover:bg-white/10 text-white transition-colors"
                            >
                                <Bold className="h-4 w-4" />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Bold</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Toggle
                                size="sm"
                                pressed={editor.isActive('italic')}
                                onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                                className="data-[state=on]:bg-yellow-400 data-[state=on]:text-black hover:bg-white/10 text-white transition-colors"
                            >
                                <Italic className="h-4 w-4" />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Italic</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Toggle
                                size="sm"
                                pressed={editor.isActive('underline')}
                                onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
                                className="data-[state=on]:bg-yellow-400 data-[state=on]:text-black hover:bg-white/10 text-white transition-colors"
                            >
                                <Underline className="h-4 w-4" />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Underline</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Toggle
                                size="sm"
                                pressed={editor.isActive('strike')}
                                onPressedChange={() => editor.chain().focus().toggleStrike().run()}
                                className="data-[state=on]:bg-yellow-400 data-[state=on]:text-black hover:bg-white/10 text-white transition-colors"
                            >
                                <Strikethrough className="h-4 w-4" />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Strikethrough</TooltipContent>
                    </Tooltip>
                </div>

                <div className="flex items-center gap-1 border-r border-white/20 pr-2 mr-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Toggle
                                size="sm"
                                pressed={editor.isActive({ textAlign: 'left' })}
                                onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
                                className="data-[state=on]:bg-yellow-400 data-[state=on]:text-black hover:bg-white/10 text-white transition-colors"
                            >
                                <AlignLeft className="h-4 w-4" />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Align Left</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Toggle
                                size="sm"
                                pressed={editor.isActive({ textAlign: 'center' })}
                                onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
                                className="data-[state=on]:bg-yellow-400 data-[state=on]:text-black hover:bg-white/10 text-white transition-colors"
                            >
                                <AlignCenter className="h-4 w-4" />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Align Center</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Toggle
                                size="sm"
                                pressed={editor.isActive({ textAlign: 'right' })}
                                onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
                                className="data-[state=on]:bg-yellow-400 data-[state=on]:text-black hover:bg-white/10 text-white transition-colors"
                            >
                                <AlignRight className="h-4 w-4" />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Align Right</TooltipContent>
                    </Tooltip>
                </div>

                <div className="flex items-center gap-1 border-r border-white/20 pr-2 mr-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Toggle
                                size="sm"
                                pressed={editor.isActive('bulletList')}
                                onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                                className="data-[state=on]:bg-yellow-400 data-[state=on]:text-black hover:bg-white/10 text-white transition-colors"
                            >
                                <List className="h-4 w-4" />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Bullet List</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Toggle
                                size="sm"
                                pressed={editor.isActive('orderedList')}
                                onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                                className="data-[state=on]:bg-yellow-400 data-[state=on]:text-black hover:bg-white/10 text-white transition-colors"
                            >
                                <ListOrdered className="h-4 w-4" />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Ordered List</TooltipContent>
                    </Tooltip>
                </div>

                <div className="flex items-center gap-1 border-r border-white/20 pr-2 mr-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={setLink}
                                className={editor.isActive('link') ? 'bg-yellow-400 text-black' : 'hover:bg-white/10 text-white transition-colors'}
                            >
                                <LinkIcon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Link</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={addImage}
                                className="data-[state=on]:bg-yellow-400 data-[state=on]:text-black hover:bg-white/10 text-white transition-colors"
                            >
                                <ImageIcon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Image</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Toggle
                                size="sm"
                                pressed={editor.isActive('blockquote')}
                                onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
                                className="data-[state=on]:bg-yellow-400 data-[state=on]:text-black hover:bg-white/10 text-white transition-colors"
                            >
                                <Quote className="h-4 w-4" />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Blockquote</TooltipContent>
                    </Tooltip>
                </div>

                <div className="flex items-center gap-1 ml-auto">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editor.chain().focus().undo().run()}
                                disabled={!editor.can().chain().focus().undo().run()}
                                className="hover:bg-white/10 text-white disabled:opacity-50"
                            >
                                <Undo className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Undo</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editor.chain().focus().redo().run()}
                                disabled={!editor.can().chain().focus().redo().run()}
                                className="hover:bg-white/10 text-white disabled:opacity-50"
                            >
                                <Redo className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Redo</TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>
        </div>
    );
};

export default EditorToolbar;
