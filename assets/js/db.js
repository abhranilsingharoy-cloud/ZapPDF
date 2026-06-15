// db.js - IndexedDB wrapper for Recent Files History
window.ZapDB = {
    dbName: 'ZapPDF_DB',
    dbVersion: 1,
    storeName: 'recent_files',
    maxFiles: 3,
    maxSizeBytes: 20 * 1024 * 1024, // 20 MB

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (e) => reject("IndexedDB error: " + e.target.errorCode);

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    },

    async saveFile(file) {
        if (!this.db) await this.init();
        
        // Don't save if over 20MB
        if (file.size > this.maxSizeBytes) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            // Create a record
            const record = {
                name: file.name,
                type: file.type,
                size: file.size,
                data: file, // Store the Blob/File directly
                timestamp: Date.now()
            };

            const request = store.add(record);

            request.onsuccess = () => {
                this.enforceLimit();
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    },

    async getFiles() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('timestamp');
            
            // Get all files sorted by timestamp (descending)
            const request = index.openCursor(null, 'prev');
            const files = [];

            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    files.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(files);
                }
            };
            request.onerror = () => reject(request.error);
        });
    },

    async deleteFile(id) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async enforceLimit() {
        const files = await this.getFiles();
        if (files.length > this.maxFiles) {
            // Delete the oldest files
            const filesToDelete = files.slice(this.maxFiles);
            for (const file of filesToDelete) {
                await this.deleteFile(file.id);
            }
        }
    }
};
