const DB_NAME = 'GoMusicLocalDB';
const DB_VERSION = 1;
export class LocalDB {
    constructor() {
        Object.defineProperty(this, "db", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
    }
    async init() {
        if (this.db)
            return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Tracks store
                if (!db.objectStoreNames.contains('tracks')) {
                    db.createObjectStore('tracks', { keyPath: 'id' });
                }
                // Playlists store
                if (!db.objectStoreNames.contains('playlists')) {
                    db.createObjectStore('playlists', { keyPath: 'id' });
                }
                // Settings / Stats store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            request.onerror = (_event) => {
                console.error('Failed to open local database:', request.error);
                reject(request.error);
            };
        });
    }
    async getStore(storeName, mode) {
        const db = await this.init();
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }
    // --- Track operations ---
    async saveTrack(track) {
        const store = await this.getStore('tracks', 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(track);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    async getTracks() {
        const store = await this.getStore('tracks', 'readonly');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }
    async getTrack(id) {
        const store = await this.getStore('tracks', 'readonly');
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }
    async deleteTrack(id) {
        const store = await this.getStore('tracks', 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    // --- Playlist operations ---
    async savePlaylist(playlist) {
        const store = await this.getStore('playlists', 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(playlist);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    async getPlaylists() {
        const store = await this.getStore('playlists', 'readonly');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }
    async getPlaylist(id) {
        const store = await this.getStore('playlists', 'readonly');
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }
    async deletePlaylist(id) {
        const store = await this.getStore('playlists', 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    // --- General settings/states store ---
    async saveSetting(key, value) {
        const store = await this.getStore('settings', 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    async getSetting(key) {
        try {
            const store = await this.getStore('settings', 'readonly');
            return new Promise((resolve, reject) => {
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result !== undefined ? request.result : null);
                request.onerror = () => reject(request.error);
            });
        }
        catch {
            return null;
        }
    }
    async deleteDatabase() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(DB_NAME);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error('Close other Auralyx tabs before clearing local data.'));
        });
    }
}
export const localDb = new LocalDB();
