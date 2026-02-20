export interface CustomRule {
    id: string;
    name: string;
    pattern: string;
    action: "allow" | "block" | "warn";
    description?: string;
}

export interface LinkGuardConfig {
    version: string;
    organization: string;
    rules: {
        allowlist: string[];
        blocklist: string[];
        customPatterns: CustomRule[];
    };
    settings: {
        interceptMode: "all" | "clicks" | "manual";
        warningThreshold: number;
        blockThreshold: number;
        showScoreAlways: boolean;
        bypassAllowed: boolean;
        notificationLevel: "all" | "warnings" | "blocks" | "none";
    };
    metadata: {
        createdBy: string;
        createdAt: string;
        description: string;
    };
}

export const DEFAULT_CONFIG: LinkGuardConfig = {
    version: "2.0.0",
    organization: "",
    rules: {
        allowlist: [],
        blocklist: [],
        customPatterns: [],
    },
    settings: {
        interceptMode: "all",
        warningThreshold: 80,
        blockThreshold: 40,
        showScoreAlways: false,
        bypassAllowed: true,
        notificationLevel: "all",
    },
    metadata: {
        createdBy: "",
        createdAt: new Date().toISOString(),
        description: "Default Link Guard configuration",
    },
};
