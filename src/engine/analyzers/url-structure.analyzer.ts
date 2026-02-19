import { AnalysisResult, Finding } from "../models/analysis-result.model";

export class UrlStructureAnalyzer {
    private shorteners: Set<string>;

    constructor(shorteners: Set<string>) {
        this.shorteners = shorteners;
    }

    analyze(url: URL): AnalysisResult {
        const findings: Finding[] = [];
        const fullUrl = url.href;

        // URL length
        if (fullUrl.length > 200) {
            const deduction = fullUrl.length > 500 ? 20 : 10;
            findings.push({
                rule: "excessive-url-length",
                description: `URL is ${fullUrl.length} characters long`,
                severity: fullUrl.length > 500 ? "high" : "medium",
                deduction,
            });
        }

        // @ symbol credential attack (user:pass@host)
        const userInfo = url.username || url.href.split("//")[1]?.split("@")[0];
        if (url.href.includes("@") && url.href.indexOf("@") < url.href.indexOf(url.hostname)) {
            findings.push({
                rule: "at-symbol-in-url",
                description: "URL contains @ symbol before hostname — possible credential phishing trick",
                severity: "critical",
                deduction: 40,
            });
        }

        // URL shortener
        if (this.shorteners.has(url.hostname.toLowerCase())) {
            findings.push({
                rule: "url-shortener",
                description: `URL uses shortener service ${url.hostname} — destination is hidden`,
                severity: "medium",
                deduction: 20,
            });
        }

        // Double encoding (%25xx)
        if (/%25[0-9a-fA-F]{2}/.test(fullUrl)) {
            findings.push({
                rule: "double-encoding",
                description: "URL contains double-encoded characters — possible obfuscation",
                severity: "high",
                deduction: 25,
            });
        }

        // Special character density
        const specialChars = (fullUrl.match(/[%&=\+\?#@!]/g) || []).length;
        const charDensity = specialChars / fullUrl.length;
        if (charDensity > 0.15) {
            findings.push({
                rule: "high-special-char-density",
                description: `URL has high density of special characters (${(charDensity * 100).toFixed(1)}%)`,
                severity: "medium",
                deduction: 15,
            });
        }

        // Path depth
        const pathSegments = url.pathname.split("/").filter((s) => s.length > 0);
        if (pathSegments.length > 7) {
            findings.push({
                rule: "deep-path",
                description: `URL path has ${pathSegments.length} segments — unusually deep`,
                severity: "low",
                deduction: 10,
            });
        }

        // Base64 in query params
        const params = url.searchParams;
        for (const [key, value] of params) {
            if (this.isLikelyBase64(value) && value.length > 20) {
                findings.push({
                    rule: "base64-in-params",
                    description: `Query parameter "${key}" contains likely base64-encoded data`,
                    severity: "medium",
                    deduction: 15,
                });
                break;
            }
        }

        // Excessive query parameters
        const paramCount = Array.from(params.keys()).length;
        if (paramCount > 10) {
            findings.push({
                rule: "excessive-params",
                description: `URL has ${paramCount} query parameters`,
                severity: "low",
                deduction: 8,
            });
        }

        // Data URI
        if (url.protocol === "data:") {
            findings.push({
                rule: "data-uri",
                description: "Data URIs can contain embedded malicious content",
                severity: "critical",
                deduction: 50,
            });
        }

        // JavaScript URI
        if (url.protocol === "javascript:") {
            findings.push({
                rule: "javascript-uri",
                description: "JavaScript URIs execute arbitrary code",
                severity: "critical",
                deduction: 60,
            });
        }

        const totalDeduction = findings.reduce((sum, f) => sum + f.deduction, 0);
        const score = Math.max(0, Math.min(100, 100 - totalDeduction));

        return { analyzerName: "url-structure", score, findings };
    }

    private isLikelyBase64(str: string): boolean {
        if (str.length < 20) return false;
        // Base64 pattern: alphanumeric + /+ with optional = padding
        return /^[A-Za-z0-9+/]+=*$/.test(str) && str.length % 4 <= 1;
    }
}
