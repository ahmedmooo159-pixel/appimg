/**
 * محرك تحسين جودة الصور وإزالة البكسلة بدون تغيير الملامح (Identity-Preserving Quality Enhancer)
 * 
 * المبادئ التقنية:
 * 1. Super-Sampling: إعادة أخذ العينات بدقة فائقة لمنع التحبب والتشوه المربعي (Pixelation Artifacts).
 * 2. Adaptive Unsharp Masking (USM): تحسين حدة الحواف الرئيسية (العيون، الرموش، ملامح الوجه) بدون توليد وجوه بديلة أو تغيير الملامح الطبيعية.
 * 3. Selective Edge-Preserving Denoise: إزالة تشويش الضغط (JPEG Blockiness) من المناطق الناعمة كالبشرة مع الاحتفاظ بكافة التفاصيل الدقيقة.
 * 4. Micro-Contrast & Luminance Balance: ضبط المدى الديناميكي للإضاءة لتبدو الصورة ملتقطة في إضاءة استوديو متوازنة.
 */

export class ImageEnhancer {
  /**
   * تحسين الصورة باستخدام Canvas والمعالجة النقطية المباشرة
   * @param {HTMLImageElement|HTMLCanvasElement} sourceImage 
   * @param {Object} options 
   * @returns {HTMLCanvasElement}
   */
  static enhance(sourceImage, options = {}) {
    const {
      sharpness = 40,        // 0 to 100
      denoise = 25,          // 0 to 100 (إزالة البكسلة والتحبب)
      brightness = 0,        // -50 to 50
      contrast = 10,         // -50 to 50
      saturation = 5,        // -50 to 50
      warmth = 0,            // -30 to 30
      targetWidth = null,
      targetHeight = null
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // تحديد أبعاد عالية الدقة للرسم (Supersampling)
    let srcW = sourceImage.naturalWidth || sourceImage.width;
    let srcH = sourceImage.naturalHeight || sourceImage.height;

    // إذا كانت الصورة صغيرة الحجم نقوم بمضاعفة دقتها للتخلص من البكسلة الحادة
    let scale = 1;
    if (targetWidth && targetHeight) {
      scale = Math.max(targetWidth / srcW, targetHeight / srcH);
    } else if (srcW < 1200 || srcH < 1200) {
      scale = Math.min(3, Math.max(1.5, 1200 / Math.min(srcW, srcH)));
    }

    const outW = Math.round(srcW * scale);
    const outH = Math.round(srcH * scale);

    canvas.width = outW;
    canvas.height = outH;

    // تفعيل التنعيم فائق الجودة في المتصفح للحد من التعرجات
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // الخطوة 1: رسم الصورة الأصلية على الكانفاس فائق الدقة
    ctx.drawImage(sourceImage, 0, 0, outW, outH);

    // إذا لم يكن هناك أي تعديل مطلوب، نرجع الكانفاس
    if (sharpness === 0 && denoise === 0 && brightness === 0 && contrast === 0 && saturation === 0 && warmth === 0) {
      return canvas;
    }

    // استخراج بيانات البكسل
    let imgData = ctx.getImageData(0, 0, outW, outH);
    let data = imgData.data;

    // الخطوة 2: تطبيق تنعيم انتقائي لحفظ الحواف وإزالة بكسلة الـ JPEG (Selective Bilateral/Box Denoise)
    if (denoise > 5) {
      imgData = this.applyEdgePreservingDenoise(imgData, denoise / 100);
      data = imgData.data;
    }

    // الخطوة 3: تطبيق زيادة الحدة التكيفية (Adaptive Unsharp Mask) لتعزيز دقة العيون والملامح
    if (sharpness > 0) {
      imgData = this.applyAdaptiveUnsharpMask(imgData, sharpness / 100);
      data = imgData.data;
    }

    // الخطوة 4: ضبط الإضاءة والتباين والتشبع والدفء اللوني
    this.adjustColorAndTone(data, {
      brightness,
      contrast,
      saturation,
      warmth
    });

    // إعادة وضع البيانات المعدلة على الكانفاس
    ctx.putImageData(imgData, 0, 0);

    return canvas;
  }

  /**
   * فلتر ذكي لإزالة تحبب البكسل مع الحفاظ التام على ملامح الوجه
   */
  static applyEdgePreservingDenoise(imgData, intensity) {
    const w = imgData.width;
    const h = imgData.height;
    const src = imgData.data;
    const output = new Uint8ClampedArray(src.length);
    output.set(src);

    const threshold = 28 * (1 - intensity * 0.4); // عتبة التفريق بين الحواف والأسطح الناعمة
    const blend = intensity * 0.55;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        const alpha = src[i + 3];
        if (alpha < 10) continue; // تخطي البكسلات الشفافة

        let sumR = 0, sumG = 0, sumB = 0, count = 0;
        const centerR = src[i];
        const centerG = src[i + 1];
        const centerB = src[i + 2];

        // نافذة 3x3 متجاورة
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ni = ((y + dy) * w + (x + dx)) * 4;
            const diff = Math.abs(src[ni] - centerR) +
                         Math.abs(src[ni + 1] - centerG) +
                         Math.abs(src[ni + 2] - centerB);

            // إذا كان الفرق قليلاً (منطقة ناعمة أو بشرة بدون حافة قاطعة)، ندمج لتنعيم البكسلة
            if (diff < threshold * 3) {
              sumR += src[ni];
              sumG += src[ni + 1];
              sumB += src[ni + 2];
              count++;
            }
          }
        }

