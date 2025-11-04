import { describe, expect, test } from "bun:test";
import { type Config, ConfigSchema, getConfig } from "../../src/lib/config";

describe("config.ts", () => {
	describe("ConfigSchema", () => {
		test("should validate valid config", () => {
			const validConfig: Config = {
				server: {
					port: 3000,
					host: "localhost",
					logLevel: "info",
					routes: {
						basePath: "/",
						dir: "./routes",
					},
					static: {
						basePath: "/static",
						enabled: true,
						dir: "./public",
					},
				},
				swagger: {
					enabled: true,
					path: "/docs",
				},
				title: "Test API",
				description: "Test API description",
				environment: "development",
			};

			const result = ConfigSchema.safeParse(validConfig);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(validConfig);
			}
		});

		test("should apply default values for missing properties", () => {
			const minimalConfig = {};

			const result = ConfigSchema.safeParse(minimalConfig);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({
					server: {
						port: 8080,
						host: "0.0.0.0",
						logLevel: "info",
						routes: {
							dir: "./routes",
							basePath: "/",
						},
						static: {
							enabled: false,
							basePath: "/static",
							dir: "./static",
						},
					},
					swagger: {
						enabled: true,
						path: "/",
					},
					title: "My API",
					description:
						"Auto-generated API documentation from route specifications",
					environment: "development",
				});
			}
		});

		test("should reject invalid port numbers", () => {
			const invalidConfigs = [
				{ server: { port: 0 } },
				{ server: { port: -1 } },
				{ server: { port: 65536 } },
				{ server: { port: "invalid" } },
			];

			invalidConfigs.forEach((config) => {
				const result = ConfigSchema.safeParse(config);
				expect(result.success).toBe(false);
			});
		});

		test("should reject invalid log levels", () => {
			const invalidConfig = {
				server: { logLevel: "invalid" },
			};

			const result = ConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		test("should reject short auth secrets", () => {
			const invalidConfig = {
				auth: { secret: "short" },
			};

			const result = ConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});

		test("should reject invalid environments", () => {
			const invalidConfig = {
				environment: "invalid",
			};

			const result = ConfigSchema.safeParse(invalidConfig);
			expect(result.success).toBe(false);
		});
	});

	describe("AppConfig", () => {
		test("should load config with default values when no environment variables are set", () => {
			const config = getConfig();

			expect(config).toEqual({
				server: {
					port: 8080,
					host: "0.0.0.0",
					logLevel: "info",
					routes: {
						basePath: "/",
						dir: "./routes",
					},
					static: {
						enabled: false,
						basePath: "/static",
						dir: "./static",
					},
				},
				swagger: {
					enabled: true,
					path: "/",
				},
				title: "My API",
				description:
					"Auto-generated API documentation from route specifications",
				environment: "development",
			});
		});

		test("should throw error when getting config before loading", () => {
			expect(() => getConfig()).toThrow(
				"Configuration has not been loaded yet.",
			);
		});
	});
});
