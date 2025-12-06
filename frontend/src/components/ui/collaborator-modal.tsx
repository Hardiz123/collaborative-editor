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

interface CollaboratorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    documentId: string;
}

export function CollaboratorModal({ open, onOpenChange, documentId }: CollaboratorModalProps) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (email: string) => addCollaborator(documentId, email),
        onSuccess: () => {
            onOpenChange(false);
            setEmail('');
            setError('');
            // Invalidate the document query to refresh collaborators list
            queryClient.invalidateQueries({ queryKey: ['document', documentId] });
            alert('Collaborator added successfully!');
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
            <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white border-zinc-800">
                <DialogHeader>
                    <DialogTitle>Add Collaborator</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Enter the email address of the user you want to share this document with.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="user@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-white hover:bg-zinc-800">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Share
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
