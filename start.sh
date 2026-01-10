#!/bin/sh
# Backup startup script (alternative to supervisord)
# This script starts both GO backend and YJS server

set -e

echo "Starting GO Backend Server..."
/root/server &
GO_PID=$!

echo "Starting YJS WebSocket Server..."
cd /root/yjs-server
node server.js &
YJS_PID=$!

echo "Both servers started:"
echo "  - GO Backend (PID: $GO_PID) on port 8080"
echo "  - YJS Server (PID: $YJS_PID) on port 8081"

# Function to handle shutdown
shutdown() {
    echo "Shutting down servers..."
    kill $GO_PID $YJS_PID 2>/dev/null
    wait $GO_PID $YJS_PID 2>/dev/null
    echo "Servers stopped"
    exit 0
}

# Trap SIGTERM and SIGINT
trap shutdown SIGTERM SIGINT

# Wait for both processes
wait $GO_PID $YJS_PID
