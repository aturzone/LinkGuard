/**
 * Content script: renders full-page overlay for warnings/blocks.
 * LinkGuard v2.0 — modern glassmorphism design.
 */

interface OverlayEventDetail {
    score: {
        overallScore: number;
        url: string;
        categories: Array<{
            name: string;
            score: number;
            findings: Array<{ rule: string; description: string; severity: string }>;
        }>;
    };
    url: string;
    isBlocked: boolean;
}

let overlayEl: HTMLElement | null = null;

function createOverlay(detail: OverlayEventDetail): void {
    removeOverlay();

    const { score, url, isBlocked } = detail;
    const color = isBlocked ? "#EF4444" : "#EAB308";
    const title = isBlocked ? "Link Blocked" : "Proceed with Caution";
    const subtitle = isBlocked
        ? "This link scored below the safety threshold and has been blocked."
        : "This link has a low safety score. Proceed carefully.";

    const shieldSvg = isBlocked
        ? `<svg viewBox="0 0 512 512" width="56" height="56"><path d="M256 28C256 28 56 100 56 100C56 100 56 300 56 300C56 420 256 492 256 492C256 492 456 420 456 420C456 300 456 100 456 100C456 100 256 28 256 28Z" stroke="${color}" stroke-width="24" fill="${color}" fill-opacity="0.1"/><line x1="180" y1="180" x2="332" y2="332" stroke="${color}" stroke-width="36" stroke-linecap="round"/><line x1="332" y1="180" x2="180" y2="332" stroke="${color}" stroke-width="36" stroke-linecap="round"/></svg>`
        : `<svg viewBox="0 0 512 512" width="56" height="56"><path d="M256 28C256 28 56 100 56 100C56 100 56 300 56 300C56 420 256 492 256 492C256 492 456 420 456 420C456 300 456 100 456 100C456 100 256 28 256 28Z" stroke="${color}" stroke-width="24" fill="${color}" fill-opacity="0.1"/><line x1="256" y1="160" x2="256" y2="300" stroke="${color}" stroke-width="36" stroke-linecap="round"/><circle cx="256" cy="370" r="18" fill="${color}"/></svg>`;

    const overlay = document.createElement("div");
    overlay.id = "linkguard-overlay";

    const style = document.createElement("style");
    style.textContent = `
        #linkguard-overlay {
            position: fixed !important;
            inset: 0 !important;
            z-index: 2147483647 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: rgba(0,0,0,0.75) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            animation: lgOverlayIn 200ms ease !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif !important;
            -webkit-font-smoothing: antialiased !important;
        }
        @keyframes lgOverlayIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        #linkguard-overlay .lg-ov-card {
            background: #111827 !important;
            border: 1px solid #1E293B !important;
            border-radius: 16px !important;
            padding: 32px !important;
            max-width: 440px !important;
            width: 90% !important;
            text-align: center !important;
            box-shadow: 0 24px 48px rgba(0,0,0,0.5) !important;
            animation: lgCardIn 250ms ease !important;
        }
        @keyframes lgCardIn {
            from { opacity: 0; transform: scale(0.95) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        #linkguard-overlay .lg-ov-shield { margin-bottom: 16px !important; }
        #linkguard-overlay .lg-ov-title {
            font-size: 22px !important;
            font-weight: 800 !important;
            color: ${color} !important;
            margin-bottom: 6px !important;
            letter-spacing: -0.5px !important;
        }
        #linkguard-overlay .lg-ov-subtitle {
            font-size: 13px !important;
            color: #94A3B8 !important;
            margin-bottom: 20px !important;
            line-height: 1.5 !important;
        }
        #linkguard-overlay .lg-ov-score-chip {
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            background: rgba(0,0,0,0.3) !important;
            padding: 8px 20px !important;
            border-radius: 24px !important;
            margin-bottom: 16px !important;
            font-size: 20px !important;
            font-weight: 800 !important;
            color: ${color} !important;
        }
        #linkguard-overlay .lg-ov-url {
            background: #0B1120 !important;
            border: 1px solid #1E293B !important;
            padding: 10px 14px !important;
            border-radius: 8px !important;
            font-family: monospace !important;
            font-size: 12px !important;
            color: #94A3B8 !important;
            word-break: break-all !important;
            text-align: left !important;
            margin-bottom: 20px !important;
            max-height: 60px !important;
            overflow-y: auto !important;
        }
        #linkguard-overlay .lg-ov-actions {
            display: flex !important;
            gap: 10px !important;
            justify-content: center !important;
        }
        #linkguard-overlay .lg-ov-btn {
            padding: 10px 24px !important;
            border: none !important;
            border-radius: 8px !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            transition: all 0.12s ease !important;
        }
        #linkguard-overlay .lg-ov-btn:hover { transform: translateY(-1px) !important; }
        #linkguard-overlay .lg-ov-btn-safe {
            background: #22C55E !important;
            color: #fff !important;
        }
        #linkguard-overlay .lg-ov-btn-proceed {
            background: transparent !important;
            border: 1px solid #334155 !important;
            color: #64748B !important;
        }
    `;

    overlay.appendChild(style);
    overlay.innerHTML += `
        <div class="lg-ov-card">
            <div class="lg-ov-shield">${shieldSvg}</div>
            <div class="lg-ov-title">${title}</div>
            <div class="lg-ov-subtitle">${subtitle}</div>
            <div class="lg-ov-score-chip">${score.overallScore}% Safety</div>
            <div class="lg-ov-url">${escapeHtml(url)}</div>
            <div class="lg-ov-actions">
                <button class="lg-ov-btn lg-ov-btn-safe" id="lg-ov-back">Go Back</button>
                <button class="lg-ov-btn lg-ov-btn-proceed" id="lg-ov-proceed">Proceed Anyway</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    overlayEl = overlay;

    overlay.querySelector("#lg-ov-back")?.addEventListener("click", removeOverlay);
    overlay.querySelector("#lg-ov-proceed")?.addEventListener("click", () => {
        removeOverlay();
        window.location.href = url;
    });

    // Close on escape
    document.addEventListener("keydown", handleEscape);
}

function handleEscape(e: KeyboardEvent): void {
    if (e.key === "Escape") removeOverlay();
}

function removeOverlay(): void {
    if (overlayEl) {
        overlayEl.remove();
        overlayEl = null;
    }
    document.removeEventListener("keydown", handleEscape);
}

function escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// Listen for overlay events from link-scanner.ts
document.addEventListener("linkguard-show-overlay", ((e: CustomEvent<OverlayEventDetail>) => {
    createOverlay(e.detail);
}) as EventListener);
