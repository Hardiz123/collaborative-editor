import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import { createSharedLink } from '@/services/documents';
import { Loader2, Copy, Check } from 'lucide-react';

interface ShareLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    documentId: string;
}

export function ShareLinkModal({ open, onOpenChange, documentId }: ShareLinkModalProps) {
    const [permission, setPermission] = useState<'read' | 'edit'>('edit');
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: () => createSharedLink(documentId, permission),
        onSuccess: (data) => {
            // Construct full URL
            const baseUrl = window.location.origin;
            const fullUrl = `${baseUrl}/shared/${data.id}`;
            setGeneratedLink(fullUrl);
            setError('');
        },
        onError: (err: any) => {
            setError(err.response?.data?.error || 'Failed to generate link');
        },
    });

    const handleCreateLink = () => {
        mutation.mutate();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        setGeneratedLink('');
        setError('');
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white border-zinc-800">
                <DialogHeader>
                    <DialogTitle>Share Document</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Generate a link to share this document with others.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {!generatedLink ? (
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant={permission === 'read' ? 'secondary' : 'outline'}
                                    onClick={() => setPermission('read')}
                                    className={`flex-1 ${permission === 'read' ? 'bg-zinc-700' : 'bg-transparent border-zinc-700 text-zinc-400'}`}
                                >
                                    Read Only
                                </Button>
                                <Button
                                    type="button"
                                    variant={permission === 'edit' ? 'secondary' : 'outline'}
                                    onClick={() => setPermission('edit')}
                                    className={`flex-1 ${permission === 'edit' ? 'bg-zinc-700' : 'bg-transparent border-zinc-700 text-zinc-400'}`}
                                >
                                    Can Edit
                                </Button>
                            </div>

                            {error && <p className="text-red-400 text-sm">{error}</p>}

                            <Button
                                onClick={handleCreateLink}
                                disabled={mutation.isPending}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Generate Link
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Input
                                    readOnly
                                    value={generatedLink}
                                    className="bg-zinc-800 border-zinc-700 text-white select-all"
                                />
                                <Button
                                    size="icon"
                                    onClick={handleCopy}
                                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-white" />}
                                </Button>
                            </div>
                            <p className="text-sm text-zinc-400 text-center">
                                Anyone with this link can {permission === 'edit' ? 'edit' : 'view'} this document.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={handleClose} className="text-white hover:bg-zinc-800">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
