/**
 * محرك دمج وتنسيق الصورة والاسم والرقم القومي وإعداد ورقة الطباعة A4
 */

import { jsPDF } from 'jspdf';

export const PHOTO_PRESETS = {
  'id_4x6': {
    name: 'صورة بطاقة / استمارة (4×6 سم)',
    width: 800,
    height: 1200,
    aspect: 4 / 6,
    badgeHeight: 180,
    cmWidth: 4,
    cmHeight: 6
  },
  'passport_35x45': {
    name: 'جواز سفر رسمي (3.5×4.5 سم)',
    width: 700,
    height: 900,
    aspect: 3.5 / 4.5,
    badgeHeight: 160,
    cmWidth: 3.5,
    cmHeight: 4.5
  },
  'visa_5x5': {
    name: 'تأشيرة ومربع (2×2 بوصة / 5×5 سم)',
    width: 1000,
    height: 1000,
    aspect: 1,
    badgeHeight: 180,
    cmWidth: 5,
    cmHeight: 5
  },
  'original': {
    name: 'الحجم والأبعاد الأصلية',
    width: null,
    height: null,
    aspect: null,
    badgeHeight: 160,
    cmWidth: null,
    cmHeight: null
  }
};

export class CardRenderer {
  /**
   * رسم الصورة المعالجة مع شريط الاسم والرقم القومي
   */
  static render({
    image,
    name = '',
    nationalId = '',
    presetKey = 'id_4x6',
    bgColor = '#ffffff',
    badgeStyle = 'strip', // 'strip' | 'badge' | 'minimal' | 'none'
    fontFamily = 'Cairo, sans-serif',
    textColor = '#1e293b',
    badgeBgColor = '#ffffff',
    showBorder = true,
    borderColor = '#cbd5e1',
    framing = {}
  }) {
    const preset = PHOTO_PRESETS[presetKey] || PHOTO_PRESETS['id_4x6'];
    
    // تحديد أبعاد اللوحة الكلية
    let canvasW, canvasH;
    let photoH;

    const hasText = badgeStyle !== 'none' && (name.trim().length > 0 || nationalId.trim().length > 0);
    const badgeH = hasText ? (preset.badgeHeight || 160) : 0;

    if (preset.width && preset.height) {
      canvasW = preset.width;
      canvasH = preset.height;
      photoH = canvasH - badgeH;
    } else {
      canvasW = image.naturalWidth || image.width;
      const baseH = image.naturalHeight || image.height;
      photoH = baseH;
      canvasH = baseH + badgeH;
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');

    // جودة التنعيم
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. ملء خلفية الكانفاس باللون المختار
    if (bgColor && bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvasW, canvasH);
    } else {
      ctx.clearRect(0, 0, canvasW, canvasH);
    }

    // 2. رسم الصورة داخل منطقة الصورة (مع القص والسنترة الذكية)
    this.drawImageSmartFramed(ctx, image, 0, 0, canvasW, photoH, {
      zoom: framing.zoom ?? 1.0,
      offsetX: framing.offsetX ?? 0,
      offsetY: framing.offsetY ?? 0,
      rotation: framing.rotation ?? 0,
      autoCrop: framing.autoCrop ?? true
    });

    // 3. رسم شريط الاسم والرقم القومي إن كان مفعلاً
    if (hasText) {
      const badgeY = photoH;
      this.drawBadgeText(ctx, {
        x: 0,
        y: badgeY,
        width: canvasW,
        height: badgeH,
        name,
        nationalId,
        style: badgeStyle,
        fontFamily,
        textColor,
        badgeBgColor,
        showBorder,
        borderColor
      });
    }

    // 4. رسم إطار خارجي رفيع للصورة (Cut border)
    if (showBorder) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, canvasW - 2, canvasH - 2);
    }

    return canvas;
  }

  /**
   * اكتشاف الإطار المحيط بالشخص المعزول تلقائياً من خلال قناة الشفافية Alpha
   */
  static getSubjectBounds(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return { minX: 0, minY: 0, maxX: w, maxY: h, width: w, height: h };

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w, minY = h, maxX = 0, maxY = 0;
    let found = false;

    // فحص البكسلات غير الشفافة بخطوات سريعة
    const step = Math.max(1, Math.floor(Math.min(w, h) / 400));
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha > 20) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!found || minX >= maxX || minY >= maxY) {
      return { minX: 0, minY: 0, maxX: w, maxY: h, width: w, height: h };
    }

    // توسيع الإطار قليلاً كهامش أمان
    const paddingX = Math.round((maxX - minX) * 0.02);
    const paddingY = Math.round((maxY - minY) * 0.02);

    minX = Math.max(0, minX - paddingX);
    minY = Math.max(0, minY - paddingY);
    maxX = Math.min(w, maxX + paddingX);
    maxY = Math.min(h, maxY + paddingY);

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * رسم الصورة وتوسيطها وقصها تلقائياً للمقاسات الرسمية (Smart Auto Framing & Cropping)
   */
  static drawImageSmartFramed(ctx, img, targetX, targetY, targetW, targetH, options = {}) {
    const {
      zoom = 1.0,
      offsetX = 0,    // كنسبة مئوية من العرض (-0.5 إلى +0.5)
      offsetY = 0,    // كنسبة مئوية من الارتفاع (-0.5 إلى +0.5)
      rotation = 0,   // زاوية التدوير بالدرجات
      autoCrop = true
    } = options;

    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;

    let bounds = { minX: 0, minY: 0, maxX: imgW, maxY: imgH, width: imgW, height: imgH };
    if (autoCrop) {
      bounds = this.getSubjectBounds(img);
    }

    const targetRatio = targetW / targetH;

    // حساب مركز الشخص وحجمه
    const subjectCenterX = bounds.minX + bounds.width / 2;
    const subjectTopY = bounds.minY;
    const subjectHeight = bounds.height;

    // في الصور الرسمية (4x6 / جواز السفر)، يشغل الرأس والكتفين حوالي 78% من الارتفاع مع هامش علوي ~9%
    let frameH = subjectHeight / 0.82;
    let frameW = frameH * targetRatio;

    // إذا كان العرض المطلوب أكبر من عرض الشخص، نضمن احتواء الكتفين
    if (frameW < bounds.width * 1.15) {
      frameW = bounds.width * 1.15;
      frameH = frameW / targetRatio;
    }

    // تطبيق التكبير والتصغير
    frameW /= Math.max(0.2, zoom);
    frameH /= Math.max(0.2, zoom);

    // حساب نقطة البداية (Source X, Y)
    // الهامش العلوي القياسي للرأس في الصور الرسمية
    const headroom = frameH * 0.09;
    let sx = subjectCenterX - frameW / 2 + (offsetX * frameW);
    let sy = subjectTopY - headroom + (offsetY * frameH);

    ctx.save();

    // إنشاء مساحة القص للكانفاس
    ctx.beginPath();
    ctx.rect(targetX, targetY, targetW, targetH);
    ctx.clip();

    // تطبيق التدوير حول مركز الهدف إن وجد
    if (rotation !== 0) {
      const cx = targetX + targetW / 2;
      const cy = targetY + targetH / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    // رسم الصورة مع التوسيط والقص الذكي
    ctx.drawImage(img, sx, sy, frameW, frameH, targetX, targetY, targetW, targetH);

    ctx.restore();
  }

  /**
   * رسم شريط الاسم والرقم القومي بنقاوة وخطوط واضحة
   */
  static drawBadgeText(ctx, {
    x, y, width, height, name, nationalId, style, fontFamily, textColor, badgeBgColor, showBorder, borderColor
  }) {
    ctx.save();

    // خلفية الشريط
    ctx.fillStyle = badgeBgColor;
    ctx.fillRect(x, y, width, height);

    // خط فاصل علوي رفيع
    if (showBorder) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.stroke();
    }

    // تأثير ستايل الكارنيه (ID Badge)
    if (style === 'badge') {
      ctx.fillStyle = 'rgba(241, 245, 249, 0.6)';
      ctx.fillRect(x + 12, y + 8, width - 24, height - 16);
      
      // إطار خفيف داخلي
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 12, y + 8, width - 24, height - 16);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';

    const centerX = x + width / 2;
    const hasName = name && name.trim().length > 0;
    const hasNID = nationalId && nationalId.trim().length > 0;

    // حساب حجم الخط وفق العرض
    const baseFontSize = Math.round(width * 0.046);

    if (hasName && hasNID) {
      // سطرين: الاسم في الأعلى والرقم القومي في الأسفل
      const nameY = y + height * 0.35;
      const nidY = y + height * 0.72;

      // رسم الاسم
      ctx.font = `bold ${baseFontSize}px ${fontFamily}`;
      ctx.fillStyle = textColor;
      ctx.fillText(name.trim(), centerX, nameY);

      // رسم الرقم القومي
      const nidFontSize = Math.round(baseFontSize * 0.88);
      ctx.font = `600 ${nidFontSize}px ${fontFamily}`;
      ctx.fillStyle = '#475569';
      
      // بادئة الرقم القومي
      ctx.fillText(`الرقم القومي: ${nationalId.trim()}`, centerX, nidY);

    } else if (hasName) {
      // سطر واحد كبير للاسم
      ctx.font = `bold ${Math.round(baseFontSize * 1.15)}px ${fontFamily}`;
      ctx.fillStyle = textColor;
      ctx.fillText(name.trim(), centerX, y + height / 2);

    } else if (hasNID) {
      // سطر واحد للرقم القومي
      ctx.font = `bold ${Math.round(baseFontSize * 1.05)}px ${fontFamily}`;
      ctx.fillStyle = textColor;
      ctx.fillText(`الرقم القومي: ${nationalId.trim()}`, centerX, y + height / 2);
    }

    ctx.restore();
  }

  /**
   * توليد ورقة طباعة A4 عالية الدقة تحتوي على 8 صور:
   * ترتيب 4 أعمدة × 2 صفوف — كل الصور داخل مساحة A5 (نصف A4)
   * بذلك تقدر تقص A4 لنصفين وتستغل الورق بدون هدر
   */
  static generateA4Sheet(renderedPhotoCanvas, count = 8) {
    // A4 بدقة 300 DPI = 2480 × 3508 بكسل
    // A5 = نصف A4 = 1748 × 2480 بكسل (بعرض A4)
    const sheetW = 2480;
    const sheetH = 3508;
    const DPI = 300;
    const mmToPx = DPI / 25.4; // 1mm = 11.81px عند 300dpi

    const sheet = document.createElement('canvas');
    sheet.width = sheetW;
    sheet.height = sheetH;
    const ctx = sheet.getContext('2d');

    // ── خلفية بيضاء ──
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheetW, sheetH);

    // ── إعدادات الشبكة ──
    // A5 = 148mm × 210mm → بالبكسل عند 300dpi
    const a5W = Math.round(148 * mmToPx); // 1748px
    const a5H = Math.round(210 * mmToPx); // 2480px

    const cols = 4;
    const rows = 2;
    const gap = Math.round(3 * mmToPx);          // فراغ 3mm بين الصور
    const margin = Math.round(5 * mmToPx);        // هامش خارجي 5mm

    // عرض وارتفاع كل صورة داخل شبكة A5
    const photoW = Math.round((a5W - margin * 2 - gap * (cols - 1)) / cols);
    const photoH = Math.round((a5H - margin * 2 - gap * (rows - 1)) / rows);

    // توسيط شبكة A5 أفقياً على A4، وتبدأ من أعلى الورقة
    const gridOffsetX = Math.round((sheetW - a5W) / 2);
    const gridOffsetY = Math.round(8 * mmToPx);  // هامش علوي 8mm

    // ── خط توضيحي يُظهر حد مساحة A5 ──
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = Math.round(0.5 * mmToPx);
    ctx.setLineDash([Math.round(4 * mmToPx), Math.round(4 * mmToPx)]);
    ctx.strokeRect(gridOffsetX, gridOffsetY, a5W, a5H);
    ctx.restore();

    // ── تسمية A5 ──
    ctx.save();
    ctx.font = `bold ${Math.round(3.5 * mmToPx)}px Cairo, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.fillText('مساحة A5 — اقطع هنا ✂', gridOffsetX + a5W - Math.round(3 * mmToPx), gridOffsetY + a5H + Math.round(6 * mmToPx));
    ctx.restore();

    // ── رسم الصور ──
    let index = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (index >= count) break;

        const posX = gridOffsetX + margin + c * (photoW + gap);
        const posY = gridOffsetY + margin + r * (photoH + gap);

        // علامات القص المتقطعة حول كل صورة
        this.drawCutMarks(ctx, posX, posY, photoW, photoH, mmToPx);

        // رسم الصورة بجودة عالية
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
          renderedPhotoCanvas,
          0, 0, renderedPhotoCanvas.width, renderedPhotoCanvas.height,
          posX, posY, photoW, photoH
        );

        index++;
      }
    }

    // ── خط القص الأفقي في منتصف A4 (يقسم A4 لـ A5+A5) ──
    const midY = gridOffsetY + a5H + Math.round(15 * mmToPx);
    ctx.save();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = Math.round(0.4 * mmToPx);
    ctx.setLineDash([Math.round(6 * mmToPx), Math.round(3 * mmToPx)]);
    ctx.beginPath();
    ctx.moveTo(Math.round(5 * mmToPx), midY);
    ctx.lineTo(sheetW - Math.round(5 * mmToPx), midY);
    ctx.stroke();
    ctx.restore();

    // نص خط القص المنتصف
    ctx.save();
    ctx.font = `${Math.round(3 * mmToPx)}px Cairo, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('✂ اقطع هنا لتقسيم الورقة — المنطقة أسفله للطباعة الثانية', sheetW / 2, midY - Math.round(3 * mmToPx));
    ctx.restore();

    // ── تذييل ──
    ctx.save();
    ctx.font = `${Math.round(3 * mmToPx)}px Cairo, sans-serif`;
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText('دقة 300 DPI — اطبع بحجم A4 بنسبة 100% بدون تصغير', sheetW / 2, sheetH - Math.round(8 * mmToPx));
    ctx.restore();

    return sheet;
  }

  /**
   * رسم علامات القص (خطوط متقطعة + إشارات زوايا) حول كل صورة
   */
  static drawCutMarks(ctx, x, y, w, h, mmToPx = 11.81) {
    const markLen = Math.round(3 * mmToPx);  // طول إشارة الزاوية 3mm
    const offset  = Math.round(1 * mmToPx);  // مسافة من حافة الصورة 1mm

    ctx.save();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = Math.round(0.3 * mmToPx);
    ctx.setLineDash([]);

    // زوايا الأربعة
    const corners = [
      // أعلى يسار
      [[x - offset, y + markLen, x - offset, y - offset, x + markLen, y - offset]],
      // أعلى يمين
      [[x + w - markLen, y - offset, x + w + offset, y - offset, x + w + offset, y + markLen]],
      // أسفل يسار
      [[x - offset, y + h - markLen, x - offset, y + h + offset, x + markLen, y + h + offset]],
      // أسفل يمين
      [[x + w - markLen, y + h + offset, x + w + offset, y + h + offset, x + w + offset, y + h - markLen]],
    ];

    corners.forEach(([pts]) => {
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      ctx.lineTo(pts[2], pts[3]);
      ctx.lineTo(pts[4], pts[5]);
      ctx.stroke();
    });

    ctx.restore();
  }

  /**
   * تصدير ورقة الطباعة كملف PDF جاهز للطباعة مباشرة
   */
  static exportToPDF(renderedCanvas, filename = 'official-photos-sheet.pdf') {
    const a4SheetCanvas = this.generateA4Sheet(renderedCanvas, 8);
    const imgData = a4SheetCanvas.toDataURL('image/jpeg', 0.95);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    pdf.save(filename);
  }
}
