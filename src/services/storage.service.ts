export class StorageService {
    async get<T>(key: string): Promise<T | null> {
        const result = await chrome.storage.local.get(key);
        return (result[key] as T) ?? null;
    }

    async set(key: string, value: unknown): Promise<void> {
        await chrome.storage.local.set({ [key]: value });
    }

    async remove(key: string): Promise<void> {
        await chrome.storage.local.remove(key);
    }

    async getSession<T>(key: string): Promise<T | null> {
        if (chrome.storage.session) {
            const result = await chrome.storage.session.get(key);
            return (result[key] as T) ?? null;
        }
        return this.get<T>(key);
    }

    async setSession(key: string, value: unknown): Promise<void> {
        if (chrome.storage.session) {
            await chrome.storage.session.set({ [key]: value });
        } else {
            await this.set(key, value);
        }
    }
}
