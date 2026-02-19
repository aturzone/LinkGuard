/**
 * Content script: intercepts link clicks, form submissions, and window.open
 * at the DOM level. Sends URLs to background for scoring before allowing navigation.
 */

interface ScoreResponse {
    overallScore: number;
    url: string;
    categories: Array<{
        name: string;
        score: number;
        weight: number;
        findings: Array<{ rule: string; description: string; severity: string }>;
    }>;
    configOverride?: "allowed" | "blocked";
}

interface ConfigResponse {
    settings: {
        interceptMode: string;
        warningThreshold: number;
        blockThreshold: number;
        bypassAllowed: boolean;
    };
}

let currentConfig: ConfigResponse | null = null;

// Fetch config from background on load
chrome.runtime.sendMessage({ type: "GET_CONFIG" }, (config: ConfigResponse) => {
    currentConfig = config;
});

function getTabId(): number {
    return 0; // Content scripts don't have direct tab ID access; background handles it
}

function shouldIntercept(): boolean {
    if (!currentConfig) return true;
    return currentConfig.settings.interceptMode !== "manual";
}

// Layer 1: Click interception
document.addEventListener("click", (event: MouseEvent) => {
    if (!shouldIntercept()) return;

    const target = (event.target as Element)?.closest("a[href]") as HTMLAnchorElement | null;
    if (!target || !target.href) return;

    const url = target.href;

    // Skip same-page anchors and javascript: links
    if (url.startsWith("#") || url.startsWith("javascript:")) return;

    // Skip internal extension URLs
    if (url.startsWith("chrome-extension://") || url.startsWith("moz-extension://")) return;

    event.preventDefault();
    event.stopPropagation();

    chrome.runtime.sendMessage(
        { type: "SCORE_URL", url, tabId: getTabId() },
        (score: ScoreResponse) => {
            if (!score || !currentConfig) {
                // If scoring fails, allow navigation
                window.location.href = url;
                return;
            }

            if (score.overallScore < currentConfig.settings.blockThreshold) {
                // Show blocking overlay
                showOverlay(score, url, true);
            } else if (score.overallScore < currentConfig.settings.warningThreshold) {
                // Show warning overlay
                showOverlay(score, url, false);
            } else {
                // Safe — navigate
                navigateToUrl(url, target);
            }
        },
    );
}, true);

// Form submission interception
document.addEventListener("submit", (event: SubmitEvent) => {
    if (!shouldIntercept()) return;

    const form = event.target as HTMLFormElement;
    if (!form || !form.action) return;

    const url = form.action;
    if (url.startsWith("javascript:")) return;

    event.preventDefault();

    chrome.runtime.sendMessage(
        { type: "SCORE_URL", url, tabId: getTabId() },
        (score: ScoreResponse) => {
            if (!score || !currentConfig) {
                form.submit();
                return;
            }

            if (score.overallScore < currentConfig.settings.warningThreshold) {
                showOverlay(score, url, score.overallScore < currentConfig.settings.blockThreshold);
            } else {
                form.submit();
            }
        },
    );
}, true);

// Intercept window.open
const originalWindowOpen = window.open;
window.open = function (url?: string | URL, target?: string, features?: string): Window | null {
    if (!shouldIntercept() || !url) {
        return originalWindowOpen.call(window, url, target, features);
    }

    const urlStr = url.toString();
    if (urlStr.startsWith("javascript:") || urlStr.startsWith("about:")) {
        return originalWindowOpen.call(window, url, target, features);
    }

    // Score synchronously is not possible, so open and let background handle it
    return originalWindowOpen.call(window, url, target, features);
};

function navigateToUrl(url: string, anchor: HTMLAnchorElement): void {
    const target = anchor.target;
    if (target === "_blank") {
        window.open(url);
    } else {
        window.location.href = url;
    }
}

function showOverlay(score: ScoreResponse, url: string, isBlocked: boolean): void {
    // Dispatch custom event for overlay.ts to pick up
    const detail = { score, url, isBlocked };
    document.dispatchEvent(new CustomEvent("linkguard-show-overlay", { detail }));
}
