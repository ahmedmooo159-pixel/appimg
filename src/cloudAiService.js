/**
 * خدمة الذكاء الاصطناعي السحابي (Cloud AI Service)
 * تدعم:
 * 1. Remove.bg API (أقوى وأدق محرك عزل تجاري في العالم)
 * 2. Hugging Face RMBG-1.4 / RMBG-2.0 (نماذج استوديو فائقة الدقة)
 * 3. GFPGAN (ترميم ملامح الوجه وتحسين دقة الصور الشخصية)
 */

export class CloudAiService {
  // المفتاح الافتراضي المدمج لـ Remove.bg
  static REMOVE_BG_DEFAULT_KEY = 'ZFxK6taN5wMbgSAoCpucrAhd';

  static HF_ENDPOINTS = [
    'https://router.huggingface.co/hf-inference/models/briaai/RMBG-1.4',
    'https://router.huggingface.co/hf-inference/models/briaai/RMBG-2.0'
  ];
  static HF_RESTORE_MODEL = 'https://router.huggingface.co/hf-inference/models/akhaliq/GFPGAN';

  /**
   * استرجاع مفتاح Remove.bg المحفوظ أو الافتراضي
   */
  static getRemoveBgKey() {
    const saved = localStorage.getItem('removebg_api_key');
    if (saved !== null) {
      return saved.trim();
    }
    return this.REMOVE_BG_DEFAULT_KEY;
  }

  /**
   * حفظ مفتاح Remove.bg
   */
  static setRemoveBgKey(key) {
    if (key && key.trim()) {
      localStorage.setItem('removebg_api_key', key.trim());
    } else {
      localStorage.removeItem('removebg_api_key');
    }
  }

  /**
   * فحص هل مفتاح Remove.bg متوفر
   */
  static hasRemoveBgKey() {
    return !!this.getRemoveBgKey();
  }

  /**
   * فحص واختبار صحة ورصيد مفتاح Remove.bg
   * @param {string} key 
   * @returns {Promise<{success: boolean, message: string, freeCalls?: number, credits?: number}>}
   */
  static async testRemoveBgKey(key) {
    const token = (key || this.getRemoveBgKey()).trim();
    if (!token) {
      return { success: false, message: 'يرجى إدخال مفتاح Remove.bg أولاً' };
    }

    try {
      const res = await fetch('https://api.remove.bg/v1.0/account', {
        headers: {
          'X-Api-Key': token
        }
      });

      if (res.status === 403 || res.status === 401) {
        return {
          success: false,
          message: 'المفتاح غير صحيح أو تم إيقافه من Remove.bg (403 Forbidden).'
        };
      }

      if (res.ok) {
        const data = await res.json();
        const apiInfo = data?.data?.attributes?.api;
        const freeCalls = apiInfo?.free_calls ?? 0;
        const totalCredits = data?.data?.attributes?.credits?.total ?? 0;
        return {
          success: true,
          freeCalls,
          credits: totalCredits,
          message: `المفتاح صالح ومفعّل بنجاح! الرصيد المتاح: ${freeCalls} عملية مجانية شهرياً`
        };
      }

      return {
        success: false,
        message: `استجابة غير متوقعة من الخادم (كود ${res.status})`
      };
    } catch (err) {
      return {
        success: false,
        message: 'تعذر الاتصال بخوادم Remove.bg. تأكد من اتصال الإنترنت.'
      };
    }
  }

