import { LinkGuardConfig } from "../engine/models/config.model";
import { SafetyScore } from "../engine/models/safety-score.model";

export class NotificationService {
    private config: LinkGuardConfig;

    constructor(config: LinkGuardConfig) {
        this.config = config;
    }

    updateConfig(config: LinkGuardConfig): void {
        this.config = config;
    }

    notify(score: SafetyScore): void {
        const level = this.config.settings.notificationLevel;
        if (level === "none") return;

        const isBlocked = score.overallScore < this.config.settings.blockThreshold;
        const isWarning = score.overallScore < this.config.settings.warningThreshold;

        if (level === "blocks" && !isBlocked) return;
        if (level === "warnings" && !isWarning) return;
        if (!isWarning) return;

        const title = isBlocked ? "Link Blocked" : "Link Warning";
        const message = `Safety score: ${score.overallScore}%\n${score.url}`;

        if (typeof chrome !== "undefined" && chrome.notifications) {
            chrome.notifications.create({
                type: "basic",
                iconUrl: "../icons/icon-48.png",
                title,
                message,
                priority: isBlocked ? 2 : 1,
            });
        }
    }
}
