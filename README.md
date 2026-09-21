# معالج الصور الرسمية الذكي ✨

تطبيق ويب مجاني 100% لمعالجة الصور الشخصية والرسمية — يعمل بالكامل في المتصفح بدون رفع أي بيانات لسيرفر خارجي.

## المميزات

- 🔒 **خصوصية تامة** — كل المعالجة تتم في المتصفح محلياً
- 🤖 **إزالة ذكية للخلفية** — باستخدام `@imgly/background-removal` (WASM/WebGPU)
- 🎨 **تحسين جودة الصور** — إزالة البكسلة وزيادة الحدة بدون تغيير الملامح
- 📏 **مقاسات رسمية** — بطاقة 4×6 سم، جواز سفر 3.5×4.5 سم، تأشيرة 5×5 سم
- 🏷️ **إضافة الاسم والرقم القومي** — مع تدقيق ذكي للـ 14 رقم
- 🖨️ **ورقة طباعة A4** — 8 صور بخطوط قص جاهزة للطباعة
- 📄 **تصدير PDF** — جاهز للطباعة مباشرة

## التقنيات

- [Vite](https://vitejs.dev/) — Build tool سريع
- [@imgly/background-removal](https://github.com/nicholai518/background-removal-js) — إزالة الخلفية بالـ WASM
- [jsPDF](https://github.com/parallax/jsPDF) — تصدير PDF
- [Canvas Confetti](https://github.com/catdad/canvas-confetti) — تأثيرات احتفالية

## التشغيل المحلي

```bash
# تثبيت المكتبات
npm install

# تشغيل السيرفر المحلي
npm run dev

# بناء نسخة الإنتاج
npm run build
```

## النشر على Vercel

```bash
# تثبيت Vercel CLI
npm i -g vercel

# النشر
vercel
```

أو اربط المستودع مباشرة من [لوحة تحكم Vercel](https://vercel.com/new).

## المطور

**أحمد مراد** (Ahmed Murad)

## الرخصة

MIT
