/**
 * LinkGuard v2.0 Popup — Complete rewrite with modern UI/UX
 * Features: Full config editor, score ring, category analysis, quick scan, history filters
 */

import "../styles/popup.scss";
import { ConfigService } from "../services/config.service";
import { LinkGuardConfig, DEFAULT_CONFIG, CustomRule } from "../engine/models/config.model";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PopupScore {
    url: string;
    overallScore: number;
    analysisTimeMs?: number;
    categories: Array<{
        name: string;
        score: number;
        weight: number;
        findings: Array<{ rule: string; description: string; severity: string; deduction?: number }>;
    }>;
    configOverride?: string;
}

interface HistoryEntry {
    url: string;
    overallScore: number;
    timestamp: number;
    configOverride?: string;
}

// ── State ──────────────────────────────────────────────────────────────────────

let currentConfig: LinkGuardConfig = { ...DEFAULT_CONFIG };
let currentScore: PopupScore | null = null;
let currentTab: string = "dashboard";
let historyFilter: string = "all";
const configService = new ConfigService();

// ── SVG Icons ──────────────────────────────────────────────────────────────────

const ICONS = {
    shield: `<svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M256 28C256 28 56 100 56 100C56 100 56 300 56 300C56 420 256 492 256 492C256 492 456 420 456 420C456 300 456 100 456 100C456 100 256 28 256 28Z" fill="#3B82F6"/><path d="M200 260L240 300L320 210" stroke="white" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    domain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    url: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    empty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
};

const CAT_ICONS: Record<string, string> = {
    "Domain": "domain",
    "URL Structure": "url",
    "Protocol": "lock",
    "Content Pattern": "eye",
    "Behavioral": "activity",
};

// ── Init ───────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
    currentConfig = await configService.getConfig();

    renderApp();
    switchTab("dashboard");

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
        chrome.runtime.sendMessage(
            { type: "GET_CURRENT_SCORE", url: tab.url },
            (score: PopupScore) => {
                currentScore = score;
                if (currentTab === "dashboard") renderDashboard();
            },
        );
    }
}

// ── App Shell ──────────────────────────────────────────────────────────────────

function renderApp(): void {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
        <div class="popup-header">
            <div class="header-left">
                <div class="logo-icon">${ICONS.shield}</div>
                <div class="logo-text">
                    <span class="brand-name">LinkGuard</span>
                    <span class="brand-sub">Link Safety</span>
                </div>
            </div>
            <div class="header-actions">
                <button class="header-btn" id="quick-scan-toggle" title="Quick Scan">${ICONS.search}</button>
            </div>
        </div>
        <div class="nav-tabs">
            <button class="tab-btn active" data-tab="dashboard">Dashboard</button>
            <button class="tab-btn" data-tab="settings">Settings</button>
            <button class="tab-btn" data-tab="config">Config</button>
            <button class="tab-btn" data-tab="history">History</button>
        </div>
        <div class="tab-content" id="tab-content"></div>
        <div class="popup-footer">
            <span>LinkGuard v${escapeHtml(currentConfig.version)}</span>
            <span>Open Source</span>
        </div>
    `;

    app.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            app.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            switchTab((btn as HTMLElement).dataset.tab || "dashboard");
        });
    });

    document.getElementById("quick-scan-toggle")?.addEventListener("click", () => {
        const el = document.getElementById("quick-scan-bar");
        if (el) {
            el.classList.toggle("hidden");
            if (!el.classList.contains("hidden")) {
                (el.querySelector("input") as HTMLInputElement)?.focus();
            }
        }
    });
}

