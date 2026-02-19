// Polyfill performance.now for Node.js test environment
if (typeof globalThis.performance === "undefined") {
    (globalThis as any).performance = {
        now: () => {
            const [sec, nsec] = process.hrtime();
            return sec * 1000 + nsec / 1e6;
        },
    };
}
