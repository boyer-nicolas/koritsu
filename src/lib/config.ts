import { z } from "zod";

let configInstance: Config | null = null;

const booleanFromString = z
	.union([z.boolean("Please provide a valid boolean"), z.string()])
	.transform((val) => {
		if (typeof val === "boolean") return val;
		if (typeof val === "string") {
			const lower = val.toLowerCase();
			if (lower === "true" || lower === "1" || lower === "yes") return true;
			if (lower === "false" || lower === "0" || lower === "no" || lower === "")
				return false;
			return Boolean(val);
		}
		return Boolean(val);
	});

const numberFromString = z.union([z.number(), z.string()]).transform((val) => {
	if (typeof val === "number") return val;
	if (typeof val === "string") {
		const num = Number(val);
		if (Number.isNaN(num)) {
			return val; // Return original value to let Zod handle the error
		}
		return num;
	}
	return Number(val);
});

// Define proxy callback function type
export type ProxyCallback = (props: {
	request: Request;
	params: Record<string, string>;
	target: string;
}) => Promise<{
	proceed: boolean;
	response?: Response;
	headers?: Record<string, string>;
	target?: string;
}>;

// Proxy configuration schema
const ProxyConfigSchema = z.object({
	pattern: z
		.string()
		.describe(
			"Wildcard pattern to match routes (e.g., '/api/*', '/auth/*/protected')",
		),
	target: z.string().url().describe("Target URL to proxy requests to"),
	enabled: booleanFromString.default(true),
	description: z
		.string()
		.optional()
		.describe("Optional description of what this proxy does"),
	headers: z
		.record(z.string(), z.string())
		.optional()
		.describe("Additional headers to add to proxied requests"),
	timeout: numberFromString
		.pipe(z.number().min(1000).max(60000))
		.default(10000)
		.describe("Request timeout in milliseconds"),
	retries: numberFromString
		.pipe(z.number().min(0).max(5))
		.default(0)
		.describe("Number of retry attempts on failure"),
});

export type ProxyConfig = z.infer<typeof ProxyConfigSchema> & {
	callback?: ProxyCallback;
};

export const ConfigSchema = z.object({
	server: z
		.object({
			port: numberFromString
				.pipe(z.number("Please provide a valid port number").min(0).max(65535))
				.default(8080),
			host: z.string("Please provide a valid host").default("0.0.0.0"),
			logLevel: z
				.enum(
					["debug", "info", "warning", "error", "trace", "fatal"],
					"Please provide a valid log level",
				)
				.default("info"),
			routes: z
				.object({
					dir: z
						.string("Please provide a valid routes directory")
						.default("./routes"),
					basePath: z.string("Please provide a valid base path").default("/"),
				})
				.default({ dir: "./routes", basePath: "/" }),
			static: z
				.object({
					dir: z
						.string("Please provide a valid static files directory")
						.default("./static"),
					enabled: booleanFromString.default(false),
					basePath: z
						.string("Please provide a valid static files base path")
						.default("/static"),
				})
				.default({ dir: "./static", enabled: false, basePath: "/static" }),
		})
		.default({
			port: 8080,
			host: "0.0.0.0",
			logLevel: "info",
			routes: { dir: "./routes", basePath: "/" },
			static: { dir: "./static", enabled: false, basePath: "/static" },
		}),
	proxy: z
		.object({
			enabled: booleanFromString.default(false),
			configs: z.array(ProxyConfigSchema).default([]),
		})
		.default({ enabled: false, configs: [] }),
	swagger: z
		.object({
			enabled: booleanFromString.default(true),
			path: z.string("Please provide a valid Swagger UI path").default("/"),
		})
		.default({ enabled: true, path: "/" }),
	title: z.string("Please provide a valid API title").default("My API"),
	description: z
		.string("Please provide a valid API description")
		.default("Auto-generated API documentation from route specifications"),
	environment: z
		.enum(
			["development", "production", "test"],
			"Please provide a valid environment",
		)
		.default("development"),
});

export type Config = z.infer<typeof ConfigSchema> & {
	proxy?: {
		enabled: boolean;
		configs: ProxyConfig[];
	};
};

// Input type for partial configuration
export type ConfigInput = z.input<typeof ConfigSchema> & {
	proxy?: {
		enabled?: boolean;
		configs?: ProxyConfig[];
	};
};

export function validateConfig(config: unknown): Config {
	// Extract proxy configs with callbacks before validation
	const configWithoutCallbacks = JSON.parse(JSON.stringify(config));
	const proxyCallbacks: Map<number, ProxyCallback> = new Map();

	if (configWithoutCallbacks.proxy?.configs) {
		configWithoutCallbacks.proxy.configs =
			configWithoutCallbacks.proxy.configs.map(
				(proxyConfig: any, index: number) => {
					// Check original config for callbacks since they won't survive JSON serialization
					const originalConfig = (config as any)?.proxy?.configs?.[index];
					if (originalConfig?.callback) {
						proxyCallbacks.set(index, originalConfig.callback);
					}
					// Remove callback for Zod validation (it won't be in the serialized copy anyway)
					const { callback, ...configWithoutCallback } =
						originalConfig || proxyConfig;
					return configWithoutCallback;
				},
			);
	}

	const result = ConfigSchema.safeParse(configWithoutCallbacks);
	if (!result.success) {
		console.error("Configuration validation error:", result.error);
		console.error("Provided configuration:", config);
		throw new Error("Invalid configuration");
	}

	// Re-add callbacks to the validated config
	const validatedConfig = result.data as Config;
	if (validatedConfig.proxy?.configs && proxyCallbacks.size > 0) {
		validatedConfig.proxy.configs = validatedConfig.proxy.configs.map(
			(proxyConfig, index) => {
				const callback = proxyCallbacks.get(index);
				return callback ? { ...proxyConfig, callback } : proxyConfig;
			},
		);
	}

	configInstance = validatedConfig;
	return validatedConfig;
}

export function getConfig(): Config {
	if (!configInstance) {
		throw new Error("Configuration has not been loaded yet.");
	}
	return configInstance;
}

// For testing purposes - reset the global config instance
export function resetConfig(): void {
	configInstance = null;
}
