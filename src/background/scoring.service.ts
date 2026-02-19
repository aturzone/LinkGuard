import { ScoringEngine } from "../engine/scoring-engine";
import { SafetyScore } from "../engine/models/safety-score.model";

interface CacheEntry {
    score: SafetyScore;
    expiresAt: number;
}

const CACHE_MAX = 500;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class ScoringService {
    private engine: ScoringEngine;
    private cache: Map<string, CacheEntry> = new Map();

    constructor(engine: ScoringEngine) {
        this.engine = engine;
    }

    scoreUrl(rawUrl: string): SafetyScore {
        // Check cache
        const cached = this.cache.get(rawUrl);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.score;
        }

        // Score and cache
        const score = this.engine.analyze(rawUrl);

        // Evict oldest if at capacity
        if (this.cache.size >= CACHE_MAX) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(rawUrl, {
            score,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });

        return score;
    }

    updateEngine(engine: ScoringEngine): void {
        this.engine = engine;
        this.cache.clear();
    }

    clearCache(): void {
        this.cache.clear();
    }
}
