import { DomainAnalyzer } from "./analyzers/domain.analyzer";
import { UrlStructureAnalyzer } from "./analyzers/url-structure.analyzer";
import { ProtocolAnalyzer } from "./analyzers/protocol.analyzer";
import { ContentPatternAnalyzer } from "./analyzers/content-pattern.analyzer";
import { BehavioralAnalyzer } from "./analyzers/behavioral.analyzer";
import { SafetyScore, CategoryScore } from "./models/safety-score.model";
import { AnalysisResult } from "./models/analysis-result.model";
import { LinkGuardConfig } from "./models/config.model";

interface AnalyzerEntry {
    name: string;
    weight: number;
    analyze: (url: URL, raw?: string) => AnalysisResult;
}

export class ScoringEngine {
    private analyzers: AnalyzerEntry[];
    private config: LinkGuardConfig;
    private allowlistPatterns: RegExp[];
    private blocklistPatterns: RegExp[];

    constructor(
        config: LinkGuardConfig,
        safeDomains: Set<string>,
        suspiciousTlds: Map<string, number>,
        phishingPatterns: RegExp[],
        brandNames: string[],
        shorteners: Set<string>,
    ) {
        this.config = config;

        const domainAnalyzer = new DomainAnalyzer(safeDomains, suspiciousTlds, brandNames);
        const urlStructureAnalyzer = new UrlStructureAnalyzer(shorteners);
        const protocolAnalyzer = new ProtocolAnalyzer();
        const contentPatternAnalyzer = new ContentPatternAnalyzer(phishingPatterns, brandNames);
        const behavioralAnalyzer = new BehavioralAnalyzer();

        this.analyzers = [
            { name: "Domain", weight: 0.25, analyze: (url) => domainAnalyzer.analyze(url) },
            { name: "URL Structure", weight: 0.25, analyze: (url) => urlStructureAnalyzer.analyze(url) },
            { name: "Protocol", weight: 0.20, analyze: (url) => protocolAnalyzer.analyze(url) },
            { name: "Content Pattern", weight: 0.15, analyze: (url) => contentPatternAnalyzer.analyze(url) },
            { name: "Behavioral", weight: 0.15, analyze: (url, raw) => behavioralAnalyzer.analyze(url, raw) },
        ];

        this.allowlistPatterns = this.compileGlobPatterns(config.rules.allowlist);
        this.blocklistPatterns = this.compileGlobPatterns(config.rules.blocklist);
    }

    analyze(rawUrl: string): SafetyScore {
        const startTime = performance.now();

        let url: URL;
        try {
            url = new URL(rawUrl);
        } catch {
            return this.createErrorScore(rawUrl, startTime);
        }

        const hostname = url.hostname.toLowerCase();

        // Config allowlist override
        if (this.matchesPatterns(hostname, this.allowlistPatterns)) {
            return {
                url: rawUrl,
                overallScore: 100,
                categories: [],
                timestamp: Date.now(),
                analysisTimeMs: performance.now() - startTime,
                configOverride: "allowed",
            };
        }

        // Config blocklist override
        if (this.matchesPatterns(hostname, this.blocklistPatterns)) {
            return {
                url: rawUrl,
                overallScore: 0,
                categories: [],
                timestamp: Date.now(),
                analysisTimeMs: performance.now() - startTime,
                configOverride: "blocked",
            };
        }

        // Custom pattern rules
        for (const rule of this.config.rules.customPatterns) {
            try {
                const regex = new RegExp(rule.pattern, "i");
                if (regex.test(rawUrl)) {
                    if (rule.action === "allow") {
                        return {
                            url: rawUrl,
                            overallScore: 100,
                            categories: [],
                            timestamp: Date.now(),
                            analysisTimeMs: performance.now() - startTime,
                            configOverride: "allowed",
                        };
                    } else if (rule.action === "block") {
                        return {
                            url: rawUrl,
                            overallScore: 0,
                            categories: [],
                            timestamp: Date.now(),
                            analysisTimeMs: performance.now() - startTime,
                            configOverride: "blocked",
                        };
                    }
                    // "warn" action falls through to normal analysis
                }
            } catch {
                // Skip invalid regex patterns
            }
        }

        // Run all analyzers
        const categories: CategoryScore[] = [];
        let weightedSum = 0;

        for (const entry of this.analyzers) {
            const result = entry.analyze(url, rawUrl);
            const category: CategoryScore = {
                name: entry.name,
                weight: entry.weight,
                score: result.score,
                findings: result.findings,
            };
            categories.push(category);
            weightedSum += result.score * entry.weight;
        }

        const overallScore = Math.max(0, Math.min(100, Math.round(weightedSum)));

        return {
            url: rawUrl,
            overallScore,
            categories,
            timestamp: Date.now(),
            analysisTimeMs: performance.now() - startTime,
        };
    }

    updateConfig(config: LinkGuardConfig): void {
        this.config = config;
        this.allowlistPatterns = this.compileGlobPatterns(config.rules.allowlist);
        this.blocklistPatterns = this.compileGlobPatterns(config.rules.blocklist);
    }

    private createErrorScore(rawUrl: string, startTime: number): SafetyScore {
        return {
            url: rawUrl,
            overallScore: 0,
            categories: [{
                name: "Parse Error",
                weight: 1,
                score: 0,
                findings: [{
                    rule: "invalid-url",
                    description: "URL could not be parsed — possibly malformed or malicious",
                    severity: "critical",
                    deduction: 100,
                }],
            }],
            timestamp: Date.now(),
            analysisTimeMs: performance.now() - startTime,
        };
    }

    private compileGlobPatterns(patterns: string[]): RegExp[] {
        return patterns.map((pattern) => {
            // Convert glob pattern to regex: *.example.com -> .*\.example\.com
            const escaped = pattern
                .replace(/[.+^${}()|[\]\\]/g, "\\$&")
                .replace(/\*/g, ".*");
            return new RegExp(`^${escaped}$`, "i");
        });
    }

    private matchesPatterns(hostname: string, patterns: RegExp[]): boolean {
        return patterns.some((p) => p.test(hostname));
    }
}
