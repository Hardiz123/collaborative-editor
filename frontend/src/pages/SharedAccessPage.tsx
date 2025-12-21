import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { accessSharedLink } from '@/services/documents';
import { Loader2 } from 'lucide-react';

const SharedAccessPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAccess = async () => {
            if (!id) return;
            try {
                const data = await accessSharedLink(id);
                // Store the guest token
                localStorage.setItem('token', data.access_token);

                // Force a reload or update auth context state to recognize the new token
                // If AuthContext reads from localStorage on mount/update, we might need a way to trigger it.
                // For now, let's try a hard navigation or just navigate.

                // Use window.location.href to ensure a full reload and AuthContext re-initialization if needed
                // Or if we can update context, do that.

                // Navigate to the editor
                navigate(`/editor/${data.document_id}`);
                // Reload to ensure all sockets/contexts pick up the new token
                window.location.reload();
            } catch (err: any) {
                console.error("Access failed", err);
                setError(err.response?.data?.error || 'Failed to access shared document');
            }
        };
        fetchAccess();
    }, [id, navigate]);

    if (error) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-white gap-4">
                <div className="text-red-500 text-xl font-bold">Access Denied</div>
                <div className="text-zinc-400">{error}</div>
                <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition"
                >
                    Go Home
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-white gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-zinc-400">Accessing shared document...</div>
        </div>
    );
};

export default SharedAccessPage;
