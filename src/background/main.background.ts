import { ScoringEngine } from "../engine/scoring-engine";
import { ScoringService } from "./scoring.service";
import { NavigationListener } from "./navigation.listener";
import { ConfigService } from "../services/config.service";
import { HistoryService } from "../services/history.service";
import { NotificationService } from "../services/notification.service";
import { LinkGuardConfig } from "../engine/models/config.model";

import safeDomainData from "../engine/data/safe-domains.json";
import suspiciousTldData from "../engine/data/suspicious-tlds.json";
import phishingPatternData from "../engine/data/phishing-patterns.json";
import brandNameData from "../engine/data/brand-names.json";
import urlShortenerData from "../engine/data/url-shorteners.json";

let scoringService: ScoringService;
let navigationListener: NavigationListener;
let configService: ConfigService;

function buildScoringEngine(config: LinkGuardConfig): ScoringEngine {
    const safeDomains = new Set<string>(safeDomainData.domains);
    const suspiciousTlds = new Map<string, number>(
        Object.entries(suspiciousTldData.tlds).map(([k, v]) => [k, v as number]),
    );
    const phishingPatterns = phishingPatternData.patterns.map(
        (p: string) => new RegExp(p, "i"),
    );
    const brandNames: string[] = brandNameData.brands;
    const shorteners = new Set<string>(urlShortenerData.shorteners);

    // Add config allowlist domains to safe domains for the engine
    for (const domain of config.rules.allowlist) {
        if (!domain.includes("*")) {
            safeDomains.add(domain);
        }
    }

    return new ScoringEngine(
        config,
        safeDomains,
        suspiciousTlds,
        phishingPatterns,
        brandNames,
        shorteners,
    );
}

async function initialize(): Promise<void> {
    configService = new ConfigService();
    const config = await configService.getConfig();

    const engine = buildScoringEngine(config);
    scoringService = new ScoringService(engine);

    const historyService = new HistoryService();
    const notificationService = new NotificationService(config);

    navigationListener = new NavigationListener(
        scoringService,
        historyService,
        notificationService,
        config,
    );
    navigationListener.start();

    // Listen for config updates from popup
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message.type === "CONFIG_UPDATED") {
            const newConfig = message.config as LinkGuardConfig;
            configService.saveConfig(newConfig);
            const newEngine = buildScoringEngine(newConfig);
            scoringService.updateEngine(newEngine);
            navigationListener.updateConfig(newConfig);
            notificationService.updateConfig(newConfig);
            sendResponse({ success: true });
            return true;
        }
        return false;
    });

    console.log("[Link Guard] Initialized successfully");
}

// Service worker entry point
initialize().catch((err) => {
    console.error("[Link Guard] Initialization failed:", err);
});
