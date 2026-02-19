/**
 * Popup entry point — vanilla TypeScript (no Angular to keep bundle small).
 * Renders dashboard, settings, config, and history tabs.
 */

import "../styles/popup.scss";
import { ConfigService } from "../services/config.service";
import { LinkGuardConfig, DEFAULT_CONFIG } from "../engine/models/config.model";

interface PopupScore {
    url: string;
    overallScore: number;
    categories: Array<{
        name: string;
        score: number;
        weight: number;
        findings: Array<{ rule: string; description: string; severity: string }>;
    }>;
    configOverride?: string;
}

interface HistoryEntry {
    url: string;
    overallScore: number;
    timestamp: number;
    configOverride?: string;
}

let currentConfig: LinkGuardConfig = { ...DEFAULT_CONFIG };
let currentScore: PopupScore | null = null;
const configService = new ConfigService();

// Initialize popup
async function init(): Promise<void> {
    currentConfig = await configService.getConfig();

    // Get current tab URL and score it
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
        chrome.runtime.sendMessage(
            { type: "GET_CURRENT_SCORE", url: tab.url },
            (score: PopupScore) => {
                currentScore = score;
                renderDashboard();
            },
        );
    }

    renderApp();
    switchTab("dashboard");
}

function renderApp(): void {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
        <div class="popup-header">
            <span class="logo">&#x1f6e1;</span>
            <h1>Link Guard</h1>
        </div>
        <div class="nav-tabs">
            <button class="tab-btn active" data-tab="dashboard">Dashboard</button>
            <button class="tab-btn" data-tab="settings">Settings</button>
            <button class="tab-btn" data-tab="config">Config</button>
            <button class="tab-btn" data-tab="history">History</button>
        </div>
        <div class="tab-content" id="tab-content"></div>
    `;

    // Tab switching
    app.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            app.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            switchTab((btn as HTMLElement).dataset.tab || "dashboard");
        });
    });
}

function switchTab(tab: string): void {
    switch (tab) {
        case "dashboard": renderDashboard(); break;
        case "settings": renderSettings(); break;
        case "config": renderConfig(); break;
        case "history": renderHistory(); break;
    }
}

function scoreColor(score: number): string {
    if (score >= currentConfig.settings.warningThreshold) return "#2ecc71";
    if (score >= currentConfig.settings.blockThreshold) return "#f39c12";
    return "#e74c3c";
}

function renderDashboard(): void {
    const content = document.getElementById("tab-content");
    if (!content) return;

    if (!currentScore) {
        content.innerHTML = `<div class="empty-state">Loading current page score...</div>`;
        return;
    }

    const color = scoreColor(currentScore.overallScore);
    let categoriesHtml = "";
    for (const cat of currentScore.categories) {
        const catColor = scoreColor(cat.score);
        categoriesHtml += `
            <div class="category-bar">
                <div class="bar-header">
                    <span>${escapeHtml(cat.name)}</span>
                    <span style="color:${catColor}">${cat.score}/100</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill" style="width:${cat.score}%;background:${catColor}"></div>
                </div>
            </div>
        `;
    }

    content.innerHTML = `
        <div class="score-circle">
            <div class="score-value" style="color:${color}">${currentScore.overallScore}%</div>
            <div class="score-label">${currentScore.configOverride ? `Config: ${currentScore.configOverride}` : "Safety Score"}</div>
        </div>
        <div class="category-bars">${categoriesHtml}</div>
        <div class="recent-scans" id="recent-scans">
            <h3>Recent Scans</h3>
            <div class="empty-state">Loading...</div>
        </div>
    `;

    // Load recent scans
    chrome.storage.local.get("link_guard_history", (result) => {
        const history: HistoryEntry[] = (result.link_guard_history || []).slice(0, 5);
        const container = document.getElementById("recent-scans");
        if (!container) return;

        if (history.length === 0) {
            container.innerHTML = `<h3>Recent Scans</h3><div class="empty-state">No scans yet</div>`;
            return;
        }

        let html = "<h3>Recent Scans</h3>";
        for (const entry of history) {
            const c = scoreColor(entry.overallScore);
            const url = entry.url.length > 40 ? entry.url.substring(0, 37) + "..." : entry.url;
            html += `
                <div class="scan-item">
                    <span class="scan-url" title="${escapeHtml(entry.url)}">${escapeHtml(url)}</span>
                    <span class="scan-score" style="color:${c}">${entry.overallScore}%</span>
                </div>
            `;
        }
        container.innerHTML = html;
    });
}

function renderSettings(): void {
    const content = document.getElementById("tab-content");
    if (!content) return;

    const s = currentConfig.settings;

    content.innerHTML = `
        <div class="setting-group">
            <label>Intercept Mode</label>
            <select id="intercept-mode">
                <option value="all" ${s.interceptMode === "all" ? "selected" : ""}>All Navigation</option>
                <option value="clicks" ${s.interceptMode === "clicks" ? "selected" : ""}>Link Clicks Only</option>
                <option value="manual" ${s.interceptMode === "manual" ? "selected" : ""}>Manual Only</option>
            </select>
        </div>
        <div class="setting-group">
            <label>Warning Threshold: <span id="warn-val">${s.warningThreshold}</span>%</label>
            <input type="range" id="warning-threshold" min="0" max="100" value="${s.warningThreshold}">
        </div>
        <div class="setting-group">
            <label>Block Threshold: <span id="block-val">${s.blockThreshold}</span>%</label>
            <input type="range" id="block-threshold" min="0" max="100" value="${s.blockThreshold}">
        </div>
        <div class="setting-group">
            <label>Notification Level</label>
            <select id="notif-level">
                <option value="all" ${s.notificationLevel === "all" ? "selected" : ""}>All</option>
                <option value="warnings" ${s.notificationLevel === "warnings" ? "selected" : ""}>Warnings Only</option>
                <option value="blocks" ${s.notificationLevel === "blocks" ? "selected" : ""}>Blocks Only</option>
                <option value="none" ${s.notificationLevel === "none" ? "selected" : ""}>None</option>
            </select>
        </div>
        <div class="setting-group">
            <div class="toggle">
                <label>Show Score on All Links</label>
                <input type="checkbox" id="show-always" ${s.showScoreAlways ? "checked" : ""}>
            </div>
            <div class="toggle">
                <label>Allow Bypass on Blocks</label>
                <input type="checkbox" id="bypass-allowed" ${s.bypassAllowed ? "checked" : ""}>
            </div>
        </div>
        <button class="btn btn-primary" id="save-settings">Save Settings</button>
    `;

    // Range display updates
    document.getElementById("warning-threshold")?.addEventListener("input", (e) => {
        const val = (e.target as HTMLInputElement).value;
        const el = document.getElementById("warn-val");
        if (el) el.textContent = val;
    });
    document.getElementById("block-threshold")?.addEventListener("input", (e) => {
        const val = (e.target as HTMLInputElement).value;
        const el = document.getElementById("block-val");
        if (el) el.textContent = val;
    });

    // Save
    document.getElementById("save-settings")?.addEventListener("click", async () => {
        currentConfig.settings = {
            interceptMode: (document.getElementById("intercept-mode") as HTMLSelectElement).value as "all" | "clicks" | "manual",
            warningThreshold: parseInt((document.getElementById("warning-threshold") as HTMLInputElement).value, 10),
            blockThreshold: parseInt((document.getElementById("block-threshold") as HTMLInputElement).value, 10),
            showScoreAlways: (document.getElementById("show-always") as HTMLInputElement).checked,
            bypassAllowed: (document.getElementById("bypass-allowed") as HTMLInputElement).checked,
            notificationLevel: (document.getElementById("notif-level") as HTMLSelectElement).value as "all" | "warnings" | "blocks" | "none",
        };

        await configService.saveConfig(currentConfig);
        chrome.runtime.sendMessage({ type: "CONFIG_UPDATED", config: currentConfig });

        const btn = document.getElementById("save-settings") as HTMLButtonElement;
        btn.textContent = "Saved!";
        setTimeout(() => { btn.textContent = "Save Settings"; }, 1500);
    });
}

function renderConfig(): void {
    const content = document.getElementById("tab-content");
    if (!content) return;

    content.innerHTML = `
        <div class="config-section">
            <h3>Current Configuration</h3>
            <div class="config-info">
                <div class="info-row"><span>Version:</span><span>${escapeHtml(currentConfig.version)}</span></div>
                <div class="info-row"><span>Organization:</span><span>${escapeHtml(currentConfig.organization || "—")}</span></div>
                <div class="info-row"><span>Allowlisted:</span><span>${currentConfig.rules.allowlist.length} domains</span></div>
                <div class="info-row"><span>Blocklisted:</span><span>${currentConfig.rules.blocklist.length} domains</span></div>
                <div class="info-row"><span>Custom Rules:</span><span>${currentConfig.rules.customPatterns.length}</span></div>
            </div>
        </div>
        <div class="config-section">
            <h3>Export / Import</h3>
            <button class="btn btn-primary" id="export-config">Export Config</button>
            <button class="btn btn-secondary" id="import-config">Import Config</button>
            <input type="file" id="config-file-input" accept=".json" style="display:none">
            <div id="import-status" style="margin-top:8px;font-size:12px;"></div>
        </div>
        <div class="config-section">
            <h3>Danger Zone</h3>
            <button class="btn btn-danger" id="reset-config">Reset to Defaults</button>
        </div>
    `;

    // Export
    document.getElementById("export-config")?.addEventListener("click", () => {
        const json = configService.exportConfig(currentConfig);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `link-guard-config-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Import
    const fileInput = document.getElementById("config-file-input") as HTMLInputElement;
    document.getElementById("import-config")?.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput?.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const status = document.getElementById("import-status");
            try {
                const imported = configService.importConfig(e.target?.result as string);
                currentConfig = imported;
                await configService.saveConfig(currentConfig);
                chrome.runtime.sendMessage({ type: "CONFIG_UPDATED", config: currentConfig });
                if (status) {
                    status.style.color = "#2ecc71";
                    status.textContent = "Config imported successfully!";
                }
                setTimeout(() => renderConfig(), 1500);
            } catch (err) {
                if (status) {
                    status.style.color = "#e74c3c";
                    status.textContent = `Import failed: ${(err as Error).message}`;
                }
            }
        };
        reader.readAsText(file);
    });

    // Reset
    document.getElementById("reset-config")?.addEventListener("click", async () => {
        if (confirm("Reset all settings and rules to defaults?")) {
            currentConfig = { ...DEFAULT_CONFIG, metadata: { ...DEFAULT_CONFIG.metadata, createdAt: new Date().toISOString() } };
            await configService.saveConfig(currentConfig);
            chrome.runtime.sendMessage({ type: "CONFIG_UPDATED", config: currentConfig });
            renderConfig();
        }
    });
}

