import confetti from 'canvas-confetti';
import { BackgroundRemover } from './bgRemover.js';
import { ImageEnhancer } from './enhancer.js';
import { CloudAiService } from './cloudAiService.js';
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
  engineMode: localStorage.getItem('engine_mode') || 'auto', // 'auto' | 'cloud' | 'local'
  enhancement: {
    sharpness: 45,
    denoise: 30,
    brightness: 0,
    contrast: 10
  },
  framing: {
    zoom: 1.0,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    autoCrop: true
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

  btnOpenSettings: document.getElementById('btnOpenSettings'),
  btnCloseSettings: document.getElementById('btnCloseSettings'),
  settingsModal: document.getElementById('settingsModal'),
  inputRemoveBgKey: document.getElementById('inputRemoveBgKey'),
  btnTestRemoveBgKey: document.getElementById('btnTestRemoveBgKey'),
  removeBgTestResult: document.getElementById('removeBgTestResult'),
  inputEnhancerKey: document.getElementById('inputEnhancerKey'),
  inputHfApiKey: document.getElementById('inputHfApiKey'),
  btnTestApiKey: document.getElementById('btnTestApiKey'),
  keyTestResult: document.getElementById('keyTestResult'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  btnClearApiKey: document.getElementById('btnClearApiKey'),
  headerEngineStatusText: document.getElementById('headerEngineStatusText'),

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

  // عناصر التوسيط والقص والتكبير
  sliderZoom: document.getElementById('sliderZoom'),
  sliderOffsetY: document.getElementById('sliderOffsetY'),
  sliderOffsetX: document.getElementById('sliderOffsetX'),
  sliderRotation: document.getElementById('sliderRotation'),
  valZoom: document.getElementById('valZoom'),
  valOffsetY: document.getElementById('valOffsetY'),
  valOffsetX: document.getElementById('valOffsetX'),
  valRotation: document.getElementById('valRotation'),
  btnResetFraming: document.getElementById('btnResetFraming'),

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
  setupSettingsModal();
  setupComparisonSlider();
  setupPresetEvents();
  setupBgColorEvents();
  setupFramingControls();
  setupInputEvents();
  setupEnhancementSliders();
  setupExportButtons();
}

/**
 * إعداد نافذة إعدادات الذكاء الاصطناعي والمفتاح السحابي
 */
function setupSettingsModal() {
  const updateHeaderStatus = () => {
    const hasRemoveBg = CloudAiService.hasRemoveBgKey();
    const hasHf = CloudAiService.hasApiKey();

    if (state.engineMode === 'cloud' || (state.engineMode === 'auto' && (hasRemoveBg || hasHf))) {
      if (hasRemoveBg) {
        DOM.headerEngineStatusText.textContent = '✨ Remove.bg الاحترافي (مفعّل)';
      } else {
        DOM.headerEngineStatusText.textContent = '🚀 سحابي RMBG (مفعّل)';
      }
    } else {
      DOM.headerEngineStatusText.textContent = '⚡ محرك محلي فوري';
    }
  };

  DOM.btnOpenSettings.addEventListener('click', () => {
    DOM.inputRemoveBgKey.value = CloudAiService.getRemoveBgKey();
    DOM.inputEnhancerKey.value = CloudAiService.getEnhancerKey();
    DOM.inputHfApiKey.value = CloudAiService.getApiKey();
    DOM.removeBgTestResult.style.display = 'none';
    DOM.keyTestResult.style.display = 'none';
    const radio = document.querySelector(`input[name="engineMode"][value="${state.engineMode}"]`);
    if (radio) radio.checked = true;
    DOM.settingsModal.style.display = 'flex';
  });

  DOM.btnCloseSettings.addEventListener('click', () => {
    DOM.settingsModal.style.display = 'none';
  });

  DOM.settingsModal.addEventListener('click', (e) => {
    if (e.target === DOM.settingsModal) {
      DOM.settingsModal.style.display = 'none';
    }
  });

  // فحص رصيد ومفتاح Remove.bg
  DOM.btnTestRemoveBgKey.addEventListener('click', async () => {
    const key = DOM.inputRemoveBgKey.value.trim();
    if (!key) {
      DOM.removeBgTestResult.style.display = 'block';
      DOM.removeBgTestResult.style.background = 'rgba(239, 68, 68, 0.15)';
      DOM.removeBgTestResult.style.color = '#ef4444';
      DOM.removeBgTestResult.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      DOM.removeBgTestResult.textContent = '⚠️ يرجى إدخال المفتاح أولاً';
      return;
    }

    DOM.btnTestRemoveBgKey.disabled = true;
    DOM.btnTestRemoveBgKey.textContent = 'جاري الفحص...';
    DOM.removeBgTestResult.style.display = 'block';
    DOM.removeBgTestResult.style.background = 'rgba(56, 189, 248, 0.15)';
    DOM.removeBgTestResult.style.color = '#38bdf8';
    DOM.removeBgTestResult.style.border = '1px solid rgba(56, 189, 248, 0.3)';
    DOM.removeBgTestResult.textContent = 'جاري الاتصال بخوادم Remove.bg للتحقق من الرصيد والمفتاح...';

    const result = await CloudAiService.testRemoveBgKey(key);
    DOM.btnTestRemoveBgKey.disabled = false;
    DOM.btnTestRemoveBgKey.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
      فحص الرصيد
    `;

    if (result.success) {
      DOM.removeBgTestResult.style.background = 'rgba(16, 185, 129, 0.15)';
      DOM.removeBgTestResult.style.color = '#10b981';
      DOM.removeBgTestResult.style.border = '1px solid rgba(16, 185, 129, 0.3)';
      DOM.removeBgTestResult.textContent = `✓ ${result.message}`;
    } else {
      DOM.removeBgTestResult.style.background = 'rgba(239, 68, 68, 0.15)';
      DOM.removeBgTestResult.style.color = '#ef4444';
      DOM.removeBgTestResult.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      DOM.removeBgTestResult.textContent = `✕ ${result.message}`;
    }
  });

  // زر اختبار مفتاح Hugging Face
  DOM.btnTestApiKey.addEventListener('click', async () => {
    const key = DOM.inputHfApiKey.value.trim();
    if (!key) {
      DOM.keyTestResult.style.display = 'block';
      DOM.keyTestResult.style.background = 'rgba(239, 68, 68, 0.15)';
      DOM.keyTestResult.style.color = '#ef4444';
      DOM.keyTestResult.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      DOM.keyTestResult.textContent = '⚠️ يرجى لصق المفتاح في الحقل أولاً';
      return;
    }

    DOM.btnTestApiKey.disabled = true;
    DOM.btnTestApiKey.textContent = 'جاري الفحص...';
    DOM.keyTestResult.style.display = 'block';
    DOM.keyTestResult.style.background = 'rgba(56, 189, 248, 0.15)';
    DOM.keyTestResult.style.color = '#38bdf8';
    DOM.keyTestResult.style.border = '1px solid rgba(56, 189, 248, 0.3)';
    DOM.keyTestResult.textContent = 'جاري الاتصال بـ Hugging Face للتحقق من المفتاح...';

    const result = await CloudAiService.testApiKey(key);
    DOM.btnTestApiKey.disabled = false;
    DOM.btnTestApiKey.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
      اختبار
    `;

    if (result.success) {
      DOM.keyTestResult.style.background = 'rgba(16, 185, 129, 0.15)';
      DOM.keyTestResult.style.color = '#10b981';
      DOM.keyTestResult.style.border = '1px solid rgba(16, 185, 129, 0.3)';
      DOM.keyTestResult.textContent = `✓ ${result.message}`;
    } else {
      DOM.keyTestResult.style.background = 'rgba(239, 68, 68, 0.15)';
      DOM.keyTestResult.style.color = '#ef4444';
      DOM.keyTestResult.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      DOM.keyTestResult.textContent = `✕ ${result.message}`;
    }
  });

  DOM.btnSaveSettings.addEventListener('click', () => {
    const removeBgKey = DOM.inputRemoveBgKey.value.trim();
    CloudAiService.setRemoveBgKey(removeBgKey);

    const enhancerKey = DOM.inputEnhancerKey.value.trim();
    CloudAiService.setEnhancerKey(enhancerKey);

    const hfKey = DOM.inputHfApiKey.value.trim();
    CloudAiService.setApiKey(hfKey);

    const selectedRadio = document.querySelector('input[name="engineMode"]:checked');
    if (selectedRadio) {
      state.engineMode = selectedRadio.value;
      localStorage.setItem('engine_mode', state.engineMode);
    }

    DOM.settingsModal.style.display = 'none';
    updateHeaderStatus();
    showToast('تم حفظ إعدادات الذكاء الاصطناعي والمفاتيح بنجاح!', 'success');
  });

  DOM.btnClearApiKey.addEventListener('click', () => {
    CloudAiService.setRemoveBgKey(CloudAiService.REMOVE_BG_DEFAULT_KEY);
    CloudAiService.setEnhancerKey(CloudAiService.ENHANCER_DEFAULT_KEY);
    CloudAiService.setApiKey('');
    DOM.inputRemoveBgKey.value = CloudAiService.REMOVE_BG_DEFAULT_KEY;
    DOM.inputEnhancerKey.value = CloudAiService.ENHANCER_DEFAULT_KEY;
    DOM.inputHfApiKey.value = '';
    DOM.removeBgTestResult.style.display = 'none';
    DOM.keyTestResult.style.display = 'none';
    updateHeaderStatus();
    showToast('تمت استعادة الإعدادات والمفاتيح الافتراضية بنجاح!');
  });

  updateHeaderStatus();
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
      },
      state.engineMode
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

  // 2. الرسم النهائي مع القص والتوسيط الذكي والشريط والاسم والرقم القومي
  const finalCanvas = CardRenderer.render({
    image: enhancedCanvas,
    bgColor: state.selectedBgColor,
    name: state.fullName,
    nationalId: state.nationalId,
    presetKey: state.selectedPreset,
    badgeStyle: state.badgeStyle,
    framing: state.framing,
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
 * إعداد أدوات التحكم في التوسيط والتكبير والقص الذكي
 */
function setupFramingControls() {
  let debounceTimer = null;

  const handleFramingChange = () => {
    state.framing.zoom = parseInt(DOM.sliderZoom.value, 10) / 100;
    state.framing.offsetY = parseInt(DOM.sliderOffsetY.value, 10) / 100;
    state.framing.offsetX = parseInt(DOM.sliderOffsetX.value, 10) / 100;
    state.framing.rotation = parseInt(DOM.sliderRotation.value, 10);
    state.framing.autoCrop = true;

    updateFramingLabels();

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      reprocessEnhanceAndRender();
    }, 30);
  };

  DOM.sliderZoom.addEventListener('input', handleFramingChange);
  DOM.sliderOffsetY.addEventListener('input', handleFramingChange);
  DOM.sliderOffsetX.addEventListener('input', handleFramingChange);
  DOM.sliderRotation.addEventListener('input', handleFramingChange);

  DOM.btnResetFraming.addEventListener('click', () => {
    state.framing = { zoom: 1.0, offsetX: 0, offsetY: 0, rotation: 0, autoCrop: true };
    DOM.sliderZoom.value = 100;
    DOM.sliderOffsetY.value = 0;
    DOM.sliderOffsetX.value = 0;
    DOM.sliderRotation.value = 0;
    updateFramingLabels();
    reprocessEnhanceAndRender();
    showToast('تمت إعادة ضبط التوسيط والقص التلقائي');
  });

  updateFramingLabels();
}

function updateFramingLabels() {
  DOM.valZoom.textContent = `${DOM.sliderZoom.value}%`;
  DOM.valOffsetY.textContent = DOM.sliderOffsetY.value > 0 ? `+${DOM.sliderOffsetY.value}` : `${DOM.sliderOffsetY.value}`;
  DOM.valOffsetX.textContent = DOM.sliderOffsetX.value > 0 ? `+${DOM.sliderOffsetX.value}` : `${DOM.sliderOffsetX.value}`;
  DOM.valRotation.textContent = `${DOM.sliderRotation.value}°`;
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
