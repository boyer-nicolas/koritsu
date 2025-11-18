/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Api } from "../../src/lib/api";
import { resetConfig, validateConfig } from "../../src/lib/config";

describe("FormData Integration Tests", () => {
	let serverInstance: Api;
	let server: Awaited<ReturnType<Api["start"]>>;

	beforeEach(async () => {
		validateConfig({});

		// Create a temporary route file for testing
		const tempRouteContent = `
import { z } from "zod";
import { createRoute } from "../../../../src/lib/helpers";

export const POST = createRoute({
	method: "POST",
	handler: async ({ body }) => {
		const formData = new FormData();
		formData.append("message", "File uploaded successfully");
		formData.append("originalFilename", body.file?.name || "unknown");
		formData.append("timestamp", new Date().toISOString());
		return new Response(formData);
	},
	spec: {
		responseFormat: "formData",
		tags: ["Upload", "Test"],
		summary: "Upload file test endpoint",
		parameters: {
			body: z.object({
				file: z.instanceof(File).describe("File to upload"),
				description: z.string().describe("File description"),
			}),
		},
		responses: {
			200: {
				schema: z.object({
					message: z.string(),
					originalFilename: z.string(),
					timestamp: z.string(),
				}),
			},
		},
	},
});

export const GET = createRoute({
	method: "GET", 
	handler: async () => {
		const formData = new FormData();
		formData.append("status", "ready");
		formData.append("format", "multipart/form-data");
		return new Response(formData);
	},
	spec: {
		responseFormat: "formData",
		summary: "Get status as form data",
		responses: {
			200: {
				schema: z.object({
					status: z.string(),
					format: z.string(),
				}),
			},
		},
	},
});
		`;

		await Bun.write(
			"./tests/fixtures/routes/formdata-test/route.ts",
			tempRouteContent,
		);

		// Create mixed content route for testing different content types
		const mixedRouteContent = `
import { z } from "zod";
import { createRoute } from "../../../../src/lib/helpers";

export const GET = createRoute({
	method: "GET",
	handler: async () => {
		return Response.json({ message: "JSON response", type: "application/json" });
	},
	spec: {
		responseFormat: "json",
		summary: "Get JSON data",
		responses: {
			200: {
				schema: z.object({
					message: z.string(),
					type: z.string(),
				}),
			},
		},
	},
});

export const POST = createRoute({
	method: "POST",
	handler: async () => {
		const formData = new FormData();
		formData.append("message", "FormData response");
		formData.append("type", "multipart/form-data");
		return new Response(formData);
	},
	spec: {
		responseFormat: "formData",
		summary: "Get FormData response",
		responses: {
			200: {
				schema: z.object({
					message: z.string(),
					type: z.string(),
				}),
			},
		},
	},
});
		`;

		await Bun.write(
			"./tests/fixtures/routes/mixed-content/route.ts",
			mixedRouteContent,
		);

		serverInstance = new Api({
			server: { routes: { dir: "./tests/fixtures/routes" }, port: 0 },
		});
		server = await serverInstance.start();
	});

	afterEach(async () => {
		await server?.stop();
		resetConfig();
		validateConfig({});

		// Clean up temp files
		try {
			await Bun.$`rm -rf ./tests/fixtures/routes/formdata-test`;
			await Bun.$`rm -rf ./tests/fixtures/routes/mixed-content`;
		} catch {
			// Ignore cleanup errors
		}
	});

	test("should handle multipart/form-data response correctly", async () => {
		const port = server.port;
		const response = await fetch(`http://localhost:${port}/formdata-test`, {
			method: "GET",
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain(
			"multipart/form-data",
		);

		const formData = await response.formData();
		expect(formData.get("status")).toBe("ready");
		expect(formData.get("format")).toBe("multipart/form-data");
	});

	test("should accept multipart/form-data request and return formData response", async () => {
		const port = server.port;

		// Create test file
		const testFile = new File(["test content"], "test.txt", {
			type: "text/plain",
		});
		const requestFormData = new FormData();
		requestFormData.append("file", testFile);
		requestFormData.append("description", "Test file upload");

		const response = await fetch(`http://localhost:${port}/formdata-test`, {
			method: "POST",
			body: requestFormData,
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain(
			"multipart/form-data",
		);

		const responseFormData = await response.formData();
		expect(responseFormData.get("message")).toBe("File uploaded successfully");
		expect(responseFormData.get("originalFilename")).toBe("test.txt");
		expect(responseFormData.get("timestamp")).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
		);
	});

	test("should generate correct OpenAPI spec for formData endpoints", async () => {
		const port = server.port;
		const response = await fetch(`http://localhost:${port}/api-docs.json`);
		const openApiSpec = (await response.json()) as {
			paths: Record<
				string,
				{
					post?: {
						summary?: string;
						tags?: string[];
						requestBody?: {
							content?: Record<string, unknown>;
						};
						responses?: Record<
							string,
							{
								content?: Record<string, unknown>;
							}
						>;
					};
					get?: {
						summary?: string;
						responses?: Record<
							string,
							{
								content?: Record<string, unknown>;
							}
						>;
					};
				}
			>;
		};

		// Check the POST endpoint
		const postEndpoint = openApiSpec.paths["/formdata-test"]?.post;
		expect(postEndpoint).toBeDefined();
		expect(postEndpoint?.summary).toBe("Upload file test endpoint");
		expect(postEndpoint?.tags).toEqual(["Upload", "Test"]);

		// Verify request body content type
		expect(
			postEndpoint?.requestBody?.content?.["multipart/form-data"],
		).toBeDefined();
		expect(
			postEndpoint?.requestBody?.content?.["application/json"],
		).toBeUndefined();

		// Verify response content type
		const postResponse = postEndpoint?.responses?.["200"];
		expect(postResponse?.content?.["multipart/form-data"]).toBeDefined();
		expect(postResponse?.content?.["application/json"]).toBeUndefined();

		// Check the GET endpoint
		const getEndpoint = openApiSpec.paths["/formdata-test"]?.get;
		expect(getEndpoint).toBeDefined();
		expect(getEndpoint?.summary).toBe("Get status as form data");

		// Verify GET response content type
		const getResponse = getEndpoint?.responses?.["200"];
		expect(getResponse?.content?.["multipart/form-data"]).toBeDefined();
		expect(getResponse?.content?.["application/json"]).toBeUndefined();
	});

	test("should handle mixed content types in the same API", async () => {
		const port = server.port;

		// Test JSON endpoint
		const jsonResponse = await fetch(`http://localhost:${port}/mixed-content`, {
			method: "GET",
		});
		expect(jsonResponse.headers.get("content-type")).toContain(
			"application/json",
		);
		const jsonData = (await jsonResponse.json()) as Record<string, string>;
		expect(jsonData.message).toBe("JSON response");

		// Test FormData endpoint
		const formDataResponse = await fetch(
			`http://localhost:${port}/mixed-content`,
			{
				method: "POST",
			},
		);
		expect(formDataResponse.headers.get("content-type")).toContain(
			"multipart/form-data",
		);
		const formData = await formDataResponse.formData();
		expect(formData.get("message")).toBe("FormData response");
	});
});
