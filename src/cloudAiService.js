/**
 * خدمة الذكاء الاصطناعي السحابي (Cloud AI Service)
 * تدعم نماذج Hugging Face المجانية فائقة الدقة:
 * 1. briaai/RMBG-1.4 (عزل خلفية احترافي بجودة استوديو 4K)
 * 2. GFPGAN / Real-ESRGAN (ترميم ملامح الوجه وتوضيح الصور الممسوحة والملتقطة بالموبايل)
 */

export class CloudAiService {
  static HF_RMBG_MODEL = 'https://api-inference.huggingface.co/models/briaai/RMBG-1.4';
  static HF_RESTORE_MODEL = 'https://api-inference.huggingface.co/models/akhaliq/GFPGAN';

  /**
   * استرجاع مفتاح Hugging Face المحفوظ في المتصفح
   */
  static getApiKey() {
    return localStorage.getItem('hf_api_key') || '';
  }

  /**
   * حفظ مفتاح Hugging Face
   */
  static setApiKey(key) {
    if (key && key.trim()) {
      localStorage.setItem('hf_api_key', key.trim());
    } else {
      localStorage.removeItem('hf_api_key');
    }
  }

  /**
   * فحص هل المفتاح متوفر
   */
  static hasApiKey() {
    return !!this.getApiKey();
  }

  /**
   * عزل الخلفية بدقة استوديو فائقة عبر Hugging Face RMBG-1.4
   * @param {Blob} imageBlob 
   * @param {string} apiKey 
   * @param {Function} onProgress 
   * @returns {Promise<Blob>}
   */
  static async removeBackgroundCloud(imageBlob, apiKey = null, onProgress = () => {}) {
    const token = apiKey || this.getApiKey();
    if (!token) {
      throw new Error('يرجى إدخال مفتاح Hugging Face API للاستخدام السحابي');
    }

    onProgress({ stage: 'cloud_upload', percent: 25, message: 'جاري إرسال الصورة للذكاء الاصطناعي السحابي (RMBG-1.4)...' });

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await fetch(this.HF_RMBG_MODEL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': imageBlob.type || 'image/jpeg'
          },
          body: imageBlob
        });

        if (response.status === 503) {
          const data = await response.json();
          const estimatedTime = Math.ceil(data.estimated_time || 20);
          onProgress({
            stage: 'model_loading',
            percent: 45,
            message: `جاري تشغيل خادم الذكاء الاصطناعي (انتظار تقريبي ${estimatedTime} ثوانٍ)...`
          });
          await new Promise((resolve) => setTimeout(resolve, (estimatedTime + 2) * 1000));
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`خطأ من الخادم (${response.status}): ${errText}`);
        }

        onProgress({ stage: 'cloud_complete', percent: 90, message: 'تم استلام الصورة المعزولة بدقة استوديو!' });
        const resultBlob = await response.blob();
        return resultBlob;

      } catch (err) {
        if (attempts >= maxAttempts) throw err;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    throw new Error('تعذر إكمال العزل السحابي بعد عدة محاولات');
  }

  /**
   * ترميم وتحسين ملامح الوجه وتوضيح الصور الممسوحة عبر GFPGAN
   * @param {Blob} imageBlob 
   * @param {string} apiKey 
   * @param {Function} onProgress 
   * @returns {Promise<Blob>}
   */
  static async restoreFaceCloud(imageBlob, apiKey = null, onProgress = () => {}) {
    const token = apiKey || this.getApiKey();
    if (!token) {
      throw new Error('يرجى إدخال مفتاح Hugging Face API');
    }

    onProgress({ stage: 'cloud_enhance', percent: 50, message: 'جاري ترميم ملامح الوجه بالذكاء الاصطناعي السحابي (GFPGAN)...' });

    try {
      const response = await fetch(this.HF_RESTORE_MODEL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': imageBlob.type || 'image/jpeg'
        },
        body: imageBlob
      });

      if (response.ok) {
        return await response.blob();
      }
      return null;
    } catch (err) {
      console.warn('Face restore API fallback:', err);
      return null;
    }
  }
}
