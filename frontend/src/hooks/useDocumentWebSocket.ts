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
  const isMountedRef = useRef(true); // Track if component is mounted

  useEffect(() => {
    console.log('useDocumentWebSocket effect:', { enabled, documentId });
    
    // Reset mounted flag
    isMountedRef.current = true;
    
    if (!enabled || !documentId) {
      console.log('WebSocket connection skipped:', { enabled, documentId });
      return;
    }

    const connect = () => {
      // Don't connect if component is unmounted
      if (!isMountedRef.current) {
        console.log('Component unmounted, skipping connection');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const wsUrl = apiUrl.replace(/^http/, 'ws') + `/ws/documents/${documentId}?token=${token}`;
      console.log('Attempting WebSocket connection to:', wsUrl);

      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Only reconnect if component is still mounted
        if (isMountedRef.current && enabled && reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.log('Not reconnecting - component unmounted or disabled');
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
      console.log('useDocumentWebSocket cleanup - stopping reconnection');
      
      // Mark component as unmounted to prevent reconnection
      isMountedRef.current = false;
      
      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Reset reconnection attempts
      reconnectAttemptsRef.current = 999;
      
      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Clear collaborators
      setCollaborators([]);
      setIsConnected(false);
    };
  }, [documentId, enabled]);

  // Mark current user in collaborators list (from server JOIN messages)
  const allCollaborators = useMemo(() => {
    if (!user) return collaborators;

    // Just mark which one is the current user
    return collaborators.map((c) => ({
      ...c,
      isCurrentUser: c.userId === user.userID,
    }));
  }, [collaborators, user]);

  return { collaborators: allCollaborators, isConnected };
}
