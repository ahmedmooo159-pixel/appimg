/**
 * المتحكم الرئيسي للتطبيق (Application Controller)
 * يربط بين الذكاء الاصطناعي، خوارزميات معالجة الصور، مدقق الرقم القومي، وواجهة المستخدم
 */

import confetti from 'canvas-confetti';
import { BackgroundRemover } from './bgRemover.js';
import { ImageEnhancer } from './enhancer.js';
import { parseNationalID } from './nidValidator.js';
import { CardRenderer, PHOTO_PRESETS } from './cardRenderer.js';
import { createSamplePortraitDataUrl } from './sampleImage.js';

// حالة التطبيق (Application State)
const state = {
  originalImage: null,          // HTMLImageElement
  isolatedForeground: null,     // HTMLImageElement (بدون خلفية)
  enhancedForeground: null,     // HTMLCanvasElement
  finalRenderedCanvas: null,    // HTMLCanvasElement
  _isolatedObjectUrl: null,     // لتنظيف الـ Object URL ومنع تسريب الذاكرة
  selectedPreset: 'id_4x6',
  selectedBgColor: '#ffffff',
  badgeStyle: 'strip',          // 'strip' | 'badge' | 'none'
  fullName: '',
  nationalId: '',
  enhancement: {
    sharpness: 45,
    denoise: 30,
    brightness: 0,
    contrast: 10
  },
  isProcessing: false
};

// عناصر واجهة المستخدم
const DOM = {
  fileInput: document.getElementById('fileInput'),
  dropzoneArea: document.getElementById('dropzoneArea'),
  btnBrowseFile: document.getElementById('btnBrowseFile'),
  btnLoadSample: document.getElementById('btnLoadSample'),
  btnChangePhoto: document.getElementById('btnChangePhoto'),
  btnResetEnhance: document.getElementById('btnResetEnhance'),

  processingStatusBar: document.getElementById('processingStatusBar'),
  processingStatusText: document.getElementById('processingStatusText'),
  processingPercentText: document.getElementById('processingPercentText'),
  processingProgressBar: document.getElementById('processingProgressBar'),

  previewContainer: document.getElementById('previewContainer'),
  previewToolbar: document.getElementById('previewToolbar'),
  originalImgView: document.getElementById('originalImgView'),
  processedImgView: document.getElementById('processedImgView'),
  comparisonBox: document.getElementById('comparisonBox'),
  comparisonOverlay: document.getElementById('comparisonOverlay'),
  comparisonRange: document.getElementById('comparisonRange'),
  sliderHandle: document.getElementById('sliderHandle'),
  previewDimensionsBadge: document.getElementById('previewDimensionsBadge'),

  presetSelector: document.getElementById('presetSelector'),
  bgColorSelector: document.getElementById('bgColorSelector'),

  inputName: document.getElementById('inputName'),
  inputNID: document.getElementById('inputNID'),
  nidStatusCard: document.getElementById('nidStatusCard'),
  nidStatusText: document.getElementById('nidStatusText'),

  btnStyleStrip: document.getElementById('btnStyleStrip'),
  btnStyleBadge: document.getElementById('btnStyleBadge'),
  btnStyleNone: document.getElementById('btnStyleNone'),

  sliderSharpness: document.getElementById('sliderSharpness'),
  sliderDenoise: document.getElementById('sliderDenoise'),
  sliderBrightness: document.getElementById('sliderBrightness'),
  sliderContrast: document.getElementById('sliderContrast'),
  valSharpness: document.getElementById('valSharpness'),
  valDenoise: document.getElementById('valDenoise'),
  valBrightness: document.getElementById('valBrightness'),
  valContrast: document.getElementById('valContrast'),

  btnDownloadSingle: document.getElementById('btnDownloadSingle'),
  btnDownloadSheet: document.getElementById('btnDownloadSheet'),
  btnDownloadPDF: document.getElementById('btnDownloadPDF'),
  toastContainer: document.getElementById('toastContainer')
};

/**
 * التهيئة وربط الأحداث
 */
function init() {
  setupUploadEvents();
  setupComparisonSlider();
  setupPresetEvents();
  setupBgColorEvents();
  setupInputEvents();
  setupEnhancementSliders();
  setupExportButtons();
}

/**
 * إعداد أحداث رفع وسحب الصور
 */
