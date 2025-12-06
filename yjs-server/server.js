const WebSocket = require('ws');
const http = require('http');
const Y = require('yjs');
const syncProtocol = require('y-protocols/sync');
const awarenessProtocol = require('y-protocols/awareness');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');
const map = require('lib0/map');

const PORT = 8081;

const docs = new Map();
const messageSync = 0;
const messageAwareness = 1;

// Store doc + awareness + connection set per document
const getYDoc = (docName) =>
    map.setIfUndefined(docs, docName, () => {
        const doc = new Y.Doc();
        doc.gc = true;
        const awareness = new awarenessProtocol.Awareness(doc);
        // Track connections and the awareness client ids they own
        const connections = new Map(); // Map<WebSocket, Set<number>>
        return { doc, awareness, connections };
    });

const setupWSConnection = (conn, req, docName) => {
    conn.binaryType = 'arraybuffer';
    const { doc, awareness, connections } = getYDoc(docName);
    connections.set(conn, new Set());

    const send = (buf) => {
        if (conn.readyState === WebSocket.OPEN) {
            conn.send(buf, (err) => { if (err) console.error(err); });
        }
    };

    const broadcast = (buf) => {
        connections.forEach((_clientIds, client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(buf, (err) => { if (err) console.error(err); });
            }
        });
    };

    // Send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(encoding.toUint8Array(encoder));

    const awarenessStates = awareness.getStates();
    if (awarenessStates.size > 0) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys())));
        send(encoding.toUint8Array(encoder));
    }

    const messageListener = (message) => {
        try {
            const encoder = encoding.createEncoder();
            const decoder = decoding.createDecoder(new Uint8Array(message));
            const messageType = decoding.readVarUint(decoder);

            switch (messageType) {
                case messageSync:
                    encoding.writeVarUint(encoder, messageSync);
                    syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
                    if (encoding.length(encoder) > 1) {
                        broadcast(encoding.toUint8Array(encoder));
                    }
                    break;
                case messageAwareness:
                    awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), conn);
                    break;
            }
        } catch (err) {
            console.error(err);
        }
    };

    doc.on('update', (update, origin) => {
        // Broadcast document updates to all clients
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.writeUpdate(encoder, update);
        broadcast(encoding.toUint8Array(encoder));
    });

    awareness.on('update', ({ added, updated, removed }, origin) => {
        // Track which awareness client ids belong to the originating connection
        const connectionClients = connections.get(origin);
        if (connectionClients) {
            added.forEach((clientId) => connectionClients.add(clientId));
            updated.forEach((clientId) => connectionClients.add(clientId));
            removed.forEach((clientId) => connectionClients.delete(clientId));
        }

        const changedClients = added.concat(updated).concat(removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
        broadcast(encoding.toUint8Array(encoder));
    });

    conn.on('message', messageListener);
    conn.on('close', () => {
        const clientIds = connections.get(conn);
        connections.delete(conn);

        // Remove awareness states that belonged to this connection
        if (clientIds && clientIds.size > 0) {
            const removedClientIds = Array.from(clientIds);

            // First remove the states from awareness so internal maps are cleaned up
            awarenessProtocol.removeAwarenessStates(awareness, removedClientIds, null);

            // Then broadcast an awareness update with the removed client ids
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageAwareness);
            encoding.writeVarUint8Array(
                encoder,
                awarenessProtocol.encodeAwarenessUpdate(awareness, removedClientIds)
            );
            broadcast(encoding.toUint8Array(encoder));
        }

        doc.off('update', messageListener);

        // Cleanup doc entry if nobody is connected
        if (connections.size === 0) {
            docs.delete(docName);
        }
    });
};

const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('Yjs WebSocket Server');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (conn, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const docName = url.pathname.slice(1) || 'default';
    console.log(`New connection for document: ${docName}`);
    setupWSConnection(conn, req, docName);
});

server.listen(PORT, () => {
    console.log(`Yjs WebSocket server running on ws://localhost:${PORT}`);
});

process.on('SIGINT', () => {
    console.log('Shutting down...');
    wss.close(() => {
        server.close(() => {
            process.exit(0);
        });
    });
});
