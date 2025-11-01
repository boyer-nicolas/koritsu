import { getBucketById, singleBucketSchema } from "@dev/lib/storage";
import { createRoute } from "src";
import { z } from "zod";

export const GET = createRoute({
	method: "GET",
	callback: async ({ params }) => {
		if (!params?.id) {
			return Response.json({ error: "Missing id parameter" }, { status: 400 });
		}

		const bucket = getBucketById(params.id);

		if (!bucket) {
			return Response.json({ error: "Bucket not found" }, { status: 404 });
		}

		return Response.json(bucket);
	},
	spec: {
		format: "json",
		parameters: {
			path: z.object({
				id: z.string().describe("The bucket ID"),
			}),
		},
		responses: {
			200: {
				summary: "Storage bucket details",
				description: "Details of the storage bucket",
				schema: singleBucketSchema,
			},
			404: {
				summary: "Bucket not found",
				description: "The requested bucket was not found",
				schema: z.object({
					error: z.string().default("Bucket not found"),
				}),
			},
		},
	},
});
