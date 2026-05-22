import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, File, FileText, FileCode, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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

    // Export 3: PDF
    const handleExportPDF = async () => {
        setExportingType('pdf');
        try {
            // Attach html2canvas to window context so jsPDF can resolve it
            (window as any).html2canvas = html2canvas;

            // Find the ProseMirror content container
            const container = document.querySelector('.ProseMirror');
            if (!container) {
                console.error('ProseMirror editor container not found');
                return;
            }

            // Clone the container to isolate it off-screen and style for printing
            const clone = container.cloneNode(true) as HTMLElement;
            clone.classList.remove('dark', 'dark:prose-invert', 'ProseMirror-focused');
            
            // Apply standard print layout overrides
            clone.style.width = '720px';
            clone.style.padding = '40px';
            clone.style.backgroundColor = '#ffffff';
            clone.style.color = '#1f2937';
            clone.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            clone.style.lineHeight = '1.6';
            
            // Append explicit styling to clone tags to prevent css inherit issues
            const paragraphs = clone.querySelectorAll('p');
            paragraphs.forEach(node => {
                const p = node as HTMLElement;
                p.style.marginBottom = '1.25rem';
                p.style.fontSize = '14px';
                p.style.color = '#374151';
            });

            const headings = clone.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headings.forEach(node => {
                const h = node as HTMLElement;
                const tag = h.tagName.toLowerCase();
                h.style.color = '#111827';
                h.style.fontWeight = '700';
                h.style.marginTop = '1.75rem';
                h.style.marginBottom = '0.75rem';
                if (tag === 'h1') h.style.fontSize = '26px';
                else if (tag === 'h2') h.style.fontSize = '20px';
                else h.style.fontSize = '16px';
            });

            const codeBlocks = clone.querySelectorAll('pre');
            codeBlocks.forEach(node => {
                const pre = node as HTMLElement;
                pre.style.backgroundColor = '#f3f4f6';
                pre.style.padding = '12px';
                pre.style.borderRadius = '6px';
                pre.style.fontFamily = 'monospace';
                pre.style.fontSize = '13px';
                pre.style.overflowX = 'auto';
                pre.style.margin = '1rem 0';
                pre.style.border = '1px solid #e5e7eb';
            });

            const inlineCodes = clone.querySelectorAll('code');
            inlineCodes.forEach(node => {
                const code = node as HTMLElement;
                // Ignore code tags nested inside pre blocks (they inherit pre styles)
                if (code.parentElement?.tagName.toLowerCase() !== 'pre') {
                    code.style.backgroundColor = '#f3f4f6';
                    code.style.padding = '2px 4px';
                    code.style.borderRadius = '4px';
                    code.style.fontFamily = 'monospace';
                    code.style.fontSize = '13px';
                }
            });

            const blockquotes = clone.querySelectorAll('blockquote');
            blockquotes.forEach(node => {
                const bq = node as HTMLElement;
                bq.style.borderLeft = '4px solid #d1d5db';
                bq.style.paddingLeft = '16px';
                bq.style.color = '#4b5563';
                bq.style.fontStyle = 'italic';
                bq.style.margin = '1.5rem 0';
            });

            const lists = clone.querySelectorAll('ul, ol');
            lists.forEach(node => {
                const list = node as HTMLElement;
                list.style.paddingLeft = '24px';
                list.style.marginBottom = '1.25rem';
            });

            // Clean up collaboration cursor elements so they don't block text
            const carets = clone.querySelectorAll(
                '.collaboration-cursor__caret, .collaboration-cursor__label, .collaboration-carets__caret, .collaboration-carets__label, .collaboration-caret, .collaboration-caret__label'
            );
            carets.forEach(el => el.remove());

            // Prepend the document title
            const titleHeader = document.createElement('h1');
            titleHeader.textContent = documentTitle || 'Untitled Document';
            titleHeader.style.fontSize = '28px';
            titleHeader.style.fontWeight = '800';
            titleHeader.style.color = '#111827';
            titleHeader.style.borderBottom = '2px solid #e5e7eb';
            titleHeader.style.paddingBottom = '10px';
            titleHeader.style.marginBottom = '25px';
            titleHeader.style.marginTop = '0px';
            clone.insertBefore(titleHeader, clone.firstChild);

            // Temporarily append the clone to the document body (off-screen)
            clone.style.position = 'fixed';
            clone.style.top = '-9999px';
            clone.style.left = '-9999px';
            document.body.appendChild(clone);

            // Initialize jsPDF (A4 size: 595 x 842 pt)
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            // Render DOM to PDF
            await pdf.html(clone, {
                html2canvas: {
                    scale: 1.5, // Balance resolution and bundle size
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                },
                callback: function (doc) {
                    doc.save(getFilename('pdf'));
                    document.body.removeChild(clone);
                },
                margin: [40, 40, 40, 40], // Margins: Top, Left, Bottom, Right
                autoPaging: 'text',
                x: 0,
                y: 0,
                width: 515, // A4 width (595) minus left/right margin (40*2) = 515
                windowWidth: 720
            });
        } catch (error) {
            console.error('Failed to export PDF:', error);
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
                            onClick={handleExportPDF}
                            disabled={exportingType !== null}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-card-foreground hover:bg-muted/80 rounded-lg transition-colors cursor-pointer text-left"
                        >
                            <File className="h-4 w-4 text-red-500" />
                            <span>Export as PDF</span>
                        </button>
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
