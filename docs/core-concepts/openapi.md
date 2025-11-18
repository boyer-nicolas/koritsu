# OpenAPI Integration

Koritsu automatically generates OpenAPI (Swagger) documentation from your route specifications.

## Automatic Documentation

Every route spec contributes to the generated OpenAPI schema:

```typescript
export const GET = createRoute({
  method: "GET",
  handler: async ({ params }) => {
    // Route implementation
  },
  spec: {
    responseFormat: "json",
    tags: ["Users"],
    summary: "Get user by ID",
    parameters: {
      path: z.object({
        id: z.string().uuid().describe("User ID"),
      }),
    },
    responses: {
      200: {
        schema: userSchema.describe("User data"),
      },
      404: {
        schema: errorSchema.describe("User not found"),
      },
    },
  },
});
```

## Swagger UI

Access the interactive documentation at:

- **Swagger UI**: `http://localhost:3000/` (configurable)
- **OpenAPI JSON**: `http://localhost:3000/api-docs.json`

## Zod Schema Conversion

The system automatically converts Zod schemas to OpenAPI JSON Schema:

```typescript
// Complex nested schema
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
  metadata: z.record(z.string()).optional(),
  createdAt: z.date().transform((d) => d.toISOString()),
});

// Automatically becomes proper OpenAPI schema
```

## Response Formats

Specify the expected response format using the `responseFormat` property:

```typescript
export const GET = createRoute({
  method: "GET",
  handler: async () => {
    return Response.json({ message: "JSON response" });
  },
  spec: {
    responseFormat: "json", // JSON responses
    // ... other spec properties
  },
});

export const POST = createRoute({
  method: "POST",
  handler: async () => {
    return new Response("Plain text response");
  },
  spec: {
    responseFormat: "text", // Plain text responses
    // ... other spec properties
  },
});

export const PUT = createRoute({
  method: "PUT",
  handler: async ({ body }) => {
    // Handle form data
    const form = new FormData();
    form.append("status", "success");
    return new Response(form);
  },
  spec: {
    responseFormat: "formData", // Form data responses
    // ... other spec properties
  },
});
```

### Supported Formats

- **`"json"`**: JSON responses (most common)
- **`"text"`**: Plain text responses
- **`"formData"`**: Multipart form data responses

The response format affects OpenAPI documentation generation and content-type validation in development mode.

## Configuration

Customize the documentation generation:

```typescript
new Api({
  title: "My API",
  description: "A powerful API built with Koritsu",
  version: "1.0.0",
  swagger: {
    path: "/docs", // Custom Swagger UI path
    enabled: true, // Enable/disable in production
    externalSpecs: [
      {
        url: "https://api.example.com/openapi.json",
        name: "external-service",
        tags: ["External"], // Optional: custom tags for grouping
        pathPrefix: "/api/v1", // Optional: prefix all external paths
      },
    ],
  },
});
```

### External OpenAPI Specifications

Merge external OpenAPI specs into your documentation. This is useful for:

- Integrating third-party service documentation (e.g., Better Auth)
- Documenting microservices in a unified API gateway
- Including legacy API documentation

#### Configuration Options

- **url** (required): URL to fetch the external OpenAPI spec
- **name** (required): Identifier for the external spec
- **tags** (optional): Custom tags to group all external operations
- **pathPrefix** (optional): Prefix to prepend to all paths from the external spec

#### Path Prefix Example

When using `pathPrefix`, all paths from the external spec are prefixed:

```typescript
// External spec has: /users, /posts
externalSpecs: [
  {
    url: "https://api.example.com/openapi.json",
    name: "blog-api",
    pathPrefix: "/api/v1",
  },
];
// Results in: /api/v1/users, /api/v1/posts
```

The prefix automatically handles:

- Missing leading slashes (`api` becomes `/api`)
- Trailing slashes (`/api/` becomes `/api`)
- Proper path joining (`/api` + `/users` becomes `/api/users`)

#### Supported Formats

External specs can be:

- **JSON**: Standard OpenAPI JSON format
- **HTML with embedded JSON**: Automatically extracted (useful for Better Auth)

See the [Better Auth integration guide](../integration-guides/better-auth.md) for a complete example.

## Tags and Organization

Use tags to group related operations in the Swagger UI:

```typescript
spec: {
  tags: ["Users", "Authentication"],
  // ... other spec properties
}
```

Tags are automatically collected and added to the OpenAPI specification.

### OpenAPI Groups with Tags

Organize your API operations into logical groups using OpenAPI tags. Tags help categorize operations in the Swagger UI and make your API documentation more organized and user-friendly.

#### Adding Tags to Routes

Add the optional `tags` array to your route specification:

```typescript
export const GET = createRoute({
  method: "GET",
  handler: async () => {
    // Route logic here
    return Response.json({ message: "Success" });
  },
  spec: {
    responseFormat: "json",
    tags: ["Users", "Authentication"], // Multiple tags supported
    summary: "Get user data",
    description: "Retrieve user information",
    responses: {
      200: {
        schema: z.object({
          message: z.string(),
        }),
      },
    },
  },
});
```

#### Tag Features

- **Multiple Tags**: Operations can belong to multiple groups by specifying multiple tags
- **Automatic Generation**: The framework automatically generates the global tags section with descriptions
- **Swagger UI Integration**: Tags appear as collapsible sections in Swagger UI
- **Alphabetical Sorting**: Tags are automatically sorted alphabetically in the documentation

#### Example Usage

```typescript
// User management operations
export const GET = createRoute({
  spec: {
    tags: ["Users"],
    // ... rest of spec
  },
});

// Authentication operations
export const POST = createRoute({
  spec: {
    tags: ["Authentication", "Users"], // Multiple categories
    // ... rest of spec
  },
});

// Health check operations
export const GET = createRoute({
  spec: {
    tags: ["Health"],
    // ... rest of spec
  },
});
```

The generated OpenAPI specification will include:

- A global `tags` section with descriptions for each tag
- Each operation tagged with the specified categories
- Organized sections in Swagger UI for better navigation

## Validation

In development mode, responses are validated against their schemas to ensure your API matches the documentation.
