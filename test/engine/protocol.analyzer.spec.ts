import { ProtocolAnalyzer } from "../../src/engine/analyzers/protocol.analyzer";

describe("ProtocolAnalyzer", () => {
    let analyzer: ProtocolAnalyzer;

    beforeEach(() => {
        analyzer = new ProtocolAnalyzer();
    });

    it("should give full score to HTTPS URLs", () => {
        const result = analyzer.analyze(new URL("https://example.com"));
        expect(result.score).toBe(100);
    });

    it("should penalize HTTP URLs", () => {
        const result = analyzer.analyze(new URL("http://example.com"));
        expect(result.findings.some((f) => f.rule === "no-https")).toBe(true);
        expect(result.score).toBe(60);
    });

    it("should penalize non-standard ports", () => {
        const result = analyzer.analyze(new URL("https://example.com:8888/api"));
        expect(result.findings.some((f) => f.rule === "non-standard-port")).toBe(true);
    });

    it("should not penalize standard ports", () => {
        const result = analyzer.analyze(new URL("https://example.com:443/page"));
        expect(result.findings.some((f) => f.rule === "non-standard-port")).toBe(false);
    });

    it("should penalize FTP protocol", () => {
        const result = analyzer.analyze(new URL("ftp://files.example.com/pub"));
        expect(result.findings.some((f) => f.rule === "ftp-protocol")).toBe(true);
    });

    it("should detect blob protocol", () => {
        const result = analyzer.analyze(new URL("blob:https://example.com/uuid"));
        expect(result.findings.some((f) => f.rule === "blob-protocol")).toBe(true);
    });
});
