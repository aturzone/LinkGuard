import { AnalysisResult, Finding } from "../models/analysis-result.model";

export class DomainAnalyzer {
    private safeDomains: Set<string>;
    private suspiciousTlds: Map<string, number>;
    private brandNames: string[];
    private brandNamesLower: string[];

    constructor(
        safeDomains: Set<string>,
        suspiciousTlds: Map<string, number>,
        brandNames: string[],
    ) {
        this.safeDomains = safeDomains;
        this.suspiciousTlds = suspiciousTlds;
        this.brandNames = brandNames;
        this.brandNamesLower = brandNames.map((b) => b.toLowerCase());
    }

    analyze(url: URL): AnalysisResult {
        const findings: Finding[] = [];
        const hostname = url.hostname.toLowerCase();

        // Check safe domains first
        if (this.isSafeDomain(hostname)) {
            return { analyzerName: "domain", score: 100, findings: [] };
        }

        // IP-based URL check
        if (this.isIpAddress(hostname)) {
            findings.push({
                rule: "ip-based-url",
                description: "URL uses an IP address instead of a domain name",
                severity: "high",
                deduction: 50,
            });
        }

        // Punycode / homograph detection
        if (hostname.startsWith("xn--") || this.containsHomoglyphs(hostname)) {
            findings.push({
                rule: "homograph-punycode",
                description: "Domain uses internationalized characters that may impersonate a legitimate domain",
                severity: "high",
                deduction: 40,
            });
        }

        // Subdomain depth
        const parts = hostname.split(".");
        const subdomainDepth = this.getSubdomainDepth(parts);
        if (subdomainDepth > 3) {
            findings.push({
                rule: "excessive-subdomains",
                description: `Domain has ${subdomainDepth} subdomain levels (suspicious depth)`,
                severity: "medium",
                deduction: 25,
            });
        } else if (subdomainDepth > 2) {
            findings.push({
                rule: "deep-subdomains",
                description: `Domain has ${subdomainDepth} subdomain levels`,
                severity: "low",
                deduction: 8,
            });
        }

        // Suspicious TLD check
        const tld = this.extractTld(parts);
        const tldPenalty = this.suspiciousTlds.get(tld);
        if (tldPenalty) {
            findings.push({
                rule: "suspicious-tld",
                description: `TLD .${tld} is frequently associated with abuse`,
                severity: "medium",
                deduction: tldPenalty,
            });
        }

        // Trusted TLD boost
        if (["gov", "edu", "mil", "int"].includes(tld)) {
            findings.push({
                rule: "trusted-tld",
                description: `TLD .${tld} is a trusted institutional domain`,
                severity: "info",
                deduction: -15,
            });
        }

        // Brand in subdomain (brand.evil.com)
        const baseDomain = this.extractBaseDomain(parts);
        const subdomains = this.extractSubdomains(parts);

        // Phishing keywords in subdomains
        const phishingSubWords = ["login", "signin", "secure", "verify", "account", "update", "confirm", "bank", "auth"];
        const matchedSubWords = subdomains.filter((sub) =>
            phishingSubWords.some((word) => sub.includes(word)),
        );
        if (matchedSubWords.length >= 2) {
            findings.push({
                rule: "phishing-subdomains",
                description: `Subdomains contain suspicious keywords: ${matchedSubWords.join(".")}`,
                severity: "high",
                deduction: 30,
            });
        }

        for (const brand of this.brandNamesLower) {
            for (const sub of subdomains) {
                if (sub.includes(brand) && !this.isSafeDomain(hostname)) {
                    findings.push({
                        rule: "brand-in-subdomain",
                        description: `Brand name "${brand}" found in subdomain — possible impersonation`,
                        severity: "high",
                        deduction: 30,
                    });
                    break;
                }
            }

            // Brand impersonation with separators (paypal-secure.tk)
            const domainWithoutTld = baseDomain.split(".")[0] || "";
            if (
                domainWithoutTld.includes(brand) &&
                domainWithoutTld !== brand &&
                !this.isSafeDomain(hostname)
            ) {
                findings.push({
                    rule: "brand-impersonation",
                    description: `Domain name contains brand "${brand}" with extra characters — possible impersonation`,
                    severity: "high",
                    deduction: 35,
                });
                break;
            }
        }

        // Shannon entropy (DGA detection)
        const domainLabel = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        const entropy = this.shannonEntropy(domainLabel);
        const isMixedAlphaNum = /[a-z]/.test(domainLabel) && /[0-9]/.test(domainLabel);
        // Lower threshold for mixed alphanumeric labels (common DGA pattern)
        const highThreshold = isMixedAlphaNum && domainLabel.length > 10 ? 3.5 : 4.0;
        const veryHighThreshold = isMixedAlphaNum && domainLabel.length > 10 ? 4.0 : 4.2;
        if (entropy > veryHighThreshold) {
            findings.push({
                rule: "very-high-entropy-domain",
                description: `Domain label "${domainLabel}" has very high entropy (${entropy.toFixed(2)}) — may be algorithmically generated`,
                severity: "high",
                deduction: 25,
            });
        } else if (entropy > highThreshold) {
            findings.push({
                rule: "high-entropy-domain",
                description: `Domain label "${domainLabel}" has high entropy (${entropy.toFixed(2)})`,
                severity: "medium",
                deduction: 15,
            });
        }

        // Subdomain entropy
        for (const sub of subdomains) {
            const subEntropy = this.shannonEntropy(sub);
            if (subEntropy > 4.0 && sub.length > 8) {
                findings.push({
                    rule: "high-entropy-subdomain",
                    description: `Subdomain "${sub}" has high entropy — possible DGA`,
                    severity: "medium",
                    deduction: 15,
                });
                break;
            }
        }

        const totalDeduction = findings.reduce((sum, f) => sum + f.deduction, 0);
        const score = Math.max(0, Math.min(100, 100 - totalDeduction));

        return { analyzerName: "domain", score, findings };
    }

