import { DomainAnalyzer } from "../../src/engine/analyzers/domain.analyzer";

describe("DomainAnalyzer", () => {
    let analyzer: DomainAnalyzer;

    beforeEach(() => {
        analyzer = new DomainAnalyzer(
            new Set(["google.com", "paypal.com", "kifpool.me"]),
            new Map([["xyz", 15], ["tk", 20], ["ml", 22]]),
            ["PayPal", "Google", "Microsoft"],
        );
    });

    it("should return score 100 for known safe domains", () => {
        const result = analyzer.analyze(new URL("https://google.com/search"));
        expect(result.score).toBe(100);
        expect(result.findings).toHaveLength(0);
    });

    it("should return score 100 for subdomains of safe domains", () => {
        const result = analyzer.analyze(new URL("https://maps.google.com/directions"));
        expect(result.score).toBe(100);
    });

    it("should detect punycode domains", () => {
        const result = analyzer.analyze(new URL("https://xn--pypal-4ve.com/login"));
        expect(result.findings.some((f) => f.rule === "homograph-punycode")).toBe(true);
        expect(result.score).toBeLessThan(65);
    });

    it("should detect IP-based URLs (IPv4)", () => {
        const result = analyzer.analyze(new URL("http://192.168.1.1/admin"));
        expect(result.findings.some((f) => f.rule === "ip-based-url")).toBe(true);
    });

    it("should penalize excessive subdomain depth", () => {
        const result = analyzer.analyze(
            new URL("https://login.secure.bank.verify.example.com/page"),
        );
        expect(result.findings.some((f) => f.rule === "excessive-subdomains")).toBe(true);
    });

    it("should detect brand names in subdomains", () => {
        const result = analyzer.analyze(new URL("https://paypal.evil-site.com/login"));
        expect(result.findings.some((f) => f.rule === "brand-in-subdomain")).toBe(true);
    });

    it("should detect brand impersonation with separators", () => {
        const result = analyzer.analyze(new URL("https://paypal-secure.tk/verify"));
        expect(result.findings.some((f) => f.rule === "brand-impersonation")).toBe(true);
    });

    it("should boost score for .gov and .edu domains", () => {
        const result = analyzer.analyze(new URL("https://whitehouse.gov/info"));
        expect(result.findings.some((f) => f.rule === "trusted-tld")).toBe(true);
    });

    it("should detect suspicious TLDs", () => {
        const result = analyzer.analyze(new URL("https://random-site.xyz/page"));
        expect(result.findings.some((f) => f.rule === "suspicious-tld")).toBe(true);
    });

    it("should detect high-entropy DGA-like domains", () => {
        const result = analyzer.analyze(
            new URL("https://xk4m9qz2plf8v.com/page"),
        );
        expect(result.findings.some((f) =>
            f.rule === "high-entropy-domain" || f.rule === "very-high-entropy-domain",
        )).toBe(true);
    });

    it("should handle two-part TLDs correctly", () => {
        const result = analyzer.analyze(new URL("https://example.co.uk/page"));
        expect(result.findings.some((f) => f.rule === "excessive-subdomains")).toBe(false);
    });

    it("should detect kifpool.me as safe", () => {
        const result = analyzer.analyze(new URL("https://kifpool.me/dashboard"));
        expect(result.score).toBe(100);
    });
});
