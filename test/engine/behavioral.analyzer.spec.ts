import { BehavioralAnalyzer } from "../../src/engine/analyzers/behavioral.analyzer";

describe("BehavioralAnalyzer", () => {
    let analyzer: BehavioralAnalyzer;

    beforeEach(() => {
        analyzer = new BehavioralAnalyzer();
    });

    it("should detect open redirect parameters", () => {
        const result = analyzer.analyze(
            new URL("https://example.com/redirect?url=https://evil.com/phish"),
        );
        expect(result.findings.some((f) => f.rule === "open-redirect")).toBe(true);
    });

    it("should detect encoded open redirects", () => {
        const encoded = encodeURIComponent("https://evil.com/steal");
        const result = analyzer.analyze(
            new URL("https://example.com/go?returnUrl=" + encoded),
        );
        expect(result.findings.some((f) =>
            f.rule === "open-redirect" || f.rule === "encoded-open-redirect",
        )).toBe(true);
    });

    it("should flag very long query strings", () => {
        const longParam = "x".repeat(600);
        const result = analyzer.analyze(
            new URL("https://example.com/track?data=" + longParam),
        );
        expect(result.findings.some((f) => f.rule === "long-query-string")).toBe(true);
    });

    it("should detect high-entropy subdomains", () => {
        const result = analyzer.analyze(
            new URL("https://a8x2k4mq9z7p3.example.com/page"),
        );
        expect(result.findings.some((f) => f.rule === "high-entropy-subdomain")).toBe(true);
    });

    it("should score clean URLs at 100", () => {
        const result = analyzer.analyze(
            new URL("https://example.com/about"),
        );
        expect(result.score).toBe(100);
    });

    it("should detect suspicious fragments", () => {
        const result = analyzer.analyze(
            new URL("https://example.com/page#javascript:alert(1)"),
        );
        expect(result.findings.some((f) => f.rule === "suspicious-fragment")).toBe(true);
    });
});