    private isSafeDomain(hostname: string): boolean {
        if (this.safeDomains.has(hostname)) return true;
        // Check parent domains (e.g., maps.google.com -> google.com)
        const parts = hostname.split(".");
        for (let i = 1; i < parts.length - 1; i++) {
            const parent = parts.slice(i).join(".");
            if (this.safeDomains.has(parent)) return true;
        }
        return false;
    }

    private isIpAddress(hostname: string): boolean {
        // IPv4
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
        // IPv6
        if (/^\[?[0-9a-f:]+\]?$/i.test(hostname)) return true;
        return false;
    }

    private containsHomoglyphs(hostname: string): boolean {
        // Check for mixed scripts (Latin + Cyrillic, etc.)
        const cyrillicPattern = /[\u0400-\u04FF]/;
        const latinPattern = /[a-zA-Z]/;
        return cyrillicPattern.test(hostname) && latinPattern.test(hostname);
    }

    private getSubdomainDepth(parts: string[]): number {
        // Account for two-part TLDs like co.uk, com.au
        const twoPartTlds = ["co.uk", "com.au", "co.jp", "com.br", "co.in", "co.nz", "org.uk", "net.au", "ac.uk", "gov.uk"];
        const lastTwo = parts.slice(-2).join(".");
        const tldParts = twoPartTlds.includes(lastTwo) ? 2 : 1;
        return Math.max(0, parts.length - tldParts - 1);
    }

    private extractTld(parts: string[]): string {
        return parts[parts.length - 1];
    }

    private extractBaseDomain(parts: string[]): string {
        if (parts.length >= 2) {
            return parts.slice(-2).join(".");
        }
        return parts.join(".");
    }

    private extractSubdomains(parts: string[]): string[] {
        if (parts.length <= 2) return [];
        return parts.slice(0, -2);
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
