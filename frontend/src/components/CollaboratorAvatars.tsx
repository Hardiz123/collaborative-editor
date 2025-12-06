import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

interface Collaborator {
    userId: string;
    username: string;
    email: string;
    isCurrentUser?: boolean;
}

interface CollaboratorAvatarsProps {
    collaborators: Collaborator[];
    currentUser?: { name: string; color: string };
    currentUserId?: string;
    maxDisplay?: number;
}

// Generate deterministic color based on user ID
function getUserColor(userId: string): string {
    const colors = [
        'bg-blue-500',
        'bg-green-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-orange-500',
        'bg-teal-500',
        'bg-indigo-500',
        'bg-rose-500',
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

// Get user initials from username
function getInitials(username: string): string {
    if (!username || username.trim().length === 0) {
        return '??';
    }
    const parts = username.trim().split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
        const first = parts[0][0] || '';
        const last = parts[parts.length - 1][0] || '';
        return (first + last).toUpperCase();
    }
    if (username.length >= 2) {
        return username.slice(0, 2).toUpperCase();
    }
    return username[0].toUpperCase() + username[0].toUpperCase();
}

export function CollaboratorAvatars({ collaborators, currentUser, currentUserId, maxDisplay = 5 }: CollaboratorAvatarsProps) {
    // Ensure current user is included in the list
    const allCollaborators = useMemo(() => {
        if (!currentUser || !currentUserId) return collaborators;
        
        // Check if current user is already in the list
        const isCurrentUserInList = collaborators.some(c => c.userId === currentUserId);
        
        if (isCurrentUserInList) {
            return collaborators;
        }
        
        // Add current user to the list
        return [
            {
                userId: currentUserId,
                username: currentUser.name,
                email: '',
                isCurrentUser: true,
            },
            ...collaborators,
        ];
    }, [collaborators, currentUser, currentUserId]);
    
    const displayedCollaborators = allCollaborators.slice(0, maxDisplay);
    const overflowCount = Math.max(0, allCollaborators.length - maxDisplay);

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-white/60 font-medium">Active:</span>
            <div className="flex -space-x-2">
                <AnimatePresence>
                    {displayedCollaborators.map((collaborator) => (
                        <motion.div
                            key={collaborator.userId}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className="relative group"
                        >
                            <Avatar className={`h-8 w-8 border-2 border-white/20 ${getUserColor(collaborator.userId)} ring-2 ring-white/10 hover:ring-white/30 transition-all cursor-pointer`}>
                                <AvatarFallback className={`${getUserColor(collaborator.userId)} text-white text-xs font-bold`}>
                                    {getInitials(collaborator.username)}
                                </AvatarFallback>
                            </Avatar>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                {collaborator.isCurrentUser ? `${collaborator.username} (You)` : collaborator.username}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {overflowCount > 0 && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative group"
                    >
                        <Avatar className="h-8 w-8 border-2 border-white/20 bg-white/10 ring-2 ring-white/10">
                            <AvatarFallback className="bg-white/10 text-white text-xs font-bold">
                                +{overflowCount}
                            </AvatarFallback>
                        </Avatar>

                        {/* Tooltip for overflow */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            {overflowCount} more collaborator{overflowCount > 1 ? 's' : ''}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