  /**
   * استرجاع مفتاح Hugging Face المحفوظ في المتصفح
   */
  static getApiKey() {
    return (localStorage.getItem('hf_api_key') || '').trim();
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
   * فحص هل مفتاح Hugging Face متوفر
   */
  static hasApiKey() {
    return !!this.getApiKey();
  }

  /**
   * فحص واختبار صحة مفتاح Hugging Face
   * @param {string} key 
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async testApiKey(key) {
    const token = (key || this.getApiKey()).trim();
    if (!token) {
      return { success: false, message: 'يرجى إدخال المفتاح أولاً' };
    }

    try {
      const res = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 401) {
        return {
          success: false,
          message: 'المفتاح غير صحيح أو منتهي الصلاحية (401 Unauthorized).'
        };
      }

      if (res.status === 403) {
        return {
          success: false,
          message: 'المفتاح لا يملك صلاحيات كافية (403 Forbidden). تأكد من تفعيل صلاحية "Make calls to Inference Providers".'
        };
      }

      if (res.ok) {
        const userData = await res.json();
        const username = userData.name || userData.fullname || 'مستخدم Hugging Face';
        return {
          success: true,
          message: `المفتاح صالح ومفعّل بنجاح! مرحباً ${username} ✨`
        };
      }

      return {
        success: false,
        message: `استجابة غير متوقعة من الخادم (كود ${res.status})`
      };
    } catch (err) {
      return {
        success: false,
        message: 'تعذر الاتصال بخوادم Hugging Face.'
      };
    }
  }

  /**
   * عزل الخلفية عبر محرك Remove.bg الاحترافي
   * @param {Blob} imageBlob 
   * @param {string} apiKey 
   * @param {Function} onProgress 
   * @returns {Promise<Blob>}
   */
  static async removeBackgroundRemoveBg(imageBlob, apiKey = null, onProgress = () => {}) {
    const key = (apiKey || this.getRemoveBgKey()).trim();
    if (!key) {
      throw new Error('يرجى توفير مفتاح Remove.bg');
    }

    onProgress({ stage: 'cloud_upload', percent: 30, message: 'جاري العزل بمحرك Remove.bg فائق الدقة...' });

    const formData = new FormData();
    formData.append('image_file', imageBlob, 'photo.png');
    formData.append('size', 'auto');
    formData.append('type', 'person');
    formData.append('format', 'png');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': key
      },
      body: formData
    });

    if (response.status === 402 || response.status === 429) {
      throw new Error('تم استنفاد رصيد طلبات Remove.bg المجانية لهذا الشهر.');
    }

    if (response.status === 403 || response.status === 401) {
      throw new Error('مفتاح Remove.bg غير صالح أو تم إيقافه.');
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      const errMsg = errJson?.errors?.[0]?.title || `خطأ من Remove.bg (${response.status})`;
      throw new Error(errMsg);
    }

    onProgress({ stage: 'cloud_complete', percent: 90, message: 'تم استلام الصورة المعزولة من Remove.bg بأعلى دقة! ✨' });
    return await response.blob();
  }

  /**
   * عزل الخلفية بدقة استوديو عبر Hugging Face RMBG-1.4 / RMBG-2.0
   * @param {Blob} imageBlob 
   * @param {string} apiKey 
   * @param {Function} onProgress 
   * @returns {Promise<Blob>}
   */
  static async removeBackgroundHf(imageBlob, apiKey = null, onProgress = () => {}) {
    const token = (apiKey || this.getApiKey()).trim();
    if (!token) {
      throw new Error('يرجى إدخال مفتاح Hugging Face API');
    }

    onProgress({ stage: 'cloud_upload', percent: 35, message: 'جاري المعالجة بنموذج Hugging Face RMBG...' });

    let lastError = null;

    for (const endpoint of this.HF_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': imageBlob.type || 'image/jpeg'
          },
          body: imageBlob
        });

        if (response.status === 401 || response.status === 403) {
          throw new Error('مفتاح Hugging Face غير صالح أو تنقصه صلاحية Inference Providers.');
        }

        if (response.status === 503) {
          let estimatedTime = 20;
          try {
            const data = await response.json();
            estimatedTime = Math.ceil(data.estimated_time || 20);
          } catch (_) {}
          
          onProgress({
            stage: 'model_loading',
            percent: 50,
            message: `جاري تشغيل خادم الذكاء الاصطناعي (انتظار تقريبي ${estimatedTime} ثوانٍ)...`
          });
          await new Promise((resolve) => setTimeout(resolve, (estimatedTime + 2) * 1000));
          continue;
        }

        if (response.ok) {
          onProgress({ stage: 'cloud_complete', percent: 90, message: 'تم استلام الصورة المعزولة بدقة استوديو! ✨' });
          return await response.blob();
        } else {
          const errText = await response.text().catch(() => '');
          lastError = new Error(`خطأ من الخادم (${response.status}): ${errText.substring(0, 100)}`);
        }
      } catch (endpointErr) {
        lastError = endpointErr;
        if (endpointErr.message && (endpointErr.message.includes('401') || endpointErr.message.includes('403'))) {
          throw endpointErr;
        }
        console.warn(`Failed endpoint ${endpoint}:`, endpointErr);
      }
    }

    throw lastError || new Error('تعذر إكمال العزل عبر Hugging Face');
  }

  /**
   * عزل الخلفية السحابي الذكي (يجرب Remove.bg أولاً ثم Hugging Face)
   * @param {Blob} imageBlob 
   * @param {Function} onProgress 
   * @returns {Promise<Blob>}
   */
  static async removeBackgroundCloud(imageBlob, onProgress = () => {}) {
    // 1. محاولة استخدام Remove.bg إن توفر المفتاح
    if (this.hasRemoveBgKey()) {
      try {
        return await this.removeBackgroundRemoveBg(imageBlob, null, onProgress);
      } catch (removeBgErr) {
        console.warn('Remove.bg failed, trying Hugging Face / Local fallback:', removeBgErr);
        onProgress({ stage: 'switching', percent: 40, message: 'جاري التبديل للمحرك البديل...' });
      }
    }

    // 2. محاولة استخدام Hugging Face RMBG إن توفر المفتاح
    if (this.hasApiKey()) {
      try {
        return await this.removeBackgroundHf(imageBlob, null, onProgress);
      } catch (hfErr) {
        console.warn('Hugging Face failed:', hfErr);
      }
    }

    throw new Error('تعذر إكمال العزل السحابي — جاري التبديل للمحرك المحلي الفوري');
  }

  /**
   * ترميم وتحسين ملامح الوجه وتوضيح الصور الممسوحة عبر GFPGAN
   * @param {Blob} imageBlob 
   * @param {string} apiKey 
   * @param {Function} onProgress 
   * @returns {Promise<Blob>}
   */
  static async restoreFaceCloud(imageBlob, apiKey = null, onProgress = () => {}) {
    const token = (apiKey || this.getApiKey()).trim();
    if (!token) return null;

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
