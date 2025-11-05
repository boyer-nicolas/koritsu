import { describe, expect, test } from "bun:test";
import { Api, createProxyConfig, type ProxyCallback } from "../../src";

describe("Proxy Config Callback Preservation", () => {
	test("should preserve callbacks during config validation", () => {
		const testCallback: ProxyCallback = async () => {
			return { proceed: false };
		};

		const api = new Api({
			environment: "test",
			server: {
				port: 0,
				routes: { dir: "./tests/fixtures/routes" },
			},
			proxy: {
				enabled: true,
				configs: [
					createProxyConfig("/test/*", "https://example.com", {
						callback: testCallback,
					}),
				],
			},
		});

		// Check that the callback is preserved in the config
		expect(api.config.proxy?.enabled).toBe(true);
		expect(api.config.proxy?.configs).toHaveLength(1);
		expect(api.config.proxy?.configs?.[0]?.callback).toBe(testCallback);
	});
});
