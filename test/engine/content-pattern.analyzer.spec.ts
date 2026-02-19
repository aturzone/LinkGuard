import { ContentPatternAnalyzer } from "../../src/engine/analyzers/content-pattern.analyzer";

describe("ContentPatternAnalyzer", () => {
    let analyzer: ContentPatternAnalyzer;

    beforeEach(() => {
        analyzer = new ContentPatternAnalyzer(
            [/paypal.*verify/i, /account.*suspended/i],
            ["PayPal", "Google", "Microsoft"],
        );
    });

    it("should detect multiple phishing keywords", () => {
        const result = analyzer.analyze(
            new URL("https://evil.com/login/verify/account/secure"),
        );
        expect(result.findings.some((f) => f.rule === "multiple-phishing-keywords")).toBe(true);
    });

    it("should detect urgency keywords", () => {
        const result = analyzer.analyze(
            new URL("https://evil.com/urgent-action-required"),
        );
        expect(result.findings.some((f) => f.rule === "urgency-keywords")).toBe(true);
    });

    it("should detect dangerous file extensions", () => {
        const result = analyzer.analyze(
            new URL("https://example.com/download/update.exe"),
        );
        expect(result.findings.some((f) => f.rule === "dangerous-file-type")).toBe(true);
    });

    it("should detect brand in path but not in domain", () => {
        const result = analyzer.analyze(
            new URL("https://evil.com/paypal/login.html"),
        );
        expect(result.findings.some((f) => f.rule === "brand-in-path")).toBe(true);
    });

    it("should match bundled phishing patterns", () => {
        const result = analyzer.analyze(
            new URL("https://evil.com/paypal-verify-your-account"),
        );
        expect(result.findings.some((f) => f.rule === "phishing-pattern-match")).toBe(true);
    });

    it("should not flag clean URLs", () => {
        const result = analyzer.analyze(new URL("https://example.com/about"));
        expect(result.score).toBe(100);
    });

    it("should detect .bat file extension", () => {
        const result = analyzer.analyze(
            new URL("https://example.com/scripts/run.bat"),
        );
        expect(result.findings.some((f) => f.rule === "dangerous-file-type")).toBe(true);
    });
});
