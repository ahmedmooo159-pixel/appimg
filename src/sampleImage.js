/**
 * صورة تجريبية مدمجة بجودة عالية تتيح للمستخدم تجربة التطبيق بنقرة واحدة
 */

export function createSamplePortraitDataUrl() {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');

  // 1. خلفية ملونة معقدة (لإظهار قدرة إزالة الخلفية)
  const bgGradient = ctx.createLinearGradient(0, 0, 600, 800);
  bgGradient.addColorStop(0, '#0284c7');
  bgGradient.addColorStop(0.5, '#0d9488');
  bgGradient.addColorStop(1, '#1e293b');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, 600, 800);

  // عناصر خلفية مشتتة (ستائر/أشجار/دوائر ضوئية Bokeh)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  for (let i = 0; i < 18; i++) {
    const rx = (i * 97) % 600;
    const ry = (i * 73) % 400;
    const radius = 25 + (i % 5) * 15;
    ctx.beginPath();
    ctx.arc(rx, ry, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. رسم الجسم والملابس الرسمية (بدلة كحلية وقميص أبيض وربطة عنق)
  // الأكتاف
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(300, 750, 260, 200, 0, 0, Math.PI * 2);
  ctx.fill();

  // ياقة القميص الأبيض
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(300, 520);
  ctx.lineTo(240, 590);
  ctx.lineTo(360, 590);
  ctx.closePath();
  ctx.fill();

  // الكرافتة / ربطة العنق الكحلية الداكنة
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(290, 590);
  ctx.lineTo(310, 590);
  ctx.lineTo(320, 750);
  ctx.lineTo(300, 790);
  ctx.lineTo(280, 750);
  ctx.closePath();
  ctx.fill();

  // ياقة البدلة
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(230, 570);
  ctx.lineTo(270, 700);
  ctx.moveTo(370, 570);
  ctx.lineTo(330, 700);
  ctx.stroke();

  // 3. الرقبة
  ctx.fillStyle = '#e0a980';
  ctx.fillRect(265, 430, 70, 110);
  // ظل الرقبة
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(265, 430, 70, 30);

  // 4. الرأس والوجه
  ctx.fillStyle = '#f2be9b';
  ctx.beginPath();
  ctx.ellipse(300, 340, 130, 160, 0, 0, Math.PI * 2);
  ctx.fill();

  // الأذنان
  ctx.fillStyle = '#e8b28f';
  ctx.beginPath();
  ctx.ellipse(170, 350, 20, 35, 0, 0, Math.PI * 2);
  ctx.ellipse(430, 350, 20, 35, 0, 0, Math.PI * 2);
  ctx.fill();

  // الشعر (شعر أسود رسمي كلاسيكي)
  ctx.fillStyle = '#1e1b18';
  ctx.beginPath();
  ctx.arc(300, 290, 140, Math.PI * 0.9, Math.PI * 2.1);
  ctx.lineTo(440, 360);
  ctx.lineTo(410, 300);
  ctx.lineTo(300, 230);
  ctx.lineTo(190, 300);
  ctx.lineTo(160, 360);
  ctx.closePath();
  ctx.fill();

  // الحواجب
  ctx.strokeStyle = '#1e1b18';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  // حاجب أيسر
  ctx.beginPath();
  ctx.moveTo(230, 305);
  ctx.quadraticCurveTo(255, 295, 275, 305);
  ctx.stroke();
  // حاجب أيمن
  ctx.beginPath();
  ctx.moveTo(325, 305);
  ctx.quadraticCurveTo(345, 295, 370, 305);
  ctx.stroke();

  // العيون
  // بياض العين
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(255, 325, 18, 10, 0, 0, Math.PI * 2);
  ctx.ellipse(345, 325, 18, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // القزحية (بني داكن)
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.arc(255, 325, 8, 0, Math.PI * 2);
  ctx.arc(345, 325, 8, 0, Math.PI * 2);
  ctx.fill();

  // البؤبؤ واللمعان
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(255, 325, 4, 0, Math.PI * 2);
  ctx.arc(345, 325, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(253, 323, 2, 0, Math.PI * 2);
  ctx.arc(343, 323, 2, 0, Math.PI * 2);
  ctx.fill();

  // الأنف
  ctx.strokeStyle = '#c98a63';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(300, 320);
  ctx.lineTo(296, 370);
  ctx.lineTo(306, 372);
  ctx.stroke();

  // الفم / الابتسامة الوقورة
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(275, 415);
  ctx.quadraticCurveTo(300, 425, 325, 415);
  ctx.stroke();

  // الشفة السفلية
  ctx.strokeStyle = '#c98a63';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(285, 427);
  ctx.quadraticCurveTo(300, 432, 315, 427);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}
