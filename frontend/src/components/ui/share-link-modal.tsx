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
        setTimeout(() => setCopied(false), 500);
    };

    const handleClose = () => {
        setGeneratedLink('');
        setError('');
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Share Document</DialogTitle>
                    <DialogDescription>
                        Generate a link to share this document with others.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {!generatedLink ? (
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant={permission === 'read' ? 'default' : 'outline'}
                                    onClick={() => setPermission('read')}
                                    className="flex-1"
                                >
                                    Read Only
                                </Button>
                                <Button
                                    type="button"
                                    variant={permission === 'edit' ? 'default' : 'outline'}
                                    onClick={() => setPermission('edit')}
                                    className="flex-1"
                                >
                                    Can Edit
                                </Button>
                            </div>

                            {error && <p className="text-destructive text-sm">{error}</p>}

                            <Button
                                onClick={handleCreateLink}
                                disabled={mutation.isPending}
                                className="w-full"
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
                                    className="select-all"
                                />
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={handleCopy}
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground text-center">
                                Anyone with this link can {permission === 'edit' ? 'edit' : 'view'} this document.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
