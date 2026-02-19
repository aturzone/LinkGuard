import { LinkGuardConfig, DEFAULT_CONFIG, CustomRule } from "../engine/models/config.model";

const CONFIG_KEY = "link_guard_config";

export class ConfigService {
    async getConfig(): Promise<LinkGuardConfig> {
        if (typeof chrome !== "undefined" && chrome.storage) {
            const result = await chrome.storage.local.get(CONFIG_KEY);
            if (result[CONFIG_KEY]) {
                return result[CONFIG_KEY] as LinkGuardConfig;
            }
        }
        return { ...DEFAULT_CONFIG };
    }

    async saveConfig(config: LinkGuardConfig): Promise<void> {
        if (typeof chrome !== "undefined" && chrome.storage) {
            await chrome.storage.local.set({ [CONFIG_KEY]: config });
        }
    }

    exportConfig(config: LinkGuardConfig): string {
        const exportData = {
            ...config,
            metadata: {
                ...config.metadata,
                exportedAt: new Date().toISOString(),
            },
        };
        return JSON.stringify(exportData, null, 4);
    }

    importConfig(jsonString: string): LinkGuardConfig {
        let parsed: unknown;
        try {
            parsed = JSON.parse(jsonString);
        } catch {
            throw new Error("Invalid JSON: could not parse configuration file");
        }

        if (!parsed || typeof parsed !== "object") {
            throw new Error("Invalid config: missing required fields");
        }

        const obj = parsed as Record<string, unknown>;

        // Validate required top-level fields
        if (!obj.version || typeof obj.version !== "string") {
            throw new Error("Invalid config: missing required fields");
        }

        if (!obj.settings || typeof obj.settings !== "object") {
            throw new Error("Invalid config: missing required fields");
        }

        if (!obj.rules || typeof obj.rules !== "object") {
            throw new Error("Invalid config: missing required fields");
        }

        const settings = obj.settings as Record<string, unknown>;
        const rules = obj.rules as Record<string, unknown>;

        // Validate settings fields
        const validModes = ["all", "clicks", "manual"];
        if (!validModes.includes(settings.interceptMode as string)) {
            throw new Error("Invalid config: interceptMode must be 'all', 'clicks', or 'manual'");
        }

        const validNotifLevels = ["all", "warnings", "blocks", "none"];
        if (!validNotifLevels.includes(settings.notificationLevel as string)) {
            throw new Error("Invalid config: notificationLevel must be 'all', 'warnings', 'blocks', or 'none'");
        }

        const warningThreshold = settings.warningThreshold as number;
        const blockThreshold = settings.blockThreshold as number;

        if (typeof warningThreshold !== "number" || warningThreshold < 0 || warningThreshold > 100) {
            throw new Error("Invalid config: warningThreshold must be a number between 0 and 100");
        }

        if (typeof blockThreshold !== "number" || blockThreshold < 0 || blockThreshold > 100) {
            throw new Error("Invalid config: blockThreshold must be a number between 0 and 100");
        }

        if (blockThreshold >= warningThreshold) {
            throw new Error("Invalid config: blockThreshold must be less than warningThreshold");
        }

        // Validate rules
        if (!Array.isArray(rules.allowlist) || !Array.isArray(rules.blocklist)) {
            throw new Error("Invalid config: allowlist and blocklist must be arrays");
        }

        if (!Array.isArray(rules.customPatterns)) {
            throw new Error("Invalid config: customPatterns must be an array");
        }

        // Validate custom pattern regexes
        for (const pattern of rules.customPatterns as CustomRule[]) {
            if (!pattern.id || !pattern.name || !pattern.pattern || !pattern.action) {
                throw new Error("Invalid config: custom pattern missing required fields (id, name, pattern, action)");
            }
            try {
                new RegExp(pattern.pattern);
            } catch {
                throw new Error(`Invalid regex in custom pattern "${pattern.name}": ${pattern.pattern}`);
            }
            if (!["allow", "block", "warn"].includes(pattern.action)) {
                throw new Error(`Invalid config: custom pattern action must be 'allow', 'block', or 'warn'`);
            }
        }

        return {
            version: obj.version as string,
            organization: (obj.organization as string) || "",
            rules: {
                allowlist: rules.allowlist as string[],
                blocklist: rules.blocklist as string[],
                customPatterns: rules.customPatterns as CustomRule[],
            },
            settings: {
                interceptMode: settings.interceptMode as "all" | "clicks" | "manual",
                warningThreshold,
                blockThreshold,
                showScoreAlways: Boolean(settings.showScoreAlways),
                bypassAllowed: Boolean(settings.bypassAllowed),
                notificationLevel: settings.notificationLevel as "all" | "warnings" | "blocks" | "none",
            },
            metadata: {
                createdBy: ((obj.metadata as Record<string, unknown>)?.createdBy as string) || "",
                createdAt: ((obj.metadata as Record<string, unknown>)?.createdAt as string) || new Date().toISOString(),
                description: ((obj.metadata as Record<string, unknown>)?.description as string) || "",
            },
        };
    }
}
