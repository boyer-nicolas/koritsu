import { createRoute } from "koritsu";
import { z } from "zod";

const testResponseSchema = z.object({
	message: z.string(),
	method: z.string(),
	timestamp: z.string(),
	url: z.string(),
	environment: z.string(),
	status: z.literal("ok"),
});
export const GET = createRoute({
	method: "GET",
	handler: async ({ request }) => {
		return Response.json({
			message: "Hello world!",
			method: "GET",
			timestamp: new Date().toISOString(),
			url: request.url,
			environment: process.env.NODE_ENV || "development",
			status: "ok" as const,
		});
	},
	spec: {
		responseFormat: "json",
		tags: ["Test"],
		summary: "Test endpoint",
		description:
			"A simple test endpoint that returns server status and timestamp",
		responses: {
			200: {
				description: "Test response with server information",
				schema: testResponseSchema,
			},
		},
	},
});
