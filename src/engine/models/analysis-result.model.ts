export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface Finding {
    rule: string;
    description: string;
    severity: Severity;
    deduction: number;
}

export interface AnalysisResult {
    analyzerName: string;
    score: number;
    findings: Finding[];
}
