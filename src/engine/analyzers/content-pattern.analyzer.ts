import { AnalysisResult, Finding } from "../models/analysis-result.model";

export class ContentPatternAnalyzer {
    private phishingPatterns: RegExp[];
    private brandNamesLower: string[];

    private static readonly PHISHING_KEYWORDS = [
        "login", "signin", "sign-in", "verify", "verification",
        "account", "secure", "security", "update", "confirm",
        "authenticate", "credential", "password", "suspend",
        "restrict", "unlock", "validate", "billing",
    ];

    private static readonly URGENCY_KEYWORDS = [
        "urgent", "immediately", "suspended", "limited",
        "expire", "deadline", "action-required", "act-now",
        "within-24", "within-48", "final-notice", "last-chance",
    ];

    private static readonly DANGEROUS_EXTENSIONS = [
        ".exe", ".scr", ".bat", ".cmd", ".com", ".pif",
        ".msi", ".js", ".vbs", ".wsf", ".ps1", ".hta",
        ".cpl", ".jar", ".reg", ".inf", ".lnk",
    ];

    constructor(phishingPatterns: RegExp[], brandNames: string[]) {
        this.phishingPatterns = phishingPatterns;
        this.brandNamesLower = brandNames.map((b) => b.toLowerCase());
    }

    analyze(url: URL): AnalysisResult {
        const findings: Finding[] = [];
        const fullPath = decodeURIComponent(url.pathname + url.search).toLowerCase();
        const hostname = url.hostname.toLowerCase();

        // Phishing keyword count
        const matchedKeywords = ContentPatternAnalyzer.PHISHING_KEYWORDS.filter(
            (kw) => fullPath.includes(kw),
        );
        if (matchedKeywords.length >= 3) {
            findings.push({
                rule: "multiple-phishing-keywords",
                description: `URL path contains ${matchedKeywords.length} phishing-related keywords: ${matchedKeywords.join(", ")}`,
                severity: "high",
                deduction: 40,
            });
        } else if (matchedKeywords.length === 2) {
            findings.push({
                rule: "phishing-keywords",
                description: `URL path contains phishing keywords: ${matchedKeywords.join(", ")}`,
                severity: "medium",
                deduction: 20,
            });
        }

        // Urgency keywords
        const matchedUrgency = ContentPatternAnalyzer.URGENCY_KEYWORDS.filter(
            (kw) => fullPath.includes(kw),
        );
        if (matchedUrgency.length > 0) {
            findings.push({
                rule: "urgency-keywords",
                description: `URL contains urgency language: ${matchedUrgency.join(", ")}`,
                severity: "medium",
                deduction: 15,
            });
        }

        // Dangerous file extensions
        const lastSegment = url.pathname.split("/").pop() || "";
        for (const ext of ContentPatternAnalyzer.DANGEROUS_EXTENSIONS) {
            if (lastSegment.toLowerCase().endsWith(ext)) {
                findings.push({
                    rule: "dangerous-file-type",
                    description: `URL points to a potentially dangerous file type: ${ext}`,
                    severity: "high",
                    deduction: 25,
                });
                break;
            }
        }

        // Brand name in path (but not in domain)
        for (const brand of this.brandNamesLower) {
            if (fullPath.includes(brand) && !hostname.includes(brand)) {
                findings.push({
                    rule: "brand-in-path",
                    description: `Brand name "${brand}" in URL path but not in domain — possible phishing`,
                    severity: "high",
                    deduction: 30,
                });
                break;
            }
        }

        // Bundled phishing pattern match
        const urlString = url.href.toLowerCase();
        for (const pattern of this.phishingPatterns) {
            if (pattern.test(urlString)) {
                findings.push({
                    rule: "phishing-pattern-match",
                    description: "URL matches a known phishing URL pattern",
                    severity: "high",
                    deduction: 35,
                });
                break;
            }
        }

        const totalDeduction = findings.reduce((sum, f) => sum + f.deduction, 0);
        const score = Math.max(0, Math.min(100, 100 - totalDeduction));

        return { analyzerName: "content-pattern", score, findings };
    }
}
