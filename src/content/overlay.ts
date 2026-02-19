/**
 * Content script: injects a warning overlay into the page when a risky link is clicked.
 * Listens for custom events from link-scanner.ts.
 */

interface OverlayDetail {
    score: {
        overallScore: number;
        url: string;
        categories: Array<{
            name: string;
            score: number;
            weight: number;
            findings: Array<{ rule: string; description: string; severity: string }>;
        }>;
    };
    url: string;
    isBlocked: boolean;
}

let overlayElement: HTMLElement | null = null;

function createOverlay(detail: OverlayDetail): void {
    removeOverlay();

    const { score, url, isBlocked } = detail;

    overlayElement = document.createElement("div");
    overlayElement.id = "linkguard-overlay";
    overlayElement.setAttribute("role", "dialog");
    overlayElement.setAttribute("aria-modal", "true");
    overlayElement.setAttribute("aria-label", "Link Safety Warning");

    const scoreColor = score.overallScore >= 60 ? "#2ecc71" :
        score.overallScore >= 30 ? "#f39c12" : "#e74c3c";

    const statusText = isBlocked ? "BLOCKED" : "WARNING";
    const statusClass = isBlocked ? "blocked" : "warning";

    let findingsHtml = "";
    for (const cat of score.categories) {
        if (cat.findings.length > 0) {
            findingsHtml += `<div class="lg-category">
                <div class="lg-cat-header">
                    <span class="lg-cat-name">${escapeHtml(cat.name)}</span>
                    <span class="lg-cat-score" style="color:${cat.score >= 60 ? "#2ecc71" : cat.score >= 30 ? "#f39c12" : "#e74c3c"}">${cat.score}/100</span>
                </div>
                <ul class="lg-findings">
                    ${cat.findings.map((f) => `<li class="lg-finding lg-${f.severity}">${escapeHtml(f.description)}</li>`).join("")}
                </ul>
            </div>`;
        }
    }

    overlayElement.innerHTML = `
        <div class="lg-backdrop"></div>
        <div class="lg-dialog">
            <div class="lg-header lg-${statusClass}">
                <div class="lg-shield">&#x1f6e1;</div>
                <h2>Link Guard — ${statusText}</h2>
            </div>
            <div class="lg-body">
                <div class="lg-score-ring">
                    <div class="lg-score-value" style="color:${scoreColor}">${score.overallScore}%</div>
                    <div class="lg-score-label">Safety Score</div>
                </div>
                <div class="lg-url">${escapeHtml(truncateUrl(url, 80))}</div>
                <div class="lg-details">
                    ${findingsHtml || '<p class="lg-no-findings">No specific threats detected.</p>'}
                </div>
            </div>
            <div class="lg-actions">
                <button class="lg-btn lg-btn-back" id="linkguard-go-back">Go Back</button>
                ${!isBlocked || detail.score.overallScore >= 0 ?
            `<button class="lg-btn lg-btn-proceed" id="linkguard-proceed">Proceed Anyway</button>` : ""}
            </div>
        </div>
    `;

    // Inject inline styles to avoid CSP issues with external stylesheets
    const style = document.createElement("style");
    style.textContent = getOverlayStyles();
    overlayElement.appendChild(style);

    document.body.appendChild(overlayElement);

    // Event listeners
    const goBackBtn = document.getElementById("linkguard-go-back");
    if (goBackBtn) {
        goBackBtn.addEventListener("click", () => removeOverlay());
    }

    const proceedBtn = document.getElementById("linkguard-proceed");
    if (proceedBtn) {
        proceedBtn.addEventListener("click", () => {
            removeOverlay();
            window.location.href = url;
        });
    }

    // Close on backdrop click
    const backdrop = overlayElement.querySelector(".lg-backdrop");
    if (backdrop) {
        backdrop.addEventListener("click", () => removeOverlay());
    }

    // Close on Escape
    document.addEventListener("keydown", handleEscape);
}

function handleEscape(e: KeyboardEvent): void {
    if (e.key === "Escape") {
        removeOverlay();
        document.removeEventListener("keydown", handleEscape);
    }
}

function removeOverlay(): void {
    if (overlayElement && overlayElement.parentNode) {
        overlayElement.parentNode.removeChild(overlayElement);
        overlayElement = null;
    }
}

function escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function truncateUrl(url: string, maxLen: number): string {
    if (url.length <= maxLen) return url;
    return url.substring(0, maxLen - 3) + "...";
}

function getOverlayStyles(): string {
    return `
        #linkguard-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 2147483647 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        .lg-backdrop {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6);
        }
        .lg-dialog {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: #1a1a2e;
            border-radius: 12px;
            width: 480px;
            max-width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
            color: #e0e0e0;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .lg-header {
            padding: 20px 24px;
            border-radius: 12px 12px 0 0;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .lg-header.lg-blocked { background: #c0392b; }
        .lg-header.lg-warning { background: #d68910; }
        .lg-header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #fff;
        }
        .lg-shield { font-size: 28px; }
        .lg-body { padding: 24px; }
        .lg-score-ring {
            text-align: center;
            margin-bottom: 16px;
        }
        .lg-score-value {
            font-size: 48px;
            font-weight: 700;
            line-height: 1;
        }
        .lg-score-label {
            font-size: 14px;
            color: #888;
            margin-top: 4px;
        }
        .lg-url {
            background: #16213e;
            padding: 10px 14px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 13px;
            word-break: break-all;
            color: #7f8fa6;
            margin-bottom: 16px;
        }
        .lg-details { max-height: 200px; overflow-y: auto; }
        .lg-category { margin-bottom: 12px; }
        .lg-cat-header {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 4px;
        }
        .lg-findings {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .lg-finding {
            font-size: 12px;
            padding: 4px 8px;
            margin: 2px 0;
            border-radius: 4px;
            border-left: 3px solid;
        }
        .lg-critical { border-color: #e74c3c; background: rgba(231,76,60,0.1); }
        .lg-high { border-color: #e67e22; background: rgba(230,126,34,0.1); }
        .lg-medium { border-color: #f39c12; background: rgba(243,156,18,0.1); }
        .lg-low { border-color: #3498db; background: rgba(52,152,219,0.1); }
        .lg-info { border-color: #2ecc71; background: rgba(46,204,113,0.1); }
        .lg-actions {
            padding: 16px 24px;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            border-top: 1px solid #2a2a4a;
        }
        .lg-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .lg-btn:hover { opacity: 0.85; }
        .lg-btn-back {
            background: #2ecc71;
            color: #fff;
        }
        .lg-btn-proceed {
            background: transparent;
            border: 1px solid #555;
            color: #888;
        }
    `;
}

// Listen for events from link-scanner.ts
document.addEventListener("linkguard-show-overlay", ((event: CustomEvent<OverlayDetail>) => {
    createOverlay(event.detail);
}) as EventListener);
