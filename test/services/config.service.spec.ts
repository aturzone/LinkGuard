import { ConfigService } from "../../src/services/config.service";

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};
(global as any).chrome = {
    storage: {
        local: {
            get: jest.fn((key: string) =>
                Promise.resolve({ [key]: mockStorage[key] }),
            ),
            set: jest.fn((data: Record<string, unknown>) => {
                Object.assign(mockStorage, data);
                return Promise.resolve();
            }),
            remove: jest.fn((key: string) => {
                delete mockStorage[key];
                return Promise.resolve();
            }),
        },
    },
};

describe("ConfigService", () => {
    let service: ConfigService;

    beforeEach(() => {
        service = new ConfigService();
        Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    });

    it("should return default config when none is stored", async () => {
        const config = await service.getConfig();
        expect(config.version).toBe("1.0.0");
        expect(config.settings.warningThreshold).toBe(80);
        expect(config.settings.blockThreshold).toBe(40);
    });

    it("should export config as valid JSON", async () => {
        const config = await service.getConfig();
        const json = service.exportConfig(config);
        const parsed = JSON.parse(json);
        expect(parsed.version).toBe("1.0.0");
        expect(parsed.metadata.exportedAt).toBeDefined();
    });

    it("should import valid config JSON", () => {
        const validConfig = JSON.stringify({
            version: "1.0.0",
            organization: "kifpool SecOps",
            rules: {
                allowlist: ["kifpool.me"],
                blocklist: ["malware.example.com"],
                customPatterns: [],
            },
            settings: {
                interceptMode: "all",
                warningThreshold: 70,
                blockThreshold: 25,
                showScoreAlways: true,
                bypassAllowed: false,
                notificationLevel: "all",
            },
            metadata: {
                createdBy: "Security Team",
                createdAt: "2026-02-19T00:00:00.000Z",
                description: "Enterprise security policy",
            },
        });

        const imported = service.importConfig(validConfig);
        expect(imported.organization).toBe("kifpool SecOps");
        expect(imported.settings.warningThreshold).toBe(70);
    });

    it("should reject invalid JSON", () => {
        expect(() => service.importConfig("not json")).toThrow("Invalid JSON");
    });

    it("should reject config missing required fields", () => {
        expect(() => service.importConfig('{"foo": "bar"}')).toThrow(
            "missing required fields",
        );
    });

    it("should reject blockThreshold >= warningThreshold", () => {
        const badConfig = JSON.stringify({
            version: "1.0.0",
            settings: {
                warningThreshold: 50,
                blockThreshold: 60,
                interceptMode: "all",
                showScoreAlways: false,
                bypassAllowed: true,
                notificationLevel: "all",
            },
            rules: { allowlist: [], blocklist: [], customPatterns: [] },
            metadata: {},
        });
        expect(() => service.importConfig(badConfig)).toThrow(
            "blockThreshold must be less than warningThreshold",
        );
    });

    it("should reject invalid regex in custom patterns", () => {
        const badRegex = JSON.stringify({
            version: "1.0.0",
            settings: {
                warningThreshold: 60,
                blockThreshold: 30,
                interceptMode: "all",
                showScoreAlways: false,
                bypassAllowed: true,
                notificationLevel: "all",
            },
            rules: {
                allowlist: [],
                blocklist: [],
                customPatterns: [{
                    id: "1",
                    name: "bad",
                    pattern: "[invalid(",
                    action: "block",
                }],
            },
            metadata: {},
        });
        expect(() => service.importConfig(badRegex)).toThrow("Invalid regex");
    });
});