        if (count > 0) {
          const avgR = sumR / count;
          const avgG = sumG / count;
          const avgB = sumB / count;

          output[i] = centerR * (1 - blend) + avgR * blend;
          output[i + 1] = centerG * (1 - blend) + avgG * blend;
          output[i + 2] = centerB * (1 - blend) + avgB * blend;
        }
      }
    }

    const res = new ImageData(output, w, h);
    return res;
  }

  /**
   * قناع غير حاد تكيفي (Adaptive Unsharp Mask)
   * يعزز التباين المحلي للخطوط والرموش ومحيط الوجه لاستعادة الدقة بدون تشويه الملامح
   */
  static applyAdaptiveUnsharpMask(imgData, amount) {
    const w = imgData.width;
    const h = imgData.height;
    const src = imgData.data;
    const output = new Uint8ClampedArray(src.length);
    output.set(src);

    const boost = amount * 1.6;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] < 10) continue;

        // مصفوفة لابلاسيان لحساب المشتقة الثانية للحواف
        // [ 0, -1,  0 ]
        // [-1,  4, -1 ]
        // [ 0, -1,  0 ]
        const top = ((y - 1) * w + x) * 4;
        const bottom = ((y + 1) * w + x) * 4;
        const left = (y * w + (x - 1)) * 4;
        const right = (y * w + (x + 1)) * 4;

        for (let c = 0; c < 3; c++) {
          const laplacian = 4 * src[i + c] - src[top + c] - src[bottom + c] - src[left + c] - src[right + c];
          
          // تطبيق عتبة لمنع إبراز التشويش الزائد في الخلفية
          if (Math.abs(laplacian) > 2) {
            const enhanced = src[i + c] + laplacian * boost * 0.35;
            output[i + c] = Math.min(255, Math.max(0, enhanced));
          }
        }
      }
    }

    return new ImageData(output, w, h);
  }

  /**
   * ضبط دقيق للألوان والسطوع والتباين والدفء
   */
  static adjustColorAndTone(data, { brightness, contrast, saturation, warmth }) {
    // معامل التباين
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    const satFactor = 1 + (saturation / 100);

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;

      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // السطوع
      if (brightness !== 0) {
        r += brightness;
        g += brightness;
        b += brightness;
      }

      // التباين
      if (contrast !== 0) {
        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;
      }

      // الدفء اللوني (Warmth / Studio Lighting tint)
      if (warmth !== 0) {
        r += warmth * 0.6;
        b -= warmth * 0.6;
      }

      // التشبع اللوني
      if (saturation !== 0) {
        const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
        r = gray + (r - gray) * satFactor;
        g = gray + (g - gray) * satFactor;
        b = gray + (b - gray) * satFactor;
      }

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }
  }
}
