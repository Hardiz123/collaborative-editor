import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText, FileCode, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import TurndownService from 'turndown';

interface ExportDropdownProps {
    editor: any | null;
    documentTitle: string;
}

export const ExportDropdown = ({ editor, documentTitle }: ExportDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [exportingType, setExportingType] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (!editor) return null;

    const getFilename = (extension: string) => {
        const safeTitle = documentTitle
            .trim()
            .replace(/[^a-z0-9]/gi, '_')
            .replace(/_+/g, '_')
            .toLowerCase();
        return `${safeTitle || 'untitled'}.${extension}`;
    };

    // Export 1: HTML
    const handleExportHTML = async () => {
        setExportingType('html');
        try {
            const htmlContent = editor.getHTML();
            const title = documentTitle || 'Untitled Document';
            
            const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            max-width: 800px;
            margin: 40px auto;
            padding: 0 20px;
            background-color: #ffffff;
        }
        h1 {
            font-size: 2.25rem;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 0.5rem;
            margin-bottom: 2rem;
            color: #111827;
        }
        h2 {
            font-size: 1.5rem;
            margin-top: 2rem;
            margin-bottom: 1rem;
            color: #1f2937;
        }
        h3 {
            font-size: 1.25rem;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
            color: #374151;
        }
        p {
            margin-bottom: 1.25rem;
        }
        ul, ol {
            margin-bottom: 1.25rem;
            padding-left: 1.50rem;
        }
        li {
            margin-bottom: 0.25rem;
        }
        blockquote {
            border-left: 4px solid #d1d5db;
            padding-left: 1rem;
            color: #4b5563;
            font-style: italic;
            margin: 1.5rem 0;
        }
        pre {
            background-color: #f3f4f6;
            padding: 1rem;
            border-radius: 0.375rem;
            overflow-x: auto;
            margin: 1.5rem 0;
        }
        code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.875em;
            background-color: #f3f4f6;
            padding: 0.2rem 0.4rem;
            border-radius: 0.25rem;
        }
        pre code {
            padding: 0;
            background-color: transparent;
            border-radius: 0;
        }
        a {
            color: #2563eb;
            text-decoration: underline;
        }
        img {
            max-width: 100%;
            height: auto;
            border-radius: 0.375rem;
            margin: 1.5rem 0;
        }
        hr {
            border: 0;
            border-top: 1px solid #e5e7eb;
            margin: 2rem 0;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1.5rem 0;
        }
        th, td {
            border: 1px solid #e5e7eb;
            padding: 0.75rem;
            text-align: left;
        }
        th {
            background-color: #f9fafb;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <div class="content">
        ${htmlContent}
    </div>
</body>
</html>`;

            const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = getFilename('html');
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export HTML:', error);
        } finally {
            setExportingType(null);
            setIsOpen(false);
        }
    };

    // Export 2: Markdown
    const handleExportMarkdown = async () => {
        setExportingType('markdown');
        try {
            const htmlContent = editor.getHTML();
            
            const turndownService = new TurndownService({
                headingStyle: 'atx',
                codeBlockStyle: 'fenced',
                bulletListMarker: '-',
                hr: '---'
            });

            // Keep custom rules for Tiptap specifics if needed (like highlights or alignments)
            turndownService.addRule('highlight', {
                filter: 'mark',
                replacement: (content) => `==${content}==`
            });

            turndownService.addRule('underline', {
                filter: 'u',
                replacement: (content) => `<u>${content}</u>`
            });

            const markdown = `# ${documentTitle || 'Untitled Document'}\n\n${turndownService.turndown(htmlContent)}`;
            
            const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = getFilename('md');
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export Markdown:', error);
        } finally {
            setExportingType(null);
            setIsOpen(false);
        }
    };


    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 bg-card hover:bg-muted text-card-foreground border-border"
                disabled={exportingType !== null}
            >
                {exportingType !== null ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1 text-primary" />
                ) : (
                    <Download className="h-4 w-4 mr-1" />
                )}
                {exportingType ? 'Exporting...' : 'Export'}
                <ChevronDown className={`h-3 w-3 opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card/85 backdrop-blur-md p-1.5 shadow-xl z-50 origin-top-right"
                    >

                        <button
                            onClick={handleExportMarkdown}
                            disabled={exportingType !== null}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-card-foreground hover:bg-muted/80 rounded-lg transition-colors cursor-pointer text-left"
                        >
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span>Export as Markdown</span>
                        </button>
                        <button
                            onClick={handleExportHTML}
                            disabled={exportingType !== null}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-card-foreground hover:bg-muted/80 rounded-lg transition-colors cursor-pointer text-left"
                        >
                            <FileCode className="h-4 w-4 text-green-500" />
                            <span>Export as HTML</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
