# Setup Instructions

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
COUCHBASE_CONNECTION_STRING=couchbases://cb.jlqsadh62vp6qu0.cloud.couchbase.com
COUCHBASE_USERNAME=collab-access
COUCHBASE_PASSWORD=Password@123
COUCHBASE_BUCKET_NAME=default
```

**Note:** The `.env` file is gitignored to keep your credentials secure. Never commit it to version control.

Alternatively, you can set these as system environment variables:

```bash
export COUCHBASE_CONNECTION_STRING="couchbases://cb.jlqsadh62vp6qu0.cloud.couchbase.com"
export COUCHBASE_USERNAME="collab-access"
export COUCHBASE_PASSWORD="Password@123"
export COUCHBASE_BUCKET_NAME="default"
```

## Running the Server

### With Auto-reload (Development)
```bash
./runserver.sh
# or
air
```

### Without Auto-reload (Production)
```bash
go run ./cmd/server
# or
go build ./cmd/server && ./server
```

## API Endpoints

### POST /signup
Register a new user.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid-here",
  "username": "johndoe",
  "email": "john@example.com",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request payload or missing fields
- `409 Conflict`: User with email or username already exists
- `500 Internal Server Error`: Server error

