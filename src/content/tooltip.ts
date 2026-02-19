/**
 * Content script: shows a small score tooltip when hovering over links.
 */

interface TooltipScoreResponse {
    overallScore: number;
    url: string;
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
            background: #1a1a2e !important;
            color: #e0e0e0 !important;
            padding: 6px 12px !important;
            border-radius: 6px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-size: 12px !important;
            pointer-events: none !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
            display: none !important;
            white-space: nowrap !important;
            transition: opacity 0.15s !important;
        }
        #linkguard-tooltip.lg-visible {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
        }
        #linkguard-tooltip .lg-tt-score {
            font-weight: 700 !important;
            font-size: 14px !important;
        }
        #linkguard-tooltip .lg-tt-dot {
            width: 8px !important;
            height: 8px !important;
            border-radius: 50% !important;
            display: inline-block !important;
        }
    `;
    el.appendChild(style);
    document.body.appendChild(el);
    return el;
}

function showTooltip(score: number, x: number, y: number): void {
    if (!tooltipEl) {
        tooltipEl = createTooltip();
    }

    const color = score >= 60 ? "#2ecc71" : score >= 30 ? "#f39c12" : "#e74c3c";
    const label = score >= 60 ? "Safe" : score >= 30 ? "Caution" : "Danger";

    tooltipEl.innerHTML = tooltipEl.querySelector("style")?.outerHTML +
        `<span class="lg-tt-dot" style="background:${color}"></span>` +
        `<span class="lg-tt-score" style="color:${color}">${score}%</span>` +
        `<span>${label}</span>`;

    // Position near cursor, offset slightly
    const padding = 12;
    tooltipEl.style.left = `${x + padding}px`;
    tooltipEl.style.top = `${y + padding}px`;
    tooltipEl.classList.add("lg-visible");

    // Keep within viewport
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

// Hover listener with debounce
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
                showTooltip(score.overallScore, event.clientX, event.clientY);
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

// Follow cursor while tooltip is visible
document.addEventListener("mousemove", (event: MouseEvent) => {
    if (tooltipEl && tooltipEl.classList.contains("lg-visible") && currentHoverUrl) {
        const padding = 12;
        tooltipEl.style.left = `${event.clientX + padding}px`;
        tooltipEl.style.top = `${event.clientY + padding}px`;
    }
});