function setupUploadEvents() {
  DOM.btnBrowseFile.addEventListener('click', () => DOM.fileInput.click());

  DOM.fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleImageFile(file);
  });

  // السحب والإفلات (Drag & Drop)
  ['dragenter', 'dragover'].forEach((eventName) => {
    DOM.dropzoneArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      DOM.dropzoneArea.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    DOM.dropzoneArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      DOM.dropzoneArea.classList.remove('dragover');
    });
  });

  DOM.dropzoneArea.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file);
    } else {
      showToast('يرجى اختيار ملف صورة صالح (JPG أو PNG)', 'error');
    }
  });

  // زر تحميل الصورة التوضيحية
  DOM.btnLoadSample.addEventListener('click', () => {
    const sampleDataUrl = createSamplePortraitDataUrl();
    loadImageFromSrc(sampleDataUrl, 'صورة نموذج رسمية');
  });

  // زر تغيير الصورة
  DOM.btnChangePhoto.addEventListener('click', () => {
    DOM.fileInput.value = '';
    DOM.fileInput.click();
  });

  // زر إعادة ضبط الفلاتر
  DOM.btnResetEnhance.addEventListener('click', () => {
    state.enhancement = { sharpness: 45, denoise: 30, brightness: 0, contrast: 10 };
    DOM.sliderSharpness.value = 45;
    DOM.sliderDenoise.value = 30;
    DOM.sliderBrightness.value = 0;
    DOM.sliderContrast.value = 10;
    updateSliderLabels();
    reprocessEnhanceAndRender();
    showToast('تمت إعادة ضبط فلاتر الجودة إلى الإعدادات القياسية');
  });
}

/**
 * معالجة ملف الصورة المرفوع
 */
function handleImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    loadImageFromSrc(e.target.result, file.name);
  };
  reader.readAsDataURL(file);
}

/**
 * تحميل الصورة والبدء في العزل التلقائي
 */
function loadImageFromSrc(src, filename = 'image.png') {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    state.originalImage = img;
    DOM.originalImgView.src = src;

    // إظهار واجهة المعالجة
    DOM.processingStatusBar.style.display = 'block';
    DOM.btnDownloadSingle.disabled = true;
    DOM.btnDownloadSheet.disabled = true;
    DOM.btnDownloadPDF.disabled = true;

    startBackgroundRemovalAndEnhance();
  };
  img.src = src;
}

/**
 * تشغيل عزل الخلفية بالذكاء الاصطناعي مع إظهار النسبة الحية
 */
async function startBackgroundRemovalAndEnhance() {
  if (!state.originalImage) return;

  state.isProcessing = true;
  DOM.processingStatusText.textContent = 'جاري تحليل الصورة وعزل الخلفية بالذكاء الاصطناعي...';
  DOM.processingProgressBar.style.width = '15%';
  DOM.processingPercentText.textContent = '15%';

  try {
    const isolatedBlob = await BackgroundRemover.removeBackground(
      state.originalImage,
      ({ percent, message }) => {
        DOM.processingProgressBar.style.width = `${percent}%`;
        DOM.processingPercentText.textContent = `${percent}%`;
        if (message) DOM.processingStatusText.textContent = message;
      }
    );

    // تنظيف الـ Object URL السابق لمنع تسريب الذاكرة
    if (state._isolatedObjectUrl) {
      URL.revokeObjectURL(state._isolatedObjectUrl);
      state._isolatedObjectUrl = null;
    }

    // تحويل الـ Blob إلى صورة معزولة
    const isolatedUrl = URL.createObjectURL(isolatedBlob);
    state._isolatedObjectUrl = isolatedUrl;
    const isolatedImg = new Image();
    isolatedImg.crossOrigin = 'anonymous';
    isolatedImg.onload = () => {
      state.isolatedForeground = isolatedImg;

      // إخفاء شريط المعالجة وإظهار المعاينة
      DOM.processingStatusBar.style.display = 'none';
      DOM.dropzoneArea.style.display = 'none';
      DOM.previewContainer.style.display = 'flex';
      DOM.previewToolbar.style.display = 'flex';

      // معالجة الجودة وإزالة البكسلة
      reprocessEnhanceAndRender();

      // تمكين التنزيل
      DOM.btnDownloadSingle.disabled = false;
      DOM.btnDownloadSheet.disabled = false;
      DOM.btnDownloadPDF.disabled = false;

      showToast('تم عزل الخلفية وتحسين الجودة بنجاح!', 'success');
    };
    isolatedImg.src = isolatedUrl;

  } catch (err) {
    console.error(err);
    DOM.processingStatusText.textContent = 'حدث خطأ أثناء المعالجة، جاري استخدام النمط الاحتياطي...';
    showToast('حدث خطأ في تحميل النموذج، يرجى المحاولة مجدداً', 'error');
  } finally {
    state.isProcessing = false;
  }
}

