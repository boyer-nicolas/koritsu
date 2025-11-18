# Form Data Examples

This directory contains examples demonstrating proper form data handling in Koritsu.

## Available Endpoints

### POST `/form-data-example` - Single File Upload

Upload a single file with optional metadata.

**Request:**

```bash
curl -X POST http://localhost:8080/form-data-example \
  -F "file=@example.txt" \
  -F "description=Test file upload" \
  -F "category=document"
```

**Response:**

```json
{
  "success": true,
  "file": {
    "filename": "example.txt",
    "size": 1234,
    "type": "text/plain",
    "description": "Test file upload",
    "category": "document",
    "uploadedAt": "2025-11-18T10:30:00.000Z"
  },
  "message": "Successfully uploaded example.txt"
}
```

### PUT `/form-data-example` - Multiple Files Upload

Upload multiple files with shared metadata.

**Request:**

```bash
curl -X PUT http://localhost:8080/form-data-example \
  -F "files=@file1.txt" \
  -F "files=@file2.png" \
  -F "metadata[project]=MyProject" \
  -F "metadata[tags][]=important" \
  -F "metadata[tags][]=backup"
```

### GET `/form-data-example` - Export as Form Data

Get data exported as multipart/form-data response.

**Request:**

```bash
curl "http://localhost:8080/form-data-example?format=csv"
```

**Response:** Multipart form data with fields like `message`, `format`, and `exportedAt`.

## Key Points Demonstrated

1. **Always use `body` parameter** - Never call `request.formData()` directly
2. **File objects are preserved** - Access files directly from the parsed body
3. **Type safety with Zod** - All parameters are validated and typed
4. **Automatic OpenAPI docs** - Endpoints are documented with proper schemas
5. **Multiple file handling** - Arrays of files are supported
6. **Mixed data types** - Combine files with other form data seamlessly

## Testing with HTML Form

You can also test these endpoints using a simple HTML form:

```html
<!DOCTYPE html>
<html>
  <body>
    <form
      action="http://localhost:8080/form-data-example"
      method="post"
      enctype="multipart/form-data"
    >
      <input type="file" name="file" required />
      <input type="text" name="description" placeholder="File description" />
      <input type="text" name="category" placeholder="Category" />
      <button type="submit">Upload</button>
    </form>
  </body>
</html>
```

Save this as `test-upload.html` and open in your browser while the dev server is running.
