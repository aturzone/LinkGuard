import { ScoringService } from "./scoring.service";
import { LinkGuardConfig } from "../engine/models/config.model";
import { HistoryService } from "../services/history.service";
import { NotificationService } from "../services/notification.service";
import { SafetyScore } from "../engine/models/safety-score.model";

export class NavigationListener {
    private scoringService: ScoringService;
    private historyService: HistoryService;
    private notificationService: NotificationService;
    private config: LinkGuardConfig;

    constructor(
        scoringService: ScoringService,
        historyService: HistoryService,
        notificationService: NotificationService,
        config: LinkGuardConfig,
    ) {
        this.scoringService = scoringService;
        this.historyService = historyService;
        this.notificationService = notificationService;
        this.config = config;
    }

    start(): void {
        // Layer 2: webNavigation interception (address bar, bookmarks, redirects)
        chrome.webNavigation.onBeforeNavigate.addListener((details) => {
            if (details.frameId !== 0) return; // Only main frame
            if (this.config.settings.interceptMode === "manual") return;

            this.handleNavigation(details.url, details.tabId);
        });

        // Listen for messages from content scripts
        chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
            if (message.type === "SCORE_URL") {
                const score = this.scoringService.scoreUrl(message.url);
                this.historyService.addEntry(score);
                this.updateBadge(score, message.tabId);
                sendResponse(score);
                return true;
            }

            if (message.type === "GET_CONFIG") {
                sendResponse(this.config);
                return true;
            }

            if (message.type === "GET_CURRENT_SCORE") {
                const score = this.scoringService.scoreUrl(message.url);
                sendResponse(score);
                return true;
            }

            return false;
        });

        // Update badge when tab is activated
        chrome.tabs.onActivated.addListener(async (activeInfo) => {
            try {
                const tab = await chrome.tabs.get(activeInfo.tabId);
                if (tab.url) {
                    const score = this.scoringService.scoreUrl(tab.url);
                    this.updateBadge(score, activeInfo.tabId);
                }
            } catch {
                // Tab may no longer exist
            }
        });

        // Update badge when tab URL changes
        chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
            if (changeInfo.url) {
                const score = this.scoringService.scoreUrl(changeInfo.url);
                this.updateBadge(score, tabId);
                this.historyService.addEntry(score);
            }
        });
    }

    updateConfig(config: LinkGuardConfig): void {
        this.config = config;
    }

    private handleNavigation(url: string, tabId: number): void {
        // Skip internal extension pages and browser pages
        if (
            url.startsWith("chrome://") ||
            url.startsWith("chrome-extension://") ||
            url.startsWith("about:") ||
            url.startsWith("moz-extension://") ||
            url.startsWith("edge://")
        ) {
            return;
        }

        const score = this.scoringService.scoreUrl(url);
        this.historyService.addEntry(score);
        this.updateBadge(score, tabId);
        this.notificationService.notify(score);

        // Block navigation if below block threshold
        if (score.overallScore < this.config.settings.blockThreshold) {
            const warningUrl = chrome.runtime.getURL(
                `pages/warning.html?url=${encodeURIComponent(url)}&score=${score.overallScore}&bypass=${this.config.settings.bypassAllowed}`,
            );
            chrome.tabs.update(tabId, { url: warningUrl });
        }
    }

    private updateBadge(score: SafetyScore, tabId: number): void {
        const text = `${score.overallScore}`;

        let color: string;
        if (score.overallScore >= this.config.settings.warningThreshold) {
            color = "#2ecc71"; // Green
        } else if (score.overallScore >= this.config.settings.blockThreshold) {
            color = "#f39c12"; // Yellow/Orange
        } else {
            color = "#e74c3c"; // Red
        }

        chrome.action.setBadgeText({ text, tabId });
        chrome.action.setBadgeBackgroundColor({ color, tabId });
    }
}
