import Bun from "bun";
import { z } from "zod";

export const ConfigSchema = z.object({
	server: z.object({
		port: z.number().min(1).max(65535).default(8080),
		host: z.string().default("0.0.0.0"),
		logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
	}),
	swagger: z.object({
		enabled: z.boolean().default(true),
		path: z.string().default("/"),
	}),
	title: z.string().default("My API"),
	description: z
		.string()
		.default("Auto-generated API documentation from route specifications"),
	auth: z.object({
		enabled: z.boolean().default(false),
		secret: z.string().min(10).default("changeme"),
	}),
	environment: z
		.enum(["development", "production", "test"])
		.default("development"),
});

export type Config = z.infer<typeof ConfigSchema>;

// biome-ignore lint/complexity/noStaticOnlyClass: Exceptional for config
export class AppConfig {
	private static instance: Config;

	private static validateConfig(config: Partial<Config>): Config {
		const result = ConfigSchema.safeParse(config);
		if (!result.success) {
			console.error("Configuration validation error:", result.error.format());
			throw new Error("Invalid configuration");
		}
		return result.data;
	}

	static load(): void {
		const rawConfig: Config = {
			server: {
				port: Bun.env.PORT,
				host: Bun.env.HOST,
				logLevel: Bun.env.LOG_LEVEL,
			},
			swagger: {
				enabled: Bun.env.SWAGGER_ENABLED,
				path: Bun.env.SWAGGER_PATH,
			},
			auth: {
				enabled: Bun.env.AUTH_ENABLED,
				secret: Bun.env.AUTH_SECRET,
			},
			title: Bun.env.API_TITLE,
			description: Bun.env.API_DESCRIPTION,
			environment: Bun.env.ENVIRONMENT,
		};

		// Let Zod parse and apply defaults for any missing values
		AppConfig.instance = AppConfig.validateConfig(rawConfig);
	}

	static get(): Config {
		if (!AppConfig.instance) {
			throw new Error("Config not loaded. Call AppConfig.load() first.");
		}
		return AppConfig.instance;
	}
}

// Load configuration at module initialization
AppConfig.load();
