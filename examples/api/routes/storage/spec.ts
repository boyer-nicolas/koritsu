import { defineSpec } from "ombrage-api";

export default defineSpec({
	get: {
		summary: "List all storage items",
		description: "Retrieves a list of all available storage items",
		responses: {
			"200": {
				description: "List of storage item names",
				content: {
					"application/json": {
						schema: {
							type: "array",
							items: {
								type: "string",
							},
							example: ["user1", "user2", "user3"],
						},
					},
				},
			},
		},
	},
	post: {
		summary: "Create a new storage item",
		description: "Creates a new storage item with the specified name",
		requestBody: {
			required: true,
			content: {
				"application/json": {
					schema: {
						type: "object",
						properties: {
							name: {
								type: "string",
								description: "The name of the storage item to create",
								example: "new-user",
							},
						},
						required: ["name"],
					},
				},
			},
		},
		responses: {
			"201": {
				description: "Storage item created successfully",
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								name: {
									type: "string",
									example: "new-user",
								},
								created: {
									type: "boolean",
									example: true,
								},
							},
							required: ["name", "created"],
						},
					},
				},
			},
			"400": {
				description: "Bad request - missing or invalid data",
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								error: { type: "string" },
								message: { type: "string" },
							},
						},
					},
				},
			},
		},
	},
});
