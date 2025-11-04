import { Api } from "ombrage-bun-api";

console.log("Starting example API server...");

// Create and start the server using the built library
const server = new Api({
	server: {
		routesDir: "./routes",
	},
	title: "Example API Server",
});
server.start();
