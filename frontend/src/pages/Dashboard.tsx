import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Dashboard = () => {
    const { user, logout } = useAuth();

    return (
        <div className="page-container flex-col gap-8">
            <Card className="w-full max-w-4xl glass-panel border-0 bg-black/40 text-white">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-3xl font-bold">Dashboard</CardTitle>
                    <Button variant="destructive" onClick={logout}>
                        Logout
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <h2 className="text-xl">Welcome, <span className="text-primary font-bold">{user?.name}</span>!</h2>
                        <p className="text-gray-400">
                            You have successfully authenticated using JWT and TanStack Query.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                    <h3 className="font-bold mb-2">Feature {i}</h3>
                                    <p className="text-sm text-gray-400">Placeholder content for your amazing app.</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Dashboard;
