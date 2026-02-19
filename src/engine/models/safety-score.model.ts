import { AnalysisResult } from "./analysis-result.model";

export interface CategoryScore {
    name: string;
    weight: number;
    score: number;
    findings: import("./analysis-result.model").Finding[];
}

export interface SafetyScore {
    url: string;
    overallScore: number;
    categories: CategoryScore[];
    timestamp: number;
    analysisTimeMs: number;
    configOverride?: "allowed" | "blocked";
}