/**
 * إعادة تشغيل تحسين الجودة ورسم الكانفاس النهائي
 */
function reprocessEnhanceAndRender() {
  if (!state.isolatedForeground) return;

  // 1. تحسين الجودة وإزالة البكسلة بدون تغيير الملامح
  const enhancedCanvas = ImageEnhancer.enhance(state.isolatedForeground, {
    sharpness: state.enhancement.sharpness,
    denoise: state.enhancement.denoise,
    brightness: state.enhancement.brightness,
    contrast: state.enhancement.contrast
  });

  state.enhancedForeground = enhancedCanvas;

  // 2. دمج الخلفية المختارة (أبيض افتراضياً)
  const compositeCanvas = BackgroundRemover.compositeBackground(
    enhancedCanvas,
    state.selectedBgColor
  );

  // 3. الرسم النهائي مع الشريط والاسم والرقم القومي والمقاس
  const finalCanvas = CardRenderer.render({
    image: compositeCanvas,
    name: state.fullName,
    nationalId: state.nationalId,
    presetKey: state.selectedPreset,
    badgeStyle: state.badgeStyle,
    showBorder: true
  });

  state.finalRenderedCanvas = finalCanvas;

  // تحديث المعاينة في المتصفح
  const finalDataUrl = finalCanvas.toDataURL('image/png');
  DOM.processedImgView.src = finalDataUrl;

  // تحديث شارة الأبعاد
  const preset = PHOTO_PRESETS[state.selectedPreset];
  if (preset && preset.cmWidth) {
    DOM.previewDimensionsBadge.textContent = `${preset.cmWidth} × ${preset.cmHeight} سم (300 DPI)`;
  } else {
    DOM.previewDimensionsBadge.textContent = `${finalCanvas.width} × ${finalCanvas.height} px`;
  }
}

/**
 * إعداد سلايدر المقارنة التفاعلي (Before / After Slider)
 */
function setupComparisonSlider() {
  const updateSplit = (val) => {
    DOM.comparisonOverlay.style.width = `${val}%`;
    DOM.sliderHandle.style.left = `${val}%`;
  };

  DOM.comparisonRange.addEventListener('input', (e) => {
    updateSplit(e.target.value);
  });

  // تحديث أولي عند 50%
  updateSplit(50);
}

/**
 * إعداد اختيار المقاسات الرسمية
 */
function setupPresetEvents() {
  const chips = DOM.presetSelector.querySelectorAll('.preset-chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.selectedPreset = chip.getAttribute('data-preset');
      reprocessEnhanceAndRender();
    });
  });
}

/**
 * إعداد اختيار لون الخلفية
 */
function setupBgColorEvents() {
  const dots = DOM.bgColorSelector.querySelectorAll('.color-dot');
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      dots.forEach((d) => d.classList.remove('active'));
      dot.classList.add('active');
      state.selectedBgColor = dot.getAttribute('data-color');
      reprocessEnhanceAndRender();
    });
  });
}

/**
 * إعداد حقول الاسم والرقم القومي ومدقق الـ 14 رقم
 */
function setupInputEvents() {
  // الاسم
  DOM.inputName.addEventListener('input', (e) => {
    state.fullName = e.target.value;
    reprocessEnhanceAndRender();
  });

  // الرقم القومي
  DOM.inputNID.addEventListener('input', (e) => {
    const rawVal = e.target.value;
    state.nationalId = rawVal;

    // تدقيق الرقم القومي واستخراج البيانات
    const result = parseNationalID(rawVal);
    if (result.valid) {
      DOM.nidStatusCard.style.display = 'flex';
      DOM.nidStatusCard.className = 'nid-verification-card';
      DOM.nidStatusText.textContent = `✓ الرقم القومي صالح: ${result.summary}`;
    } else if (result.partial) {
      DOM.nidStatusCard.style.display = 'flex';
      DOM.nidStatusCard.className = 'nid-verification-card';
      DOM.nidStatusText.textContent = `جاري الإدخال (${result.length} من 14 رقماً)`;
    } else if (rawVal.trim().length > 0) {
      DOM.nidStatusCard.style.display = 'flex';
      DOM.nidStatusCard.className = 'nid-verification-card invalid';
      DOM.nidStatusText.textContent = `✕ ${result.message || 'رقم قومي غير صالح'}`;
    } else {
      DOM.nidStatusCard.style.display = 'none';
    }

    reprocessEnhanceAndRender();
  });

  // أزرار نمط الشريط
  const styleBtns = [
    { btn: DOM.btnStyleStrip, style: 'strip' },
    { btn: DOM.btnStyleBadge, style: 'badge' },
    { btn: DOM.btnStyleNone, style: 'none' }
  ];

  styleBtns.forEach(({ btn, style }) => {
    btn.addEventListener('click', () => {
      styleBtns.forEach((b) => b.btn.style.borderColor = 'transparent');
      btn.style.borderColor = 'var(--primary-light)';
      state.badgeStyle = style;
      reprocessEnhanceAndRender();
    });
  });

  DOM.btnStyleStrip.style.borderColor = 'var(--primary-light)';
}

