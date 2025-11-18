import { z } from "zod";
import { createRoute } from "../../../src/lib/helpers";

const errorSchema = z.object({
	error: z.string(),
	message: z.string().optional(),
});

// Single file upload example
export const POST = createRoute({
	method: "POST",
	handler: async ({ body }) => {
		// ✅ Use the pre-parsed body instead of request.formData()
		const { file, description, category } = body;

		if (!file || !(file instanceof File)) {
			return Response.json({ error: "No file provided" }, { status: 400 });
		}

		// Process the file
		// const buffer = await file.arrayBuffer(); // In a real app, you'd process this
		const fileInfo = {
			filename: file.name,
			size: file.size,
			type: file.type,
			description: description || "No description provided",
			category: category || "general",
			uploadedAt: new Date().toISOString(),
		};

		// In a real app, you'd save the file here
		// const savedPath = await saveFile(buffer, file.name);

		return Response.json({
			success: true,
			file: fileInfo,
			message: `Successfully uploaded ${file.name}`,
		});
	},
	spec: {
		responseFormat: "json",
		tags: ["Files", "Upload"],
		summary: "Upload a single file",
		description: "Upload a file with optional metadata",
		parameters: {
			body: z.object({
				file: z.instanceof(File).describe("File to upload"),
				description: z
					.string()
					.optional()
					.describe("Optional file description"),
				category: z
					.string()
					.optional()
					.describe("File category (e.g., 'image', 'document')"),
			}),
		},
		responses: {
			200: {
				schema: z.object({
					success: z.boolean(),
					file: z.object({
						filename: z.string(),
						size: z.number(),
						type: z.string(),
						description: z.string(),
						category: z.string(),
						uploadedAt: z.string(),
					}),
					message: z.string(),
				}),
			},
			400: { schema: errorSchema },
		},
	},
});

// Multiple files upload example
export const PUT = createRoute({
	method: "PUT",
	handler: async ({ body }) => {
		const { files, metadata } = body;

		if (!files || files.length === 0) {
			return Response.json({ error: "No files provided" }, { status: 400 });
		}

		// Process each file
		const results = await Promise.all(
			files.map(async (file) => {
				// const buffer = await file.arrayBuffer(); // In a real app, you'd process this
				return {
					filename: file.name,
					size: file.size,
					type: file.type,
					// In a real app: savedPath: await saveFile(buffer, file.name)
				};
			}),
		);

		return Response.json({
			success: true,
			uploadedFiles: results,
			totalFiles: files.length,
			totalSize: results.reduce((sum, file) => sum + file.size, 0),
			metadata: metadata || {},
		});
	},
	spec: {
		responseFormat: "json",
		tags: ["Files", "Upload"],
		summary: "Upload multiple files",
		description: "Upload multiple files with shared metadata",
		parameters: {
			body: z.object({
				files: z
					.array(z.instanceof(File))
					.min(1)
					.describe("Array of files to upload"),
				metadata: z
					.object({
						project: z.string().optional().describe("Project name"),
						tags: z.array(z.string()).optional().describe("File tags"),
					})
					.optional()
					.describe("Shared metadata for all files"),
			}),
		},
		responses: {
			200: {
				schema: z.object({
					success: z.boolean(),
					uploadedFiles: z.array(
						z.object({
							filename: z.string(),
							size: z.number(),
							type: z.string(),
						}),
					),
					totalFiles: z.number(),
					totalSize: z.number(),
					metadata: z
						.object({
							project: z.string().optional(),
							tags: z.array(z.string()).optional(),
						})
						.optional(),
				}),
			},
			400: { schema: errorSchema },
		},
	},
});

// Form data response example (returning FormData)
export const GET = createRoute({
	method: "GET",
	handler: async ({ query }) => {
		const { format } = query;

		// Create form data response
		const formData = new FormData();
		formData.append("message", "Export completed successfully");
		formData.append("format", format || "csv");
		formData.append("exportedAt", new Date().toISOString());

		// In a real app, you might attach a file:
		// const exportFile = new File([exportData], `export.${format}`, { type: "text/csv" });
		// formData.append("file", exportFile);

		return new Response(formData);
	},
	spec: {
		responseFormat: "formData",
		tags: ["Export"],
		summary: "Export data as form data",
		description: "Export data and return as multipart/form-data",
		parameters: {
			query: z.object({
				format: z
					.enum(["csv", "json", "xlsx"])
					.default("csv")
					.describe("Export format"),
			}),
		},
		responses: {
			200: {
				schema: z.object({
					message: z.string(),
					format: z.string(),
					exportedAt: z.string(),
				}),
			},
		},
	},
});
