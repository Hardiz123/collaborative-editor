import { type Editor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
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

    const imageInputRef = useRef<HTMLInputElement>(null);

    const addImage = () => {
        // Trigger the hidden file input
        imageInputRef.current?.click();
    };

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const src = event.target?.result as string;
            if (src) {
                editor.chain().focus().setImage({ src }).run();
            }
        };
        reader.readAsDataURL(file);

        // Reset input so same file can be selected again
        e.target.value = '';
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
        <div className="border-b border-border bg-muted/50 p-2 flex flex-wrap gap-1 items-center sticky top-0 z-10">
            <TooltipProvider>
                <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Toggle
                                size="sm"
                                pressed={editor.isActive('bold')}
                                onPressedChange={() => editor.chain().focus().toggleBold().run()}
                                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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
                                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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
                                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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
                                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                                <Strikethrough className="h-4 w-4" />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Strikethrough</TooltipContent>
                    </Tooltip>
                </div>

                <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Toggle
                                size="sm"
                                pressed={editor.isActive({ textAlign: 'left' })}
                                onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
                                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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
                                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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
                                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                                <AlignRight className="h-4 w-4" />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Align Right</TooltipContent>
                    </Tooltip>
                </div>

                <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Toggle
                                size="sm"
                                pressed={editor.isActive('bulletList')}
                                onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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
                                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                                <ListOrdered className="h-4 w-4" />
                            </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Ordered List</TooltipContent>
                    </Tooltip>
                </div>

                <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={setLink}
                                className={editor.isActive('link') ? 'bg-primary text-primary-foreground' : ''}
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
                                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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
                            >
                                <Redo className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Redo</TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>

            {/* Hidden file input for image upload */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageFileChange}
            />
        </div>
    );
};

export default EditorToolbar;
