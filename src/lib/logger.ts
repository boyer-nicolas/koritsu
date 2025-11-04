import {
	pino,
	type Logger as PinoLogger,
	type TransportSingleOptions,
} from "pino";
import { getConfig } from "./config";

export type Logger = PinoLogger & {
	http: (request: Request, response: Response, elapsedTime: number) => void;
};

let logger: Logger;

export function getLogger() {
	const config = getConfig();
	if (logger) {
		return logger;
	}
	let transport: TransportSingleOptions | undefined = {
		target: "pino-pretty",
		options: {
			colorize: true,
		},
	};

	if (config.environment === "production") {
		transport = undefined;
	}
	logger = pino({
		level: config.server.logLevel,
		transport,
		formatters: {
			bindings: () => {
				return {};
			},
			level: (label) => {
				return { level: label.toUpperCase() };
			},
		},
		timestamp: undefined,
	}) as Logger;

	logger.http = (request: Request, response: Response, elapsedTime: number) => {
		const { method, url } = request;
		const { status } = response;
		logger.info(`${method} ${url} - ${status} - ${elapsedTime ?? 0}ms`);
	};

	return logger;
}
