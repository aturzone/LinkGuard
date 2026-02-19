import { SafetyScore } from "../engine/models/safety-score.model";

const HISTORY_KEY = "link_guard_history";
const MAX_HISTORY = 1000;

export interface HistoryEntry {
    url: string;
    overallScore: number;
    timestamp: number;
    configOverride?: "allowed" | "blocked";
}

export class HistoryService {
    async addEntry(score: SafetyScore): Promise<void> {
        const history = await this.getHistory(MAX_HISTORY);
        history.unshift({
            url: score.url,
            overallScore: score.overallScore,
            timestamp: score.timestamp,
            configOverride: score.configOverride,
        });

        if (history.length > MAX_HISTORY) {
            history.length = MAX_HISTORY;
        }

        await chrome.storage.local.set({ [HISTORY_KEY]: history });
    }

    async getHistory(limit: number = 100): Promise<HistoryEntry[]> {
        const result = await chrome.storage.local.get(HISTORY_KEY);
        const history: HistoryEntry[] = result[HISTORY_KEY] || [];
        return history.slice(0, limit);
    }

    async clearHistory(): Promise<void> {
        await chrome.storage.local.remove(HISTORY_KEY);
    }

    async getStats(): Promise<{ total: number; blocked: number; warned: number; safe: number }> {
        const history = await this.getHistory(MAX_HISTORY);
        return {
            total: history.length,
            blocked: history.filter((h) => h.overallScore < 30).length,
            warned: history.filter((h) => h.overallScore >= 30 && h.overallScore < 60).length,
            safe: history.filter((h) => h.overallScore >= 60).length,
        };
    }
}
