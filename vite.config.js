import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // @imgly/background-removal يحتوي على ملفات WASM كبيرة
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@imgly/background-removal')) {
            return 'bg-removal';
          }
          if (id.includes('jspdf')) {
            return 'pdf';
          }
        }
      }
    }
  },

  optimizeDeps: {
    // استبعاد من الـ pre-bundling عشان تشتغل صح مع WASM
    exclude: ['@imgly/background-removal'],
  },

  server: {
    port: 5173,
    headers: {
      // مطلوب لـ SharedArrayBuffer (يسرّع نموذج إزالة الخلفية)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    }
  }
});