function renderHistory(): void {
    const content = document.getElementById("tab-content");
    if (!content) return;

    content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <h3 style="font-size:13px;color:#888;">Scan History</h3>
            <button class="btn btn-danger" style="width:auto;padding:6px 12px;font-size:11px;" id="clear-history">Clear</button>
        </div>
        <div class="history-list" id="history-list">
            <div class="empty-state">Loading...</div>
        </div>
    `;

    chrome.storage.local.get("link_guard_history", (result) => {
        const history: HistoryEntry[] = result.link_guard_history || [];
        const list = document.getElementById("history-list");
        if (!list) return;

        if (history.length === 0) {
            list.innerHTML = `<div class="empty-state">No history yet</div>`;
            return;
        }

        let html = "";
        for (const entry of history.slice(0, 100)) {
            const c = scoreColor(entry.overallScore);
            const url = entry.url.length > 35 ? entry.url.substring(0, 32) + "..." : entry.url;
            const time = formatTime(entry.timestamp);
            html += `
                <div class="history-item">
                    <span class="history-url" title="${escapeHtml(entry.url)}">${escapeHtml(url)}</span>
                    <span class="history-score" style="color:${c}">${entry.overallScore}%</span>
                    <span class="history-time">${time}</span>
                </div>
            `;
        }
        list.innerHTML = html;
    });

    document.getElementById("clear-history")?.addEventListener("click", async () => {
        if (confirm("Clear all scan history?")) {
            await chrome.storage.local.remove("link_guard_history");
            renderHistory();
        }
    });
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
}

function escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// Start
init();
