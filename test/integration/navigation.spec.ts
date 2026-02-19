import { ScoringEngine } from "../../src/engine/scoring-engine";
import { DEFAULT_CONFIG } from "../../src/engine/models/config.model";
import { ScoringService } from "../../src/background/scoring.service";

// Mock performance.now for environments that don't have it
if (typeof performance === "undefined") {
    (global as any).performance = { now: () => Date.now() };
}

describe("Navigation Integration", () => {
    let scoringService: ScoringService;

    beforeEach(() => {
        const config = {
            ...DEFAULT_CONFIG,
            rules: {
                ...DEFAULT_CONFIG.rules,
                allowlist: ["kifpool.me", "*.kifpool.me"],
            },
        };

        const engine = new ScoringEngine(
            config,
            new Set(["google.com", "github.com"]),
            new Map([["xyz", 15], ["tk", 20]]),
            [/paypal.*verify/i, /account.*suspended/i],
            ["PayPal", "Google", "Microsoft", "Apple"],
            new Set(["bit.ly", "tinyurl.com", "t.co"]),
        );
        scoringService = new ScoringService(engine);
    });

    it("should allow kifpool.me via config allowlist", () => {
        const result = scoringService.scoreUrl("https://kifpool.me/dashboard");
        expect(result.overallScore).toBe(100);
        expect(result.configOverride).toBe("allowed");
    });

    it("should allow subdomain of kifpool.me via wildcard", () => {
        const result = scoringService.scoreUrl("https://app.kifpool.me/login");
        expect(result.overallScore).toBe(100);
    });

    it("should cache repeated URL lookups", () => {
        const url = "https://example.com/test";
        const first = scoringService.scoreUrl(url);
        const second = scoringService.scoreUrl(url);
        expect(second.timestamp).toBe(first.timestamp);
    });

    describe("real-world phishing URL patterns", () => {
        const phishingUrls = [
            "http://192.168.1.1/paypal/login/verify",
            "https://paypal-secure-login.tk/verify-account",
            "http://login.secure.bank.verify.example.xyz/update",
        ];

        for (const url of phishingUrls) {
            it("should score '" + url + "' below warning threshold", () => {
                const result = scoringService.scoreUrl(url);
                expect(result.overallScore).toBeLessThan(
                    DEFAULT_CONFIG.settings.warningThreshold,
                );
            });
        }
    });

    describe("legitimate URL patterns", () => {
        const safeUrls = [
            "https://google.com/search?q=typescript",
            "https://github.com/bitwarden/clients",
            "https://kifpool.me/secops/dashboard",
        ];

        for (const url of safeUrls) {
            it("should score '" + url + "' above warning threshold", () => {
                const result = scoringService.scoreUrl(url);
                expect(result.overallScore).toBeGreaterThanOrEqual(
                    DEFAULT_CONFIG.settings.warningThreshold,
                );
            });
        }
    });
});
