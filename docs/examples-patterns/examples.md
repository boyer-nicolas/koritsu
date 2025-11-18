# Examples

Here are some common patterns and examples for building APIs with Koritsu.

## Basic CRUD Operations

### List Users

```typescript
// routes/users/route.ts
export const GET = createRoute({
  method: "GET",
  handler: async ({ query }) => {
    const { limit = 10, offset = 0 } = query;
    const users = await getUsersFromDatabase({ limit, offset });
    return Response.json(users);
  },
  spec: {
    responseFormat: "json",
    tags: ["Users"],
    summary: "List users",
    parameters: {
      query: z.object({
        limit: z.coerce.number().min(1).max(100).default(10),
        offset: z.coerce.number().min(0).default(0),
      }),
    },
    responses: {
      200: { schema: z.array(userSchema) },
    },
  },
});
```

### Get User by ID

```typescript
// routes/users/[id]/route.ts
export const GET = createRoute({
  method: "GET",
  handler: async ({ params }) => {
    const user = await getUserById(params.id);
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    return Response.json(user);
  },
  spec: {
    responseFormat: "json",
    tags: ["Users"],
    summary: "Get user by ID",
    parameters: {
      path: z.object({ id: z.string().uuid() }),
    },
    responses: {
      200: { schema: userSchema },
      404: { schema: errorSchema },
    },
  },
});
```

### Create User

```typescript
// routes/users/route.ts
export const POST = createRoute({
  method: "POST",
  handler: async ({ body }) => {
    const user = await createUser(body);
    return Response.json(user, { status: 201 });
  },
  spec: {
    responseFormat: "json",
    tags: ["Users"],
    summary: "Create new user",
    parameters: {
      body: createUserSchema,
    },
    responses: {
      201: { schema: userSchema },
      400: { schema: errorSchema },
    },
  },
});
```

## Authentication Example

```typescript
// routes/auth/login/route.ts
export const POST = createRoute({
  method: "POST",
  handler: async ({ body }) => {
    const { email, password } = body;
    const user = await authenticateUser(email, password);

    if (!user) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = generateJWT(user);
    return Response.json({ token, user });
  },
  spec: {
    responseFormat: "json",
    tags: ["Authentication"],
    summary: "User login",
    parameters: {
      body: z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }),
    },
    responses: {
      200: {
        schema: z.object({
          token: z.string(),
          user: userSchema,
        }),
      },
      401: { schema: errorSchema },
    },
  },
});
```

## File Upload Example

```typescript
// routes/upload/route.ts
export const POST = createRoute({
  method: "POST",
  handler: async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const fileName = await saveFile(buffer, file.name);

    return Response.json({ fileName, size: file.size });
  },
  spec: {
    responseFormat: "json",
    tags: ["Files"],
    summary: "Upload file",
    responses: {
      200: {
        schema: z.object({
          fileName: z.string(),
          size: z.number(),
        }),
      },
      400: { schema: errorSchema },
    },
  },
});
```

## Form Data Response

```typescript
// routes/export/route.ts
export const POST = createRoute({
  method: "POST",
  handler: async ({ body }) => {
    const { format, data } = body;

    // Generate export data
    const exportData = await generateExport(data, format);

    // Return as FormData for multi-part responses
    const form = new FormData();
    form.append(
      "file",
      new Blob([exportData], { type: "application/octet-stream" }),
      `export.${format}`
    );
    form.append(
      "metadata",
      JSON.stringify({
        exported_at: new Date().toISOString(),
        format: format,
        size: exportData.length,
      })
    );

    return new Response(form);
  },
  spec: {
    responseFormat: "formData",
    tags: ["Export"],
    summary: "Export data as form",
    parameters: {
      body: z.object({
        format: z.enum(["csv", "json", "xlsx"]),
        data: z.array(z.record(z.any())),
      }),
    },
    responses: {
      200: {
        description: "Export data as multipart form",
        headers: {
          "Content-Type": {
            description: "multipart/form-data",
            schema: { type: "string" },
          },
        },
      },
      400: { schema: errorSchema },
    },
  },
});
```

## Health Check

```typescript
// routes/health/route.ts
export const GET = createRoute({
  method: "GET",
  handler: async () => {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
    return Response.json(health);
  },
  spec: {
    responseFormat: "json",
    tags: ["System"],
    summary: "Health check",
    responses: {
      200: {
        schema: z.object({
          status: z.string(),
          timestamp: z.string(),
          uptime: z.number(),
        }),
      },
    },
  },
});
```
