import { AnalysisResult, Finding } from "../models/analysis-result.model";

export class ProtocolAnalyzer {
    analyze(url: URL): AnalysisResult {
        const findings: Finding[] = [];

        // HTTPS check
        if (url.protocol === "http:") {
            findings.push({
                rule: "no-https",
                description: "Connection is not encrypted — data can be intercepted",
                severity: "high",
                deduction: 40,
            });
        }

        // FTP protocol
        if (url.protocol === "ftp:") {
            findings.push({
                rule: "ftp-protocol",
                description: "FTP transfers data without encryption",
                severity: "high",
                deduction: 35,
            });
        }

        // Non-standard ports
        if (url.port) {
            const port = parseInt(url.port, 10);
            const standardPorts = [80, 443, 8080, 8443];
            if (!standardPorts.includes(port)) {
                findings.push({
                    rule: "non-standard-port",
                    description: `Non-standard port ${port} — may indicate unofficial service`,
                    severity: "medium",
                    deduction: 15,
                });
            }
        }

        // Blob protocol
        if (url.protocol === "blob:") {
            findings.push({
                rule: "blob-protocol",
                description: "Blob URLs reference in-memory data objects",
                severity: "medium",
                deduction: 20,
            });
        }

        // File protocol
        if (url.protocol === "file:") {
            findings.push({
                rule: "file-protocol",
                description: "File URLs access local filesystem",
                severity: "medium",
                deduction: 15,
            });
        }

        const totalDeduction = findings.reduce((sum, f) => sum + f.deduction, 0);
        const score = Math.max(0, Math.min(100, 100 - totalDeduction));

        return { analyzerName: "protocol", score, findings };
    }
}
