# Architecture Overview

This project follows a clean, layered architecture with clear separation of concerns.

## Project Structure

```
collaborative-editor/
├── cmd/
│   └── server/          # Application entry point
│       └── main.go      # Server initialization and dependency injection
├── internal/
│   ├── db/              # Database connection management
│   │   └── couchbase.go # Couchbase connection setup
│   ├── errors/           # Custom error types and handling
│   │   └── errors.go    # AppError and predefined errors
│   ├── handlers/        # HTTP request handlers (Presentation Layer)
│   │   └── user_handler.go
│   ├── repository/      # Data access layer (Repository Pattern)
│   │   ├── user_repository.go          # Repository interface
│   │   └── couchbase_user_repository.go # Couchbase implementation
│   ├── routes/          # Route configuration
│   │   └── routes.go
│   ├── services/         # Business logic layer
│   │   └── user_service.go
│   └── validation/      # Input validation
│       └── validation.go
└── pkg/
    └── user/            # Domain models (shared package)
        └── model.go
```

## Architecture Layers

### 1. **Presentation Layer** (`internal/handlers/`)
- Handles HTTP requests and responses
- Validates HTTP-specific concerns (method, headers)
- Converts between HTTP and application formats
- Delegates business logic to services

### 2. **Business Logic Layer** (`internal/services/`)
- Contains all business rules and logic
- Orchestrates operations across repositories
- Validates business rules
- Handles transactions and coordination

### 3. **Data Access Layer** (`internal/repository/`)
- Abstracts database operations
- Implements repository pattern for testability
- Provides clean interface for data operations
- Handles database-specific concerns

### 4. **Domain Models** (`pkg/user/`)
- Core business entities
- No dependencies on infrastructure
- Pure data structures

## Design Patterns Used

### Repository Pattern
- Abstracts data access behind interfaces
- Makes testing easier (can mock repositories)
- Allows switching databases without changing business logic

### Dependency Injection
- Dependencies are injected through constructors
- Makes code testable and maintainable
- Clear dependency graph

### Error Handling
- Custom `AppError` type with HTTP status codes
- Consistent error responses
- Proper error wrapping for context

## Benefits of This Architecture

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Testability**: Easy to mock dependencies and test in isolation
3. **Maintainability**: Changes in one layer don't affect others
4. **Scalability**: Easy to add new features without breaking existing code
5. **Flexibility**: Can swap implementations (e.g., different database) easily

## Flow Example: User Signup

```
HTTP Request
    ↓
[Handler] - Validates HTTP request, extracts data
    ↓
[Service] - Validates business rules, orchestrates operations
    ↓
[Repository] - Performs database operations
    ↓
[Database] - Stores data
    ↓
Response flows back up through layers
```

## Adding New Features

1. **Add Domain Model** in `pkg/` if needed
2. **Add Repository Interface** in `internal/repository/`
3. **Implement Repository** in `internal/repository/`
4. **Add Service** in `internal/services/`
5. **Add Handler** in `internal/handlers/`
6. **Add Route** in `internal/routes/`
7. **Wire Everything** in `cmd/server/main.go`

