import { ScoringEngine } from "../../src/engine/scoring-engine";
import { DEFAULT_CONFIG } from "../../src/engine/models/config.model";

describe("ScoringEngine", () => {
    let engine: ScoringEngine;

    beforeEach(() => {
        engine = new ScoringEngine(
            DEFAULT_CONFIG,
            new Set(["google.com", "github.com", "kifpool.me"]),
            new Map([["xyz", 15], ["tk", 20]]),
            [/paypal.*verify/i, /account.*suspended/i],
            ["PayPal", "Google", "Microsoft", "Apple"],
            new Set(["bit.ly", "tinyurl.com", "t.co"]),
        );
    });

    it("should score safe URLs highly", () => {
        const result = engine.analyze("https://google.com/search?q=test");
        expect(result.overallScore).toBeGreaterThanOrEqual(80);
    });

    it("should score phishing URLs below warning threshold", () => {
        const result = engine.analyze("http://192.168.1.1/paypal/login/verify");
        expect(result.overallScore).toBeLessThan(DEFAULT_CONFIG.settings.warningThreshold);
    });

    it("should return categories with scores", () => {
        const result = engine.analyze("https://example.com/page");
        expect(result.categories.length).toBe(5);
        expect(result.categories[0].name).toBe("Domain");
    });

    it("should include timestamp and analysis time", () => {
        const result = engine.analyze("https://example.com");
        expect(result.timestamp).toBeGreaterThan(0);
        expect(result.analysisTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should complete analysis in under 10ms", () => {
        const result = engine.analyze("https://example.com/page?q=hello");
        expect(result.analysisTimeMs).toBeLessThan(10);
    });

    it("should handle invalid URLs gracefully", () => {
        const result = engine.analyze("not-a-valid-url");
        expect(result.overallScore).toBe(0);
    });

    it("should apply config allowlist override", () => {
        const config = {
            ...DEFAULT_CONFIG,
            rules: { ...DEFAULT_CONFIG.rules, allowlist: ["trusted.com"] },
        };
        const customEngine = new ScoringEngine(
            config,
            new Set(["google.com"]),
            new Map(),
            [],
            [],
            new Set(),
        );
        const result = customEngine.analyze("https://trusted.com/anything");
        expect(result.overallScore).toBe(100);
        expect(result.configOverride).toBe("allowed");
    });

    it("should apply config blocklist override", () => {
        const config = {
            ...DEFAULT_CONFIG,
            rules: { ...DEFAULT_CONFIG.rules, blocklist: ["evil.com"] },
        };
        const customEngine = new ScoringEngine(
            config,
            new Set(),
            new Map(),
            [],
            [],
            new Set(),
        );
        const result = customEngine.analyze("https://evil.com/page");
        expect(result.overallScore).toBe(0);
        expect(result.configOverride).toBe("blocked");
    });

    it("should support wildcard allowlist", () => {
        const config = {
            ...DEFAULT_CONFIG,
            rules: { ...DEFAULT_CONFIG.rules, allowlist: ["*.kifpool.me"] },
        };
        const customEngine = new ScoringEngine(
            config,
            new Set(),
            new Map(),
            [],
            [],
            new Set(),
        );
        const result = customEngine.analyze("https://app.kifpool.me/dashboard");
        expect(result.overallScore).toBe(100);
        expect(result.configOverride).toBe("allowed");
    });

    it("should detect combined threats and score below warning threshold", () => {
        // IP + HTTP + phishing keywords + brand impersonation
        const result = engine.analyze("http://192.168.1.1/paypal-verify-account/login");
        expect(result.overallScore).toBeLessThan(DEFAULT_CONFIG.settings.warningThreshold);
    });
});
