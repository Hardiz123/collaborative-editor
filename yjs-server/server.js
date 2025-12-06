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

const getYDoc = (docname) => map.setIfUndefined(docs, docname, () => {
    const doc = new Y.Doc();
    doc.gc = true;
    return doc;
});

const setupWSConnection = (conn, req, docName) => {
    conn.binaryType = 'arraybuffer';
    const doc = getYDoc(docName);
    const awareness = new awarenessProtocol.Awareness(doc);

    awareness.setLocalState(null);

    const send = (buf) => {
        if (conn.readyState === WebSocket.OPEN) {
            conn.send(buf, (err) => { if (err) console.error(err); });
        }
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
                        send(encoding.toUint8Array(encoder));
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
        if (origin !== conn) {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageSync);
            syncProtocol.writeUpdate(encoder, update);
            send(encoding.toUint8Array(encoder));
        }
    });

    awareness.on('update', ({ added, updated, removed }, origin) => {
        const changedClients = added.concat(updated).concat(removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
        send(encoding.toUint8Array(encoder));
    });

    conn.on('message', messageListener);
    conn.on('close', () => {
        doc.off('update', messageListener);
        awareness.off('update', messageListener);
        awareness.destroy();
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
