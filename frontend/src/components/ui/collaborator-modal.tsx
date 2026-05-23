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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addCollaborator } from '@/services/documents';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface CollaboratorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    documentId: string;
}

export function CollaboratorModal({ open, onOpenChange, documentId }: CollaboratorModalProps) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const queryClient = useQueryClient();
    const toast = useToast();

    const mutation = useMutation({
        mutationFn: (email: string) => addCollaborator(documentId, email),
        onSuccess: () => {
            onOpenChange(false);
            setEmail('');
            setError('');
            queryClient.invalidateQueries({ queryKey: ['document', documentId] });
            toast.success('Collaborator added successfully!');
        },
        onError: (err: any) => {
            setError(err.response?.data?.error || 'Failed to add collaborator');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        mutation.mutate(email);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Collaborator</DialogTitle>
                    <DialogDescription>
                        Enter the email address of the user you want to share this document with.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="user@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        {error && <p className="text-destructive text-sm">{error}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Share
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