function switchTab(tab: string): void {
    currentTab = tab;
    switch (tab) {
        case "dashboard": renderDashboard(); break;
        case "settings": renderSettings(); break;
        case "config": renderConfig(); break;
        case "history": renderHistory(); break;
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
    if (score >= currentConfig.settings.warningThreshold) return "#22C55E";
    if (score >= currentConfig.settings.blockThreshold) return "#EAB308";
    return "#EF4444";
}

function scoreClass(score: number): string {
    if (score >= currentConfig.settings.warningThreshold) return "safe";
    if (score >= currentConfig.settings.blockThreshold) return "warning";
    return "danger";
}

function dotClass(score: number): string {
    return `dot-${scoreClass(score)}`;
}

function textClass(score: number): string {
    return `text-${scoreClass(score)}`;
}

function escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function formatTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function truncUrl(url: string, len: number = 40): string {
    if (url.length <= len) return url;
    return url.substring(0, len - 3) + "...";
}

function showToast(message: string, type: "success" | "error" = "success"): void {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const iconSvg = type === "success" ? ICONS.check : ICONS.x;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${iconSvg}</span>${escapeHtml(message)}`;
    document.getElementById("app")?.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function icon(name: string, size: number = 16): string {
    const svg = ICONS[name as keyof typeof ICONS] || "";
    return `<span style="width:${size}px;height:${size}px;display:inline-flex">${svg}</span>`;
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

function renderDashboard(): void {
    const content = document.getElementById("tab-content");
    if (!content) return;

    // Quick scan bar
    let quickScanHtml = `
        <div class="quick-scan hidden" id="quick-scan-bar">
            <input type="text" placeholder="Paste URL to scan..." id="quick-scan-input">
            <button id="quick-scan-btn">Scan</button>
        </div>
    `;

    if (!currentScore) {
        content.innerHTML = quickScanHtml + `
            <div class="loading-spinner">
                <div class="spinner"></div>
            </div>
        `;
        setupQuickScan();
        return;
    }

    const score = currentScore.overallScore;
    const color = scoreColor(score);
    const cls = scoreClass(score);
    const circumference = 2 * Math.PI * 50;
    const offset = circumference - (score / 100) * circumference;

    // Parse current URL
    let urlHtml = "";
    try {
        const u = new URL(currentScore.url);
        urlHtml = `
            <div class="url-chip">
                <span class="url-protocol">${escapeHtml(u.protocol)}//</span>
                <span class="url-domain">${escapeHtml(u.hostname)}</span>
                <span class="url-path">${escapeHtml(u.pathname + u.search)}</span>
            </div>
        `;
    } catch {
        urlHtml = `<div class="url-chip">${escapeHtml(truncUrl(currentScore.url, 60))}</div>`;
    }

    // Score ring
    const badgeLabel = cls === "safe" ? "Secure" : cls === "warning" ? "Caution" : "Danger";
    let categoriesHtml = "";
    for (const cat of currentScore.categories) {
        const catCls = scoreClass(cat.score);
        const catIcon = CAT_ICONS[cat.name] || "activity";
        const findingsHtml = cat.findings.length > 0
            ? `<div class="category-findings">${cat.findings.map(f =>
                `<div class="finding-item"><span class="finding-severity ${f.severity}"></span><span>${escapeHtml(f.description)}</span></div>`
            ).join("")}</div>`
            : "";

        categoriesHtml += `
            <div class="category-item" data-cat="${escapeHtml(cat.name)}">
                <div class="cat-icon ${catCls}">${icon(catIcon, 16)}</div>
                <div class="cat-info">
                    <div class="cat-name">${escapeHtml(cat.name)}</div>
                    <div class="cat-bar"><div class="cat-bar-fill ${dotClass(cat.score)}" style="width:${cat.score}%"></div></div>
                </div>
                <span class="cat-score ${textClass(cat.score)}">${cat.score}</span>
            </div>
            ${findingsHtml}
        `;
    }

    content.innerHTML = `
        ${quickScanHtml}
        ${urlHtml}
        <div class="score-ring-container">
            <div class="score-ring">
                <svg viewBox="0 0 120 120">
                    <circle class="ring-bg" cx="60" cy="60" r="50"/>
                    <circle class="ring-fill" cx="60" cy="60" r="50"
                        stroke="${color}"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="${offset}"/>
                </svg>
                <div class="score-inner">
                    <span class="score-number" style="color:${color}">${score}</span>
                    <span class="score-percent" style="color:${color}">%</span>
                </div>
            </div>
            <div class="score-label">${currentScore.configOverride ? `Override: ${currentScore.configOverride}` : "Safety Score"}</div>
            <div class="score-badge ${cls}">
                <span class="badge-dot"></span>
                ${badgeLabel}
            </div>
        </div>
        ${currentScore.categories.length > 0 ? `
            <div class="section-header"><h3>Analysis</h3>${currentScore.analysisTimeMs ? `<span class="section-action">${currentScore.analysisTimeMs.toFixed(1)}ms</span>` : ""}</div>
            <div class="category-list">${categoriesHtml}</div>
        ` : ""}
        <div class="section-header"><h3>Recent Scans</h3></div>
        <div class="recent-scans" id="recent-scans">
            <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
    `;

    setupQuickScan();
    loadRecentScans();

    // Toggle findings on category click
    content.querySelectorAll(".category-item").forEach(item => {
        item.addEventListener("click", () => {
            const findings = item.nextElementSibling;
            if (findings?.classList.contains("category-findings")) {
                findings.classList.toggle("hidden");
            }
        });
    });
}

function setupQuickScan(): void {
    const input = document.getElementById("quick-scan-input") as HTMLInputElement;
    const btn = document.getElementById("quick-scan-btn");

    const doScan = () => {
        const url = input?.value.trim();
        if (!url) return;
        let fullUrl = url;
        if (!/^https?:\/\//i.test(fullUrl)) fullUrl = "https://" + fullUrl;
        chrome.runtime.sendMessage(
            { type: "SCORE_URL", url: fullUrl },
            (score: PopupScore) => {
                if (score) {
                    currentScore = score;
                    renderDashboard();
                }
            },
        );
    };

    btn?.addEventListener("click", doScan);
    input?.addEventListener("keydown", (e) => { if (e.key === "Enter") doScan(); });
}

function loadRecentScans(): void {
    chrome.storage.local.get("link_guard_history", (result) => {
        const history: HistoryEntry[] = (result.link_guard_history || []).slice(0, 5);
        const container = document.getElementById("recent-scans");
        if (!container) return;

        if (history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${ICONS.clock}</div>
                    <div class="empty-desc">No recent scans</div>
                </div>
            `;
            return;
        }

        container.innerHTML = history.map(entry => {
            const c = scoreColor(entry.overallScore);
            const cls = dotClass(entry.overallScore);
            return `
                <div class="scan-item">
                    <span class="scan-dot ${cls}"></span>
                    <span class="scan-url" title="${escapeHtml(entry.url)}">${escapeHtml(truncUrl(entry.url))}</span>
                    <span class="scan-score" style="color:${c}">${entry.overallScore}%</span>
                    <span class="scan-time">${formatTime(entry.timestamp)}</span>
                </div>
            `;
        }).join("");
    });
}

