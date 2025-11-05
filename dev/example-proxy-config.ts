import { Api, createProxyConfig, type ProxyCallback } from "../src";

// Example authentication callback for protected routes
const authCallback: ProxyCallback = async ({ request, params, target }) => {
	const authHeader = request.headers.get("authorization");

	// Simple JWT token validation example
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return {
			proceed: false,
			response: new Response(
				JSON.stringify({
					error: "Unauthorized",
					message: "Missing or invalid authorization header",
				}),
				{
					status: 401,
					headers: { "Content-Type": "application/json" },
				},
			),
		};
	}

	const token = authHeader.substring(7);

	// Mock token validation - in real app, verify JWT signature
	if (token !== "valid-token-123") {
		return {
			proceed: false,
			response: new Response(
				JSON.stringify({ error: "Forbidden", message: "Invalid token" }),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			),
		};
	}

	// Add user info to headers for downstream service
	return {
		proceed: true,
		headers: {
			"X-User-ID": "user123",
			"X-User-Role": "admin",
		},
	};
};

// Example logging callback for API monitoring
const loggingCallback: ProxyCallback = async ({ request, params, target }) => {
	console.log(`[PROXY] ${request.method} ${request.url} -> ${target}`, {
		params,
		userAgent: request.headers.get("user-agent"),
		timestamp: new Date().toISOString(),
	});

	return { proceed: true };
};

// Example configuration with various proxy patterns
export const exampleProxyConfig = new Api({
	environment: "development",
	server: {
		port: 3000,
		logLevel: "debug",
		routes: { dir: "./dev/routes" },
	},
	proxy: {
		enabled: true,
		configs: [
			// Protected API routes with authentication
			createProxyConfig("/api/protected/*", "https://api.example.com", {
				description: "Protected API endpoints requiring authentication",
				callback: authCallback,
				timeout: 15000,
				retries: 2,
				headers: {
					"X-Proxy-Source": "ombrage-api-gateway",
				},
			}),

			// Public API routes with logging
			createProxyConfig("/api/public/*", "https://public-api.example.com", {
				description: "Public API endpoints with request logging",
				callback: loggingCallback,
				timeout: 10000,
				retries: 1,
			}),

			// User-specific routes with parameter extraction
			createProxyConfig(
				"/users/*/profile",
				"https://user-service.example.com",
				{
					description: "User profile service",
					callback: async ({ request, params, target }) => {
						// params.param0 contains the user ID from the wildcard
						const userId = params.param0;

						// Validate user ID format
						if (!userId || !/^\d+$/.test(userId)) {
							return {
								proceed: false,
								response: new Response(
									JSON.stringify({ error: "Invalid user ID format" }),
									{
										status: 400,
										headers: { "Content-Type": "application/json" },
									},
								),
							};
						}

						return {
							proceed: true,
							headers: {
								"X-User-ID": userId,
							},
						};
					},
				},
			),

			// Multiple wildcards for complex routing
			createProxyConfig(
				"/tenants/*/services/*/data",
				"https://multi-tenant-service.example.com",
				{
					description: "Multi-tenant service routing",
					callback: async ({ request, params, target }) => {
						const tenantId = params.param0;
						const serviceId = params.param1;

						// Route to different targets based on tenant
						let finalTarget = target;
						if (tenantId === "premium") {
							finalTarget = "https://premium-service.example.com";
						}

						return {
							proceed: true,
							target: finalTarget,
							headers: {
								"X-Tenant-ID": tenantId || "",
								"X-Service-ID": serviceId || "",
							},
						};
					},
				},
			),

			// Simple proxy without callback
			createProxyConfig("/legacy/*", "https://legacy-api.example.com", {
				description: "Legacy API passthrough",
				timeout: 30000,
				retries: 3,
			}),
		],
	},
	title: "Proxy Example API",
	description:
		"API demonstrating proxy capabilities with wildcards and callbacks",
});

// Example of how to start the server
if (import.meta.main) {
	console.log("Starting proxy example server...");
	console.log("Try these endpoints:");
	console.log(
		"- GET /api/protected/users (requires 'Authorization: Bearer valid-token-123')",
	);
	console.log("- GET /api/public/status (logs request and proxies)");
	console.log("- GET /users/123/profile (validates user ID)");
	console.log(
		"- GET /tenants/premium/services/auth/data (multi-wildcard routing)",
	);
	console.log("- GET /legacy/some/endpoint (simple passthrough)");

	await exampleProxyConfig.start();
}
