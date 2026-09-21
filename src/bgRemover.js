/**
 * محرك إزالة الخلفية — @imgly/background-removal (مجاني 100% — WASM محلي)
 * يشتغل بالكامل في المتصفح بدون أي سيرفر أو API Key
 * مع fallback يدوي كشبكة أمان أخيرة
 */

import { removeBackground } from '@imgly/background-removal';

export class BackgroundRemover {
  /**
   * عزل الخلفية باستخدام @imgly/background-removal (WASM محلي)
   * @param {HTMLImageElement} imgElement
   * @param {Function} onProgress
   * @returns {Promise<Blob>}
   */
  static async removeBackground(imgElement, onProgress = () => {}) {
    try {
      onProgress({ stage: 'starting', percent: 10, message: 'جاري تحميل نموذج الذكاء الاصطناعي...' });

      // تحويل الصورة لـ Blob أولاً
      const imageBlob = await this._imgToBlob(imgElement);

      onProgress({ stage: 'computing', percent: 30, message: 'جاري تحليل الصورة وعزل الشخص بالذكاء الاصطناعي...' });

      // استخدام @imgly/background-removal بنموذج ISNet FP16 السريع والدقيق
      const resultBlob = await removeBackground(imageBlob, {
        publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.7.0/dist/',
        model: 'isnet_fp16',
        output: {
          format: 'image/png',
          quality: 1.0
        },
        progress: (key, current, total) => {
          if (total && total > 0) {
            const pct = Math.min(95, 30 + Math.round((current / total) * 65));
            const mbDownloaded = (current / (1024 * 1024)).toFixed(1);
            const mbTotal = (total / (1024 * 1024)).toFixed(1);
            onProgress({
              stage: 'downloading',
              percent: pct,
              message: `جاري تنزيل نموذج الذكاء الاصطناعي... (${mbDownloaded} / ${mbTotal} MB)`
            });
          } else {
            onProgress({
              stage: 'computing',
              percent: 85,
              message: 'جاري عزل الخلفية بالذكاء الاصطناعي...'
            });
          }
        }
      });

      onProgress({ stage: 'complete', percent: 100, message: 'تم العزل بنجاح! ✨' });
      return resultBlob;

    } catch (err) {
      console.error('background-removal error:', err);
      onProgress({ stage: 'fallback', percent: 40, message: 'تعذّر تشغيل النموذج — تفعيل المعالج الاحتياطي...' });
      return this.fallbackEdgeMatting(imgElement, onProgress);
    }
  }

  /**
   * تحويل HTMLImageElement إلى Blob
   */
  static _imgToBlob(imgElement) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const w = imgElement.naturalWidth || imgElement.width;
      const h = imgElement.naturalHeight || imgElement.height;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgElement, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  /**
   * معالج محلي احتياطي محسّن (Fallback)
   * يستخدم كشف الحواف + حماية ألوان البشرة
   * يُستخدم فقط إذا فشل النموذج الرئيسي
   */
  static async fallbackEdgeMatting(imageSource, onProgress = () => {}) {
    return new Promise((resolve) => {
      const img = (imageSource instanceof HTMLImageElement) ? imageSource : new Image();
      img.crossOrigin = 'anonymous';

      const process = () => {
        onProgress({ stage: 'computing', percent: 70, message: 'معالجة محلية احتياطية...' });

        const canvas = document.createElement('canvas');
        const w = img.naturalWidth || img.width || 600;
        const h = img.naturalHeight || img.height || 800;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // حساب لون الخلفية من حواف الصورة
        const edgeSize = Math.max(4, Math.round(Math.min(w, h) * 0.05));
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (x < edgeSize || x >= w - edgeSize || y < edgeSize || y >= h - edgeSize) {
              const i = (y * w + x) * 4;
              rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2];
              count++;
            }
          }
        }
        const bgR = rSum / count;
        const bgG = gSum / count;
        const bgB = bSum / count;

        // حماية ألوان البشرة من الحذف
        function isSkinColor(r, g, b) {
          return (r > 60 && g > 30 && b > 20 && r > g && r > b &&
            Math.abs(r - g) > 8 && r < 250 && g < 220 && b < 200);
        }

        const softThreshold = 35;
        const hardThreshold = 55;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          if (isSkinColor(r, g, b)) continue;
          const diff = Math.sqrt(
            (r - bgR) ** 2 * 0.299 + (g - bgG) ** 2 * 0.587 + (b - bgB) ** 2 * 0.114
          );
          if (diff < softThreshold) {
            data[i + 3] = 0;
          } else if (diff < hardThreshold) {
            data[i + 3] = Math.round(((diff - softThreshold) / (hardThreshold - softThreshold)) * 255);
          }
        }

        onProgress({ stage: 'complete', percent: 100, message: 'تم!' });
        ctx.putImageData(imgData, 0, 0);
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      };

      if (img.complete && img.naturalWidth > 0) {
        process();
      } else {
        img.onload = process;
        if (typeof imageSource === 'string') img.src = imageSource;
      }
    });
  }

  /**
   * دمج الشخص المعزول فوق الخلفية المطلوبة
   */
  static compositeBackground(foreground, bgColor = '#FFFFFF', width = null, height = null) {
    const w = width || foreground.naturalWidth || foreground.width;
    const h = height || foreground.naturalHeight || foreground.height;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    if (bgColor && bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(foreground, 0, 0, w, h);

    return canvas;
  }
}
