import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { OpenAPIV3_1 } from "openapi-types";
import { z } from "zod";
import { resetConfig, validateConfig } from "../../src/lib/config";
import {
	type CustomSpec,
	createRoute,
	customSpecToOpenAPI,
} from "../../src/lib/helpers";

describe("FormData Response Format", () => {
	beforeEach(() => {
		validateConfig({});
	});

	afterEach(() => {
		resetConfig();
		validateConfig({});
	});

	describe("Content-Type Mapping", () => {
		test("should map formData responseFormat to multipart/form-data content-type", () => {
			const customSpec: CustomSpec = {
				post: {
					responseFormat: "formData",
					summary: "Upload file",
					responses: {
						200: {
							schema: z.object({
								message: z.string(),
								file: z.instanceof(File),
							}),
						},
					},
				},
			};

			const result = customSpecToOpenAPI(customSpec);
			const pathItem = result["/"];
			const postOperation = pathItem?.post;
			const response = postOperation?.responses?.[
				"200"
			] as OpenAPIV3_1.ResponseObject;

			expect(response.content).toBeDefined();
			expect(response.content?.["multipart/form-data"]).toBeDefined();
			expect(response.content?.["application/json"]).toBeUndefined();
			expect(response.content?.["text/plain"]).toBeUndefined();
		});

		test("should map json responseFormat to application/json content-type", () => {
			const customSpec: CustomSpec = {
				get: {
					responseFormat: "json",
					summary: "Get data",
					responses: {
						200: {
							schema: z.object({ data: z.string() }),
						},
					},
				},
			};

			const result = customSpecToOpenAPI(customSpec);
			const response = result["/"]?.get?.responses?.[
				"200"
			] as OpenAPIV3_1.ResponseObject;

			expect(response.content?.["application/json"]).toBeDefined();
			expect(response.content?.["multipart/form-data"]).toBeUndefined();
			expect(response.content?.["text/plain"]).toBeUndefined();
		});

		test("should map text responseFormat to text/plain content-type", () => {
			const customSpec: CustomSpec = {
				get: {
					responseFormat: "text",
					summary: "Get text",
					responses: {
						200: {
							schema: z.string(),
						},
					},
				},
			};

			const result = customSpecToOpenAPI(customSpec);
			const response = result["/"]?.get?.responses?.[
				"200"
			] as OpenAPIV3_1.ResponseObject;

			expect(response.content?.["text/plain"]).toBeDefined();
			expect(response.content?.["application/json"]).toBeUndefined();
			expect(response.content?.["multipart/form-data"]).toBeUndefined();
		});
	});

	describe("Request Body Handling", () => {
		test("should set multipart/form-data for request body with formData responseFormat", () => {
			const customSpec: CustomSpec = {
				post: {
					responseFormat: "formData",
					summary: "Upload file",
					parameters: {
						body: z.object({
							file: z.instanceof(File).describe("File to upload"),
							description: z.string().describe("File description"),
						}),
					},
					responses: {
						201: {
							schema: z.object({
								id: z.string(),
								filename: z.string(),
							}),
						},
					},
				},
			};

			const result = customSpecToOpenAPI(customSpec);
			const postOperation = result["/"]?.post;
			const requestBody =
				postOperation?.requestBody as OpenAPIV3_1.RequestBodyObject;

			expect(requestBody).toBeDefined();
			expect(requestBody.content?.["multipart/form-data"]).toBeDefined();
			expect(requestBody.content?.["application/json"]).toBeUndefined();

			const formDataContent = requestBody.content?.["multipart/form-data"];
			expect(formDataContent?.schema).toEqual({
				type: "object",
				properties: {
					file: {
						type: "object",
						description: "File to upload",
					},
					description: {
						type: "string",
						description: "File description",
					},
				},
				required: ["file", "description"],
			});
		});

		test("should set application/json for request body with json responseFormat", () => {
			const customSpec: CustomSpec = {
				post: {
					responseFormat: "json",
					summary: "Create data",
					parameters: {
						body: z.object({
							name: z.string(),
							data: z.string(),
						}),
					},
					responses: {
						201: {
							schema: z.object({ id: z.string() }),
						},
					},
				},
			};

			const result = customSpecToOpenAPI(customSpec);
			const requestBody = result["/"]?.post
				?.requestBody as OpenAPIV3_1.RequestBodyObject;

			expect(requestBody.content?.["application/json"]).toBeDefined();
			expect(requestBody.content?.["multipart/form-data"]).toBeUndefined();
		});
	});

	describe("createRoute with FormData", () => {
		test("should create route with formData spec successfully", () => {
			const handler = async () => {
				const formData = new FormData();
				formData.append("message", "Upload successful");
				formData.append("uploadedAt", new Date().toISOString());
				return new Response(formData);
			};

			const route = createRoute({
				method: "POST",
				handler,
				spec: {
					responseFormat: "formData",
					tags: ["Upload", "Files"],
					summary: "Upload file and get form data response",
					description:
						"Upload a file and receive a multipart/form-data response",
					parameters: {
						body: z.object({
							file: z.instanceof(File).describe("File to upload"),
							metadata: z
								.object({
									title: z.string(),
									category: z.string().optional(),
								})
								.describe("File metadata"),
						}),
					},
					responses: {
						200: {
							schema: z.object({
								message: z.string().describe("Success message"),
								uploadedAt: z.string().describe("Upload timestamp"),
								file: z.instanceof(File).optional().describe("Processed file"),
							}),
						},
						400: {
							schema: z.object({
								error: z.string(),
								details: z.string().optional(),
							}),
						},
					},
				},
			});

			expect(route.method).toBe("POST");
			expect(typeof route.handler).toBe("function");
			expect(route.spec).toBeDefined();
			expect(route.spec?.responseFormat).toBe("formData");
			expect(route.spec?.tags).toEqual(["Upload", "Files"]);
			expect(route.spec?.summary).toBe(
				"Upload file and get form data response",
			);
		});

		test("should handle formData route without body parameters", () => {
			const handler = async () => {
				const formData = new FormData();
				formData.append("status", "ready");
				return new Response(formData);
			};

			const route = createRoute({
				method: "GET",
				handler,
				spec: {
					responseFormat: "formData",
					summary: "Get status as form data",
					responses: {
						200: {
							schema: z.object({
								status: z.string(),
							}),
						},
					},
				},
			});

			expect(route.spec?.responseFormat).toBe("formData");
			expect(route.spec?.summary).toBe("Get status as form data");
		});
	});

	describe("Complex FormData Scenarios", () => {
		test("should handle formData with mixed parameter types", () => {
			const customSpec: CustomSpec = {
				post: {
					responseFormat: "formData",
					summary: "Complex upload endpoint",
					parameters: {
						path: z.object({
							userId: z.string().uuid(),
						}),
						query: z.object({
							compress: z.boolean().default(false),
							format: z.enum(["jpg", "png", "pdf"]).optional(),
						}),
						headers: z.object({
							"x-upload-token": z.string(),
						}),
						body: z.object({
							files: z.array(z.instanceof(File)),
							metadata: z.object({
								title: z.string(),
								tags: z.array(z.string()).optional(),
							}),
						}),
					},
					responses: {
						201: {
							schema: z.object({
								uploadId: z.string(),
								processedFiles: z.array(
									z.object({
										filename: z.string(),
										size: z.number(),
										url: z.string(),
									}),
								),
							}),
						},
					},
				},
			};

			const result = customSpecToOpenAPI(customSpec);
			const postOperation = result["/"]?.post;

			// Should have parameters for path, query, and headers
			expect(postOperation?.parameters).toBeDefined();
			const parameters =
				postOperation?.parameters as OpenAPIV3_1.ParameterObject[];
			expect(parameters.length).toBeGreaterThan(0);

			// Should have multipart/form-data for both request and response
			const requestBody =
				postOperation?.requestBody as OpenAPIV3_1.RequestBodyObject;
			expect(requestBody.content?.["multipart/form-data"]).toBeDefined();

			const response = postOperation?.responses?.[
				"201"
			] as OpenAPIV3_1.ResponseObject;
			expect(response.content?.["multipart/form-data"]).toBeDefined();
		});

		test("should handle formData with file schema validation", () => {
			const fileSchema = z
				.instanceof(File)
				.refine(
					(file) => file.size <= 1024 * 1024 * 5, // 5MB
					"File size must be less than 5MB",
				)
				.describe("User avatar image");

			const documentSchema = z
				.instanceof(File)
				.refine(
					(file) => ["application/pdf", "text/plain"].includes(file.type),
					"Only PDF and text files are allowed",
				)
				.describe("Document file");

			const customSpec: CustomSpec = {
				post: {
					responseFormat: "formData",
					summary: "File upload with validation",
					parameters: {
						body: z.object({
							avatar: fileSchema,
							document: documentSchema,
						}),
					},
					responses: {
						200: {
							schema: z.object({
								avatarUrl: z.string().url(),
								documentUrl: z.string().url(),
								processedAt: z.string(),
							}),
						},
					},
				},
			};

			const result = customSpecToOpenAPI(customSpec);
			const postOperation = result["/"]?.post;

			// Verify the schema structure is preserved
			const requestBody =
				postOperation?.requestBody as OpenAPIV3_1.RequestBodyObject;
			const formDataSchema =
				requestBody.content?.["multipart/form-data"]?.schema;

			expect(formDataSchema).toEqual({
				type: "object",
				properties: {
					avatar: {
						type: "object",
						description: "User avatar image",
					},
					document: {
						type: "object",
						description: "Document file",
					},
				},
				required: ["avatar", "document"],
			});

			// Verify response schema
			const response = postOperation?.responses?.[
				"200"
			] as OpenAPIV3_1.ResponseObject;
			const responseSchema = response.content?.["multipart/form-data"]?.schema;

			expect(responseSchema).toEqual({
				type: "object",
				properties: {
					avatarUrl: {
						type: "string",
					},
					documentUrl: {
						type: "string",
					},
					processedAt: {
						type: "string",
					},
				},
				required: ["avatarUrl", "documentUrl", "processedAt"],
			});
		});
	});
});
