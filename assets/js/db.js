/**
 * db.js
 * Handles client-side IndexedDB storage for Recent Files History.
 * Ensures a maximum of 3 recent files are stored locally.
 */

window.ZapDB = {
    dbName: 'ZapPDF_DB',
    storeName: 'recent_files',
    maxFiles: 3,
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            if (this.db) return resolve();

            const request = indexedDB.open(this.dbName, 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    async saveFile(file) {
        await this.init();
        return new Promise(async (resolve, reject) => {
            try {
                // Create a unique ID or use filename + timestamp
                const id = `${Date.now()}_${file.name}`;
                const record = {
                    id: id,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    timestamp: Date.now(),
                    data: file // IndexedDB natively supports storing File objects
                };

                const tx = this.db.transaction([this.storeName], 'readwrite');
                const store = tx.objectStore(this.storeName);
                
                store.add(record);

                tx.oncomplete = async () => {
                    await this.enforceLimit();
                    resolve(record);
                };
                tx.onerror = () => reject(tx.error);
            } catch (err) {
                reject(err);
            }
        });
    },

    async getRecentFiles() {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                // Sort by timestamp descending (newest first)
                let files = request.result;
                files.sort((a, b) => b.timestamp - a.timestamp);
                resolve(files);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async getFile(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async deleteFile(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async enforceLimit() {
        // Fetch all files, if length > maxFiles, delete oldest
        const files = await this.getRecentFiles();
        if (files.length > this.maxFiles) {
            // The files are sorted newest first. We need to delete from the end.
            const toDelete = files.slice(this.maxFiles);
            for (const file of toDelete) {
                await this.deleteFile(file.id);
            }
        }
    }
};
