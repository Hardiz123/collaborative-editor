import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { accessSharedLink } from '@/services/documents';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SharedAccessPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAccess = async () => {
            if (!id) return;
            try {
                const data = await accessSharedLink(id);
                localStorage.setItem('token', data.access_token);
                navigate(`/editor/${data.document_id}`);
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
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md glass-panel">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                            <AlertCircle className="h-6 w-6 text-destructive" />
                        </div>
                        <CardTitle className="text-xl font-semibold">Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-muted-foreground">{error}</p>
                        <Button onClick={() => navigate('/')} variant="outline">
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Accessing shared document...</p>
        </div>
    );
};

export default SharedAccessPage;