// ── Settings ───────────────────────────────────────────────────────────────────

function renderSettings(): void {
    const content = document.getElementById("tab-content");
    if (!content) return;

    const s = currentConfig.settings;

    content.innerHTML = `
        <div class="settings-section">
            <div class="settings-label">Scanning</div>
            <div class="setting-row">
                <div class="setting-info">
                    <div class="setting-name">Intercept Mode</div>
                    <div class="setting-desc">When to check links</div>
                </div>
                <select class="custom-select" id="intercept-mode">
                    <option value="all" ${s.interceptMode === "all" ? "selected" : ""}>All Navigation</option>
                    <option value="clicks" ${s.interceptMode === "clicks" ? "selected" : ""}>Clicks Only</option>
                    <option value="manual" ${s.interceptMode === "manual" ? "selected" : ""}>Manual Only</option>
                </select>
            </div>
        </div>

        <div class="settings-section">
            <div class="settings-label">Thresholds</div>
            <div class="range-group">
                <div class="range-header">
                    <span class="range-label">Warning Level</span>
                    <span class="range-value" id="warn-val">${s.warningThreshold}%</span>
                </div>
                <input type="range" id="warning-threshold" min="0" max="100" value="${s.warningThreshold}">
            </div>
            <div class="range-group">
                <div class="range-header">
                    <span class="range-label">Block Level</span>
                    <span class="range-value" id="block-val">${s.blockThreshold}%</span>
                </div>
                <input type="range" id="block-threshold" min="0" max="100" value="${s.blockThreshold}">
            </div>
        </div>

        <div class="settings-section">
            <div class="settings-label">Notifications</div>
            <div class="setting-row">
                <div class="setting-info">
                    <div class="setting-name">Notification Level</div>
                    <div class="setting-desc">Which alerts to show</div>
                </div>
                <select class="custom-select" id="notif-level">
                    <option value="all" ${s.notificationLevel === "all" ? "selected" : ""}>All</option>
                    <option value="warnings" ${s.notificationLevel === "warnings" ? "selected" : ""}>Warnings</option>
                    <option value="blocks" ${s.notificationLevel === "blocks" ? "selected" : ""}>Blocks</option>
                    <option value="none" ${s.notificationLevel === "none" ? "selected" : ""}>None</option>
                </select>
            </div>
        </div>

        <div class="settings-section">
            <div class="settings-label">Display</div>
            <div class="setting-row">
                <div class="setting-info">
                    <div class="setting-name">Show Score on Links</div>
                    <div class="setting-desc">Tooltip on hover for all links</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="show-always" ${s.showScoreAlways ? "checked" : ""}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="setting-row">
                <div class="setting-info">
                    <div class="setting-name">Allow Bypass on Blocks</div>
                    <div class="setting-desc">Let users proceed past blocked links</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="bypass-allowed" ${s.bypassAllowed ? "checked" : ""}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>

        <button class="btn btn-primary btn-block" id="save-settings">${icon("check", 14)} Save Settings</button>
    `;

    // Live range updates
    const warnSlider = document.getElementById("warning-threshold") as HTMLInputElement;
    const blockSlider = document.getElementById("block-threshold") as HTMLInputElement;

    warnSlider?.addEventListener("input", () => {
        const el = document.getElementById("warn-val");
        if (el) el.textContent = warnSlider.value + "%";
    });
    blockSlider?.addEventListener("input", () => {
        const el = document.getElementById("block-val");
        if (el) el.textContent = blockSlider.value + "%";
    });

    // Save
    document.getElementById("save-settings")?.addEventListener("click", async () => {
        currentConfig.settings = {
            interceptMode: (document.getElementById("intercept-mode") as HTMLSelectElement).value as "all" | "clicks" | "manual",
            warningThreshold: parseInt(warnSlider.value, 10),
            blockThreshold: parseInt(blockSlider.value, 10),
            showScoreAlways: (document.getElementById("show-always") as HTMLInputElement).checked,
            bypassAllowed: (document.getElementById("bypass-allowed") as HTMLInputElement).checked,
            notificationLevel: (document.getElementById("notif-level") as HTMLSelectElement).value as "all" | "warnings" | "blocks" | "none",
        };

        await configService.saveConfig(currentConfig);
        chrome.runtime.sendMessage({ type: "CONFIG_UPDATED", config: currentConfig });
        showToast("Settings saved");
    });
}

