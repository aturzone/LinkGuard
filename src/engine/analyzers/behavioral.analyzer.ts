import { AnalysisResult, Finding } from "../models/analysis-result.model";

export class BehavioralAnalyzer {
    private static readonly REDIRECT_PARAMS = [
        "url", "redirect", "redirect_uri", "redirect_url",
        "return", "returnUrl", "return_url", "returnTo",
        "next", "goto", "dest", "destination", "target",
        "continue", "rurl", "link", "forward",
    ];

    analyze(url: URL, rawUrl?: string): AnalysisResult {
        const findings: Finding[] = [];
        const urlString = rawUrl || url.href;

        // Open redirect detection
        for (const param of BehavioralAnalyzer.REDIRECT_PARAMS) {
            const value = url.searchParams.get(param);
            if (value) {
                // Check if the redirect value contains a URL
                try {
                    const redirectTarget = decodeURIComponent(value);
                    if (/^https?:\/\//.test(redirectTarget) || /^\/\//.test(redirectTarget)) {
                        findings.push({
                            rule: "open-redirect",
                            description: `Parameter "${param}" contains a redirect URL — may be used for phishing`,
                            severity: "high",
                            deduction: 20,
                        });
                        break;
                    }
                } catch {
                    // Decoding failed — might be obfuscated
                    if (value.includes("http") || value.includes("%2F%2F")) {
                        findings.push({
                            rule: "encoded-open-redirect",
                            description: `Parameter "${param}" contains an encoded redirect — possible obfuscation`,
                            severity: "high",
                            deduction: 25,
                        });
                        break;
                    }
                }
            }
        }

        // Long query string (data exfiltration indicator)
        const queryLength = url.search.length;
        if (queryLength > 500) {
            findings.push({
                rule: "long-query-string",
                description: `Query string is ${queryLength} characters — possible data exfiltration`,
                severity: "medium",
                deduction: 15,
            });
        }

        // High-entropy subdomain (DGA / tracking)
        const parts = url.hostname.split(".");
        if (parts.length > 2) {
            const subdomain = parts[0];
            if (subdomain.length > 8) {
                const entropy = this.shannonEntropy(subdomain);
                const isMixedAlphaNum = /[a-z]/.test(subdomain) && /[0-9]/.test(subdomain);
                const threshold = isMixedAlphaNum ? 3.5 : 4.0;
                if (entropy > threshold) {
                    findings.push({
                        rule: "high-entropy-subdomain",
                        description: `Subdomain "${subdomain}" has high entropy (${entropy.toFixed(2)}) — may be auto-generated`,
                        severity: "medium",
                        deduction: 15,
                    });
                }
            }
        }

        // Bidirectional override characters
        const bidiChars = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/;
        if (bidiChars.test(urlString)) {
            findings.push({
                rule: "bidi-override",
                description: "URL contains bidirectional text override characters — may disguise true URL",
                severity: "critical",
                deduction: 40,
            });
        }

        // Null bytes or control characters
        const controlChars = /[\x00-\x1F\x7F]/;
        if (controlChars.test(urlString)) {
            findings.push({
                rule: "control-characters",
                description: "URL contains control characters — possible injection attempt",
                severity: "high",
                deduction: 30,
            });
        }

        // Fragment-based payload (hash with script-like content)
        if (url.hash && url.hash.length > 1) {
            const fragment = url.hash.substring(1).toLowerCase();
            if (
                fragment.includes("javascript:") ||
                fragment.includes("<script") ||
                fragment.includes("onerror=")
            ) {
                findings.push({
                    rule: "suspicious-fragment",
                    description: "URL fragment contains script-like content",
                    severity: "high",
                    deduction: 30,
                });
            }
        }

        const totalDeduction = findings.reduce((sum, f) => sum + f.deduction, 0);
        const score = Math.max(0, Math.min(100, 100 - totalDeduction));

        return { analyzerName: "behavioral", score, findings };
    }

    private shannonEntropy(str: string): number {
        if (str.length === 0) return 0;
        const freq = new Map<string, number>();
        for (const ch of str) {
            freq.set(ch, (freq.get(ch) || 0) + 1);
        }
        let entropy = 0;
        const len = str.length;
        for (const count of freq.values()) {
            const p = count / len;
            if (p > 0) {
                entropy -= p * Math.log2(p);
            }
        }
        return entropy;
    }
}
