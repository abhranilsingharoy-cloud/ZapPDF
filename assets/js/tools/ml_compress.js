// ml_compress.js - Machine Learning inference engine for Smart Compression

window.ZapSmartCompress = {
    modelTree: null,
    isLoaded: false,

    async init() {
        try {
            // Load the exported Decision Tree JSON model
            const response = await fetch('assets/js/model/compression_tree.json');
            if (!response.ok) throw new Error("Model not found");
            this.modelTree = await response.json();
            this.isLoaded = true;
            console.log("[ZapPDF ML] Smart Compression Decision Tree loaded successfully.");
        } catch (e) {
            console.warn("[ZapPDF ML] Failed to load smart compression model. Falling back to basic heuristics.", e);
        }
    },

    // Evaluate the Decision Tree recursively
    evaluateTree(node, features) {
        if (node.is_leaf) {
            return node.value; // Returns array [quality, scale]
        }
        
        const featureValue = features[node.feature];
        if (featureValue <= node.threshold) {
            return this.evaluateTree(node.left, features);
        } else {
            return this.evaluateTree(node.right, features);
        }
    },

    predict(originalSizeMB, targetSizeMB, numPages) {
        if (!this.isLoaded || !this.modelTree) {
            // Fallback heuristic if model fails to load
            let ratio = targetSizeMB / originalSizeMB;
            let quality = Math.max(0.1, Math.min(0.95, ratio));
            let scale = 1.5;
            return { quality, scale };
        }
        
        // Features MUST match the order used during training in Python:
        // [original_size_mb, target_size_mb, num_pages]
        const features = [originalSizeMB, targetSizeMB, numPages];
        
        const prediction = this.evaluateTree(this.modelTree, features);
        
        return {
            quality: prediction[0],
            scale: prediction[1]
        };
    }
};

// Initialize automatically when loaded
document.addEventListener('DOMContentLoaded', () => {
    ZapSmartCompress.init();
});
