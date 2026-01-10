# Build stage for GO backend
FROM golang:1.24-alpine AS go-builder

# Install build dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o server ./cmd/server

# Runtime stage - Combined GO + Node.js
FROM node:20-alpine

# Install supervisor and ca-certificates
RUN apk add --no-cache supervisor ca-certificates

# Create necessary directories
RUN mkdir -p /var/log/supervisor /root/yjs-server

WORKDIR /root/

# Copy GO binary from builder
COPY --from=go-builder /app/server .

# Copy YJS server files
COPY yjs-server/package*.json ./yjs-server/
COPY yjs-server/server.js ./yjs-server/

# Install YJS dependencies
WORKDIR /root/yjs-server
RUN npm install --production

# Copy supervisord configuration
WORKDIR /root/
COPY supervisord.conf /etc/supervisord.conf

# Expose both ports
EXPOSE 8080 8081

# Run supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
