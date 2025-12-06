import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface UseYjsProviderProps {
  documentId: string;
  enabled: boolean;
  username?: string;
  userColor?: string;
}

export function useYjsProvider({ documentId, enabled, username, userColor }: UseYjsProviderProps) {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [synced, setSynced] = useState(false);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    console.log('useYjsProvider effect:', { enabled, documentId });
    
    if (!enabled || !documentId) {
      console.log('Yjs provider skipped:', { enabled, documentId });
      return;
    }

    console.log('Creating Yjs WebSocket provider for document:', documentId);

    // Create WebSocket provider
    const wsProvider = new WebsocketProvider(
      'ws://localhost:8081',
      documentId,
      ydoc,
      {
        // Optional: Add authentication
        // params: { token: localStorage.getItem('token') || '' },
      }
    );

    // Set user awareness (for cursor tracking)
    if (username && userColor) {
      wsProvider.awareness.setLocalStateField('user', {
        name: username,
        color: userColor,
      });
    }

    wsProvider.on('status', (event: { status: string }) => {
      console.log('Yjs connection status:', event.status);
    });

    wsProvider.on('sync', (isSynced: boolean) => {
      console.log('Yjs synced:', isSynced);
      setSynced(isSynced);
    });

    providerRef.current = wsProvider;
    setProvider(wsProvider);

    // Cleanup
    return () => {
      console.log('Destroying Yjs provider');
      wsProvider.destroy();
      providerRef.current = null;
    };
  }, [documentId, enabled, ydoc]);

  // Update awareness when user info changes (without recreating provider)
  useEffect(() => {
    if (providerRef.current && username && userColor) {
      providerRef.current.awareness.setLocalStateField('user', {
        name: username,
        color: userColor,
      });
    }
  }, [username, userColor]);

  return { ydoc, provider, synced };
}
