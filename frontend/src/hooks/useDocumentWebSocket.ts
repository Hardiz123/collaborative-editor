import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Collaborator {
  userId: string;
  username: string;
  email: string;
  isCurrentUser?: boolean;
}

interface WebSocketMessage {
  type: 'JOIN' | 'LEAVE' | 'PRESENCE';
  document_id: string;
  user: {
    user_id: string;
    username: string;
    email: string;
  };
  timestamp: string;
}

interface UseDocumentWebSocketProps {
  documentId: string;
  enabled: boolean;
}

export function useDocumentWebSocket({ documentId, enabled }: UseDocumentWebSocketProps) {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    console.log('useDocumentWebSocket effect:', { enabled, documentId });
    
    if (!enabled || !documentId) {
      console.log('WebSocket connection skipped:', { enabled, documentId });
      return;
    }

    const connect = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      console.log('Attempting WebSocket connection to:', `ws://localhost:8080/ws/documents/${documentId}`);

      // Create WebSocket connection
      const ws = new WebSocket(`ws://localhost:8080/ws/documents/${documentId}?token=${token}`);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (enabled && reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message:', message);

          if (message.type === 'JOIN') {
            // Add user to collaborators if not already present
            setCollaborators((prev) => {
              const exists = prev.some((c) => c.userId === message.user.user_id);
              if (exists) return prev;

              return [
                ...prev,
                {
                  userId: message.user.user_id,
                  username: message.user.username,
                  email: message.user.email,
                  isCurrentUser: false, // Will be set correctly in allCollaborators
                },
              ];
            });
          } else if (message.type === 'LEAVE') {
            // Remove user from collaborators
            setCollaborators((prev) =>
              prev.filter((c) => c.userId !== message.user.user_id)
            );
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current = ws;
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [documentId, enabled]); // Removed user from dependencies

  // Add current user to collaborators list
  const allCollaborators = useMemo(() => {
    if (!user) return collaborators;

    // Check if current user is already in the list
    const currentUserCollaborator = collaborators.find((c) => c.userId === user.userID);
    
    if (currentUserCollaborator) {
      // Mark current user
      return collaborators.map((c) => ({
        ...c,
        isCurrentUser: c.userId === user.userID,
      }));
    }

    // Add current user at the beginning if not in list
    return [
      {
        userId: user.userID,
        username: user.username,
        email: user.email,
        isCurrentUser: true,
      },
      ...collaborators,
    ];
  }, [collaborators, user]);

  return { collaborators: allCollaborators, isConnected };
}
