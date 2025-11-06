import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Api } from "ombrage-bun-api";
import { auth } from "./lib/auth";
import { db } from "./lib/db";

console.log("Starting example API server...");

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMigrations() {
	console.info("Migrating database...");
	let retries = 10;
	while (retries > 0) {
		try {
			console.info(`Running migrations (retries left: ${retries})`);
			migrate(db, {
				migrationsFolder: "drizzle/",
			});
			console.info("Database migrated successfully.");
			return;
		} catch (error) {
			console.error(
				`Database connection failed. Retrying... (${retries} attempts left)`,
			);
			// This is the last retry, exit the process
			if (retries === 1) {
				console.error("Could not connect to the database. Exiting.");
				console.error(error);
				process.exit(1);
			}
			retries -= 1;
			await sleep(300);
		}
	}
}

await runMigrations();

// Create and start the server using the built library
const server = new Api({
	title: "Example Auth API",
	server: {
		routes: {
			dir: "./routes",
		},
	},
	proxy: {
		enabled: true,
		configs: [
			{
				pattern: "/auth/*",
				handler: async ({ request, target, params }) => {
					console.log(`[PROXY] ${request.method} ${request.url} -> ${target}`, {
						params,
						timestamp: new Date().toISOString(),
					});

					const response = await auth.handler(request);
					console.log("response", response);
					return {
						proceed: response.ok,
						response,
					};
				},
			},
		],
	},
});
server.start();