/**
 * إعداد أشرطة التحكم في تحسين الجودة والحدة
 */
function setupEnhancementSliders() {
  let debounceTimeout = null;

  const handleSliderChange = () => {
    state.enhancement.sharpness = parseInt(DOM.sliderSharpness.value, 10);
    state.enhancement.denoise = parseInt(DOM.sliderDenoise.value, 10);
    state.enhancement.brightness = parseInt(DOM.sliderBrightness.value, 10);
    state.enhancement.contrast = parseInt(DOM.sliderContrast.value, 10);

    updateSliderLabels();

    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      reprocessEnhanceAndRender();
    }, 120);
  };

  DOM.sliderSharpness.addEventListener('input', handleSliderChange);
  DOM.sliderDenoise.addEventListener('input', handleSliderChange);
  DOM.sliderBrightness.addEventListener('input', handleSliderChange);
  DOM.sliderContrast.addEventListener('input', handleSliderChange);

  updateSliderLabels();
}

function updateSliderLabels() {
  DOM.valSharpness.textContent = `${DOM.sliderSharpness.value}%`;
  DOM.valDenoise.textContent = `${DOM.sliderDenoise.value}%`;
  DOM.valBrightness.textContent = DOM.sliderBrightness.value > 0 ? `+${DOM.sliderBrightness.value}` : `${DOM.sliderBrightness.value}`;
  DOM.valContrast.textContent = `${DOM.sliderContrast.value}%`;
}

/**
 * إعداد أزرار الحفظ والتصدير والطباعة
 */
function setupExportButtons() {
  // 1. تحميل الصورة الفردية (Single Image PNG)
  DOM.btnDownloadSingle.addEventListener('click', () => {
    if (!state.finalRenderedCanvas) return;

    triggerConfetti();

    const link = document.createElement('a');
    const safeName = state.fullName ? state.fullName.trim().replace(/\s+/g, '_') : 'صورة_رسمية';
    link.download = `${safeName}_4x6.png`;
    link.href = state.finalRenderedCanvas.toDataURL('image/png', 1.0);
    link.click();

    showToast('تم تحميل الصورة الفردية عالية الدقة بنجاح!', 'success');
  });

  // 2. توليد وتحميل ورقة طباعة A4 (8 صور مع خطوط قص)
  DOM.btnDownloadSheet.addEventListener('click', () => {
    if (!state.finalRenderedCanvas) return;

    triggerConfetti();

    const sheetCanvas = CardRenderer.generateA4Sheet(state.finalRenderedCanvas, 8);
    const link = document.createElement('a');
    const safeName = state.fullName ? state.fullName.trim().replace(/\s+/g, '_') : 'ورقة_طباعة';
    link.download = `${safeName}_ورقة_A4_رسمية.png`;
    link.href = sheetCanvas.toDataURL('image/jpeg', 0.95);
    link.click();

    showToast('تم إنشاء ورقة الطباعة A4 (8 صور جاهزة للقص ✂️)', 'success');
  });

  // 3. تصدير ملف PDF جاهز للطباعة مباشرة
  DOM.btnDownloadPDF.addEventListener('click', () => {
    if (!state.finalRenderedCanvas) return;

    triggerConfetti();

    const safeName = state.fullName ? state.fullName.trim().replace(/\s+/g, '_') : 'وثيقة_صور_رسمية';
    CardRenderer.exportToPDF(state.finalRenderedCanvas, `${safeName}.pdf`);

    showToast('تم تصدير ملف الـ PDF الجاهز للطباعة فوراً!', 'success');
  });
}

/**
 * تشغيل انيميشن الاحتفال بالكونفيتي عند اكتمال التنزيل
 */
function triggerConfetti() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.8 },
    colors: ['#0284c7', '#38bdf8', '#10b981', '#f59e0b']
  });
}

/**
 * إظهار إشعار Toast منبثق
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';

  let icon = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  `;

  if (type === 'success') {
    icon = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    `;
  } else if (type === 'error') {
    icon = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    `;
  }

  toast.innerHTML = `${icon}<span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// بدء التطبيق عند اكتمال تحميل الصفحة
document.addEventListener('DOMContentLoaded', init);
