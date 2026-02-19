import { UrlStructureAnalyzer } from "../../src/engine/analyzers/url-structure.analyzer";

describe("UrlStructureAnalyzer", () => {
    let analyzer: UrlStructureAnalyzer;

    beforeEach(() => {
        analyzer = new UrlStructureAnalyzer(
            new Set(["bit.ly", "tinyurl.com", "t.co"]),
        );
    });

    it("should score short clean URLs at 100", () => {
        const result = analyzer.analyze(new URL("https://example.com/about"));
        expect(result.score).toBe(100);
    });

    it("should penalize very long URLs", () => {
        const longPath = "a".repeat(250);
        const result = analyzer.analyze(new URL("https://example.com/" + longPath));
        expect(result.findings.some((f) => f.rule === "excessive-url-length")).toBe(true);
    });

    it("should detect URL shorteners", () => {
        const result = analyzer.analyze(new URL("https://bit.ly/abc123"));
        expect(result.findings.some((f) => f.rule === "url-shortener")).toBe(true);
    });

    it("should detect double encoding", () => {
        const result = analyzer.analyze(
            new URL("https://example.com/page?q=%252Fetc%252Fpasswd"),
        );
        expect(result.findings.some((f) => f.rule === "double-encoding")).toBe(true);
    });

    it("should detect base64 in query params", () => {
        const b64 = btoa("some-suspicious-payload-data");
        const result = analyzer.analyze(
            new URL("https://example.com/track?data=" + b64),
        );
        expect(result.findings.some((f) => f.rule === "base64-in-params")).toBe(true);
    });

    it("should detect deep paths", () => {
        const result = analyzer.analyze(
            new URL("https://example.com/a/b/c/d/e/f/g/h/page"),
        );
        expect(result.findings.some((f) => f.rule === "deep-path")).toBe(true);
    });

    it("should detect excessive query parameters", () => {
        let params = "";
        for (let i = 0; i < 12; i++) {
            params += (i === 0 ? "?" : "&") + "p" + i + "=v" + i;
        }
        const result = analyzer.analyze(new URL("https://example.com/page" + params));
        expect(result.findings.some((f) => f.rule === "excessive-params")).toBe(true);
    });
});
