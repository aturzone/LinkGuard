/**
 * Content script: shows a modern score tooltip when hovering over links.
 * LinkGuard v2.0
 */

interface TooltipScoreResponse {
    overallScore: number;
    url: string;
    configOverride?: string;
}

let tooltipEl: HTMLElement | null = null;
let currentHoverUrl: string | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

function createTooltip(): HTMLElement {
    const el = document.createElement("div");
    el.id = "linkguard-tooltip";

    const style = document.createElement("style");
    style.textContent = `
        #linkguard-tooltip {
            position: fixed !important;
            z-index: 2147483646 !important;
            background: #111827 !important;
            color: #F1F5F9 !important;
            padding: 6px 10px !important;
            border-radius: 8px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif !important;
            font-size: 12px !important;
            pointer-events: none !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) !important;
            display: none !important;
            white-space: nowrap !important;
            transition: opacity 0.12s ease !important;
            -webkit-font-smoothing: antialiased !important;
        }
        #linkguard-tooltip.lg-visible {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
        }
        #linkguard-tooltip .lg-tt-shield {
            width: 16px !important;
            height: 16px !important;
            flex-shrink: 0 !important;
        }
        #linkguard-tooltip .lg-tt-score {
            font-weight: 700 !important;
            font-size: 13px !important;
            letter-spacing: -0.3px !important;
        }
        #linkguard-tooltip .lg-tt-label {
            color: #94A3B8 !important;
            font-size: 11px !important;
            font-weight: 500 !important;
        }
        #linkguard-tooltip .lg-tt-divider {
            width: 1px !important;
            height: 12px !important;
            background: rgba(255,255,255,0.1) !important;
        }
    `;
    el.appendChild(style);
    document.body.appendChild(el);
    return el;
}

function getScoreInfo(score: number): { color: string; label: string; shieldColor: string } {
    if (score >= 60) return { color: "#22C55E", label: "Safe", shieldColor: "#22C55E" };
    if (score >= 30) return { color: "#EAB308", label: "Caution", shieldColor: "#EAB308" };
    return { color: "#EF4444", label: "Danger", shieldColor: "#EF4444" };
}

function showTooltip(score: number, x: number, y: number, override?: string): void {
    if (!tooltipEl) {
        tooltipEl = createTooltip();
    }

    const info = getScoreInfo(score);
    const shieldSvg = `<svg viewBox="0 0 512 512" class="lg-tt-shield"><path d="M256 28C256 28 56 100 56 100C56 100 56 300 56 300C56 420 256 492 256 492C256 492 456 420 456 420C456 300 456 100 456 100C456 100 256 28 256 28Z" fill="${info.shieldColor}"/><path d="M200 260L240 300L320 210" stroke="white" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

    const label = override
        ? override.charAt(0).toUpperCase() + override.slice(1)
        : info.label;

    tooltipEl.innerHTML = tooltipEl.querySelector("style")?.outerHTML +
        shieldSvg +
        `<span class="lg-tt-score" style="color:${info.color}">${score}%</span>` +
        `<span class="lg-tt-divider"></span>` +
        `<span class="lg-tt-label">${label}</span>`;

    const padding = 14;
    tooltipEl.style.left = `${x + padding}px`;
    tooltipEl.style.top = `${y + padding}px`;
    tooltipEl.classList.add("lg-visible");

    requestAnimationFrame(() => {
        if (!tooltipEl) return;
        const rect = tooltipEl.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            tooltipEl.style.left = `${x - rect.width - padding}px`;
        }
        if (rect.bottom > window.innerHeight) {
            tooltipEl.style.top = `${y - rect.height - padding}px`;
        }
    });
}

function hideTooltip(): void {
    if (tooltipEl) {
        tooltipEl.classList.remove("lg-visible");
    }
    currentHoverUrl = null;
}

// Hover listener
document.addEventListener("mouseover", (event: MouseEvent) => {
    const target = (event.target as Element)?.closest("a[href]") as HTMLAnchorElement | null;
    if (!target || !target.href) return;

    const url = target.href;
    if (url.startsWith("#") || url.startsWith("javascript:")) return;
    if (url === currentHoverUrl) return;

    currentHoverUrl = url;

    if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
    }

    chrome.runtime.sendMessage(
        { type: "SCORE_URL", url },
        (score: TooltipScoreResponse) => {
            if (score && currentHoverUrl === url) {
                showTooltip(score.overallScore, event.clientX, event.clientY, score.configOverride);
            }
        },
    );
});

document.addEventListener("mouseout", (event: MouseEvent) => {
    const target = (event.target as Element)?.closest("a[href]");
    if (target) {
        hideTimeout = setTimeout(hideTooltip, 200);
    }
});

document.addEventListener("mousemove", (event: MouseEvent) => {
    if (tooltipEl && tooltipEl.classList.contains("lg-visible") && currentHoverUrl) {
        const padding = 14;
        tooltipEl.style.left = `${event.clientX + padding}px`;
        tooltipEl.style.top = `${event.clientY + padding}px`;
    }
});