// ── Config (Full Management) ───────────────────────────────────────────────────

function renderConfig(): void {
    const content = document.getElementById("tab-content");
    if (!content) return;

    const r = currentConfig.rules;

    content.innerHTML = `
        <div class="config-section">
            <div class="section-header"><h3>Overview</h3></div>
            <div class="config-info-grid">
                <div class="info-card">
                    <div class="info-value">${r.allowlist.length}</div>
                    <div class="info-label">Allowed</div>
                </div>
                <div class="info-card">
                    <div class="info-value">${r.blocklist.length}</div>
                    <div class="info-label">Blocked</div>
                </div>
                <div class="info-card">
                    <div class="info-value">${r.customPatterns.length}</div>
                    <div class="info-label">Custom Rules</div>
                </div>
                <div class="info-card">
                    <div class="info-value text-blue">${escapeHtml(currentConfig.version)}</div>
                    <div class="info-label">Config Version</div>
                </div>
            </div>
        </div>

        <div class="config-section">
            <div class="section-header"><h3>Allowlist</h3><span class="section-action">${r.allowlist.length} domains</span></div>
            <div class="list-editor" id="allowlist-editor">
                <div class="list-add-row">
                    <input type="text" placeholder="e.g. *.google.com" id="allowlist-input">
                    <button id="allowlist-add">Add</button>
                </div>
                <div class="list-items" id="allowlist-items"></div>
            </div>
        </div>

        <div class="config-section">
            <div class="section-header"><h3>Blocklist</h3><span class="section-action">${r.blocklist.length} domains</span></div>
            <div class="list-editor" id="blocklist-editor">
                <div class="list-add-row">
                    <input type="text" placeholder="e.g. malware-site.com" id="blocklist-input">
                    <button id="blocklist-add">Add</button>
                </div>
                <div class="list-items" id="blocklist-items"></div>
            </div>
        </div>

        <div class="config-section">
            <div class="section-header">
                <h3>Custom Rules</h3>
                <button class="section-action" id="add-rule-toggle">+ Add Rule</button>
            </div>
            <div class="add-rule-form hidden" id="add-rule-form">
                <div class="form-row">
                    <input type="text" placeholder="Rule name" id="rule-name">
                    <select id="rule-action">
                        <option value="block">Block</option>
                        <option value="warn">Warn</option>
                        <option value="allow">Allow</option>
                    </select>
                </div>
                <div class="form-row">
                    <input type="text" placeholder="Regex pattern" id="rule-pattern">
                </div>
                <div class="form-row">
                    <input type="text" placeholder="Description (optional)" id="rule-desc">
                </div>
                <div class="form-actions">
                    <button class="btn btn-ghost btn-sm" id="rule-cancel">Cancel</button>
                    <button class="btn btn-primary btn-sm" id="rule-save">Save Rule</button>
                </div>
            </div>
            <div class="rules-table" id="rules-table"></div>
        </div>

        <div class="config-section">
            <div class="section-header"><h3>Import / Export</h3></div>
            <div class="btn-group">
                <button class="btn btn-secondary btn-sm" id="export-config">${icon("download", 12)} Export</button>
                <button class="btn btn-secondary btn-sm" id="import-config">${icon("upload", 12)} Import</button>
            </div>
            <input type="file" id="config-file-input" accept=".json" style="display:none">
        </div>

        <div class="config-section">
            <button class="btn btn-danger btn-block btn-sm" id="reset-config">${icon("trash", 12)} Reset to Defaults</button>
        </div>
    `;

    renderListItems("allowlist");
    renderListItems("blocklist");
    renderRules();

    // Allowlist add
    const addToList = (listName: "allowlist" | "blocklist") => {
        const input = document.getElementById(`${listName}-input`) as HTMLInputElement;
        const val = input.value.trim();
        if (!val) return;
        if (currentConfig.rules[listName].includes(val)) {
            showToast("Already exists", "error");
            return;
        }
        currentConfig.rules[listName].push(val);
        input.value = "";
        saveConfigSilent();
        renderListItems(listName);
    };

    document.getElementById("allowlist-add")?.addEventListener("click", () => addToList("allowlist"));
    document.getElementById("allowlist-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") addToList("allowlist"); });
    document.getElementById("blocklist-add")?.addEventListener("click", () => addToList("blocklist"));
    document.getElementById("blocklist-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") addToList("blocklist"); });

    // Custom rule toggle
    document.getElementById("add-rule-toggle")?.addEventListener("click", () => {
        document.getElementById("add-rule-form")?.classList.toggle("hidden");
    });
    document.getElementById("rule-cancel")?.addEventListener("click", () => {
        document.getElementById("add-rule-form")?.classList.add("hidden");
    });
    document.getElementById("rule-save")?.addEventListener("click", () => {
        const name = (document.getElementById("rule-name") as HTMLInputElement).value.trim();
        const pattern = (document.getElementById("rule-pattern") as HTMLInputElement).value.trim();
        const action = (document.getElementById("rule-action") as HTMLSelectElement).value as "allow" | "block" | "warn";
        const desc = (document.getElementById("rule-desc") as HTMLInputElement).value.trim();

        if (!name || !pattern) {
            showToast("Name and pattern required", "error");
            return;
        }

        try {
            new RegExp(pattern);
        } catch {
            showToast("Invalid regex pattern", "error");
            return;
        }

        const newRule: CustomRule = {
            id: `rule_${Date.now()}`,
            name,
            pattern,
            action,
            description: desc || undefined,
        };

        currentConfig.rules.customPatterns.push(newRule);
        saveConfigSilent();
        document.getElementById("add-rule-form")?.classList.add("hidden");
        (document.getElementById("rule-name") as HTMLInputElement).value = "";
        (document.getElementById("rule-pattern") as HTMLInputElement).value = "";
        (document.getElementById("rule-desc") as HTMLInputElement).value = "";
        renderRules();
        showToast("Rule added");
    });

    // Export
    document.getElementById("export-config")?.addEventListener("click", () => {
        const json = configService.exportConfig(currentConfig);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `linkguard-config-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Config exported");
    });

    // Import
    const fileInput = document.getElementById("config-file-input") as HTMLInputElement;
    document.getElementById("import-config")?.addEventListener("click", () => fileInput.click());
    fileInput?.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const imported = configService.importConfig(e.target?.result as string);
                currentConfig = imported;
                await configService.saveConfig(currentConfig);
                chrome.runtime.sendMessage({ type: "CONFIG_UPDATED", config: currentConfig });
                showToast("Config imported");
                setTimeout(() => renderConfig(), 500);
            } catch (err) {
                showToast(`Import failed: ${(err as Error).message}`, "error");
            }
        };
        reader.readAsText(file);
    });

    // Reset
    document.getElementById("reset-config")?.addEventListener("click", async () => {
        if (confirm("Reset all configuration to defaults? This cannot be undone.")) {
            currentConfig = {
                ...DEFAULT_CONFIG,
                metadata: { ...DEFAULT_CONFIG.metadata, createdAt: new Date().toISOString() },
            };
            await configService.saveConfig(currentConfig);
            chrome.runtime.sendMessage({ type: "CONFIG_UPDATED", config: currentConfig });
            showToast("Config reset to defaults");
            renderConfig();
        }
    });
}

function renderListItems(listName: "allowlist" | "blocklist"): void {
    const container = document.getElementById(`${listName}-items`);
    if (!container) return;

    const items = currentConfig.rules[listName];
    if (items.length === 0) {
        container.innerHTML = `<div class="list-empty">No entries</div>`;
        return;
    }

    container.innerHTML = items.map((item, i) => `
        <div class="list-item">
            <span>${escapeHtml(item)}</span>
            <button class="remove-btn" data-list="${listName}" data-index="${i}">&times;</button>
        </div>
    `).join("");

    container.querySelectorAll(".remove-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const list = (btn as HTMLElement).dataset.list as "allowlist" | "blocklist";
            const idx = parseInt((btn as HTMLElement).dataset.index || "0", 10);
            currentConfig.rules[list].splice(idx, 1);
            saveConfigSilent();
            renderListItems(list);
        });
    });
}

function renderRules(): void {
    const container = document.getElementById("rules-table");
    if (!container) return;

    const rules = currentConfig.rules.customPatterns;
    if (rules.length === 0) {
        container.innerHTML = `<div class="list-empty">No custom rules</div>`;
        return;
    }

    container.innerHTML = rules.map((rule, i) => `
        <div class="rule-row">
            <span class="rule-name" title="${escapeHtml(rule.pattern)}">${escapeHtml(rule.name)}</span>
            <span class="rule-action ${rule.action}">${rule.action}</span>
            <div class="rule-actions">
                <button class="delete" data-index="${i}" title="Delete">${icon("x", 12)}</button>
            </div>
        </div>
    `).join("");

    container.querySelectorAll(".delete").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt((btn as HTMLElement).dataset.index || "0", 10);
            currentConfig.rules.customPatterns.splice(idx, 1);
            saveConfigSilent();
            renderRules();
            showToast("Rule removed");
        });
    });
}

async function saveConfigSilent(): Promise<void> {
    await configService.saveConfig(currentConfig);
    chrome.runtime.sendMessage({ type: "CONFIG_UPDATED", config: currentConfig });
}

// ── History ────────────────────────────────────────────────────────────────────

function renderHistory(): void {
    const content = document.getElementById("tab-content");
    if (!content) return;

    content.innerHTML = `
        <div class="stats-bar" id="stats-bar">
            <div class="stat-card"><div class="stat-value">--</div><div class="stat-label">Total</div></div>
            <div class="stat-card"><div class="stat-value text-safe">--</div><div class="stat-label">Safe</div></div>
            <div class="stat-card"><div class="stat-value text-warn">--</div><div class="stat-label">Warned</div></div>
            <div class="stat-card"><div class="stat-value text-danger">--</div><div class="stat-label">Blocked</div></div>
        </div>
        <div class="history-filters">
            <button class="filter-btn ${historyFilter === "all" ? "active" : ""}" data-filter="all">All</button>
            <button class="filter-btn ${historyFilter === "safe" ? "active" : ""}" data-filter="safe">Safe</button>
            <button class="filter-btn ${historyFilter === "warned" ? "active" : ""}" data-filter="warned">Warned</button>
            <button class="filter-btn ${historyFilter === "blocked" ? "active" : ""}" data-filter="blocked">Blocked</button>
        </div>
        <div class="history-list" id="history-list">
            <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
        <div style="margin-top:12px">
            <button class="btn btn-danger btn-sm btn-block" id="clear-history">${icon("trash", 12)} Clear History</button>
        </div>
    `;

    // Filter buttons
    content.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            historyFilter = (btn as HTMLElement).dataset.filter || "all";
            content.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            loadHistory();
        });
    });

    loadHistoryStats();
    loadHistory();

    document.getElementById("clear-history")?.addEventListener("click", async () => {
        if (confirm("Clear all scan history?")) {
            await chrome.storage.local.remove("link_guard_history");
            showToast("History cleared");
            renderHistory();
        }
    });
}

function loadHistoryStats(): void {
    chrome.storage.local.get("link_guard_history", (result) => {
        const history: HistoryEntry[] = result.link_guard_history || [];
        const safe = history.filter(h => h.overallScore >= currentConfig.settings.warningThreshold).length;
        const warned = history.filter(h => h.overallScore >= currentConfig.settings.blockThreshold && h.overallScore < currentConfig.settings.warningThreshold).length;
        const blocked = history.filter(h => h.overallScore < currentConfig.settings.blockThreshold).length;

        const statsBar = document.getElementById("stats-bar");
        if (statsBar) {
            statsBar.innerHTML = `
                <div class="stat-card"><div class="stat-value">${history.length}</div><div class="stat-label">Total</div></div>
                <div class="stat-card"><div class="stat-value text-safe">${safe}</div><div class="stat-label">Safe</div></div>
                <div class="stat-card"><div class="stat-value text-warn">${warned}</div><div class="stat-label">Warned</div></div>
                <div class="stat-card"><div class="stat-value text-danger">${blocked}</div><div class="stat-label">Blocked</div></div>
            `;
        }
    });
}

function loadHistory(): void {
    chrome.storage.local.get("link_guard_history", (result) => {
        let history: HistoryEntry[] = result.link_guard_history || [];
        const list = document.getElementById("history-list");
        if (!list) return;

        // Apply filter
        if (historyFilter === "safe") {
            history = history.filter(h => h.overallScore >= currentConfig.settings.warningThreshold);
        } else if (historyFilter === "warned") {
            history = history.filter(h => h.overallScore >= currentConfig.settings.blockThreshold && h.overallScore < currentConfig.settings.warningThreshold);
        } else if (historyFilter === "blocked") {
            history = history.filter(h => h.overallScore < currentConfig.settings.blockThreshold);
        }

        if (history.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${ICONS.empty}</div>
                    <div class="empty-title">No entries</div>
                    <div class="empty-desc">${historyFilter !== "all" ? "Try a different filter" : "Browse some links to start"}</div>
                </div>
            `;
            return;
        }

        list.innerHTML = history.slice(0, 100).map(entry => {
            const c = scoreColor(entry.overallScore);
            const cls = dotClass(entry.overallScore);
            return `
                <div class="history-item">
                    <span class="history-dot ${cls}"></span>
                    <div class="history-info">
                        <div class="history-url" title="${escapeHtml(entry.url)}">${escapeHtml(truncUrl(entry.url, 38))}</div>
                        <div class="history-meta">${formatTime(entry.timestamp)}${entry.configOverride ? ` \u00b7 ${entry.configOverride}` : ""}</div>
                    </div>
                    <span class="history-score" style="color:${c}">${entry.overallScore}%</span>
                </div>
            `;
        }).join("");
    });
}

// ── Start ──────────────────────────────────────────────────────────────────────
init();
