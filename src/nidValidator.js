/**
 * مدقق ومحلل الرقم القومي المصري (14 رقماً)
 * يستخرج تاريخ الميلاد، المحافظة، والنوع للتأكد من عدم وجود أخطاء في الإدخال
 */

const GOVERNORATES = {
  '01': 'القاهرة',
  '02': 'الإسكندرية',
  '03': 'بورسعيد',
  '04': 'السويس',
  '11': 'دمياط',
  '12': 'الدقهلية',
  '13': 'الشرقية',
  '14': 'القليوبية',
  '15': 'كفر الشيخ',
  '16': 'الغربية',
  '17': 'المنوفية',
  '18': 'البحيرة',
  '19': 'الإسماعيلية',
  '21': 'الجيزة',
  '22': 'بني سويف',
  '23': 'الفيوم',
  '24': 'المنيا',
  '25': 'أسيوط',
  '26': 'سوهاج',
  '27': 'قنا',
  '28': 'أسوان',
  '29': 'الأقصر',
  '31': 'البحر الأحمر',
  '32': 'الوادي الجديد',
  '33': 'مطروح',
  '34': 'شمال سيناء',
  '35': 'جنوب سيناء',
  '88': 'خارج الجمهورية'
};

/**
 * تحويل الأرقام العربية (المشرقية) إلى أرقام لاتينية إن وجدت
 */
export function normalizeDigits(input) {
  if (!input) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return input
    .toString()
    .trim()
    .replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d))
    .replace(/\s+/g, '');
}

/**
 * فحص وتحليل الرقم القومي
 */
export function parseNationalID(rawID) {
  const nid = normalizeDigits(rawID);

  if (!nid) {
    return { valid: false, message: '' };
  }

  if (!/^\d+$/.test(nid)) {
    return { valid: false, message: 'يجب أن يحتوي الرقم القومي على أرقام فقط' };
  }

  if (nid.length !== 14) {
    return {
      valid: false,
      partial: true,
      length: nid.length,
      message: `تم إدخال ${nid.length} من 14 رقماً`
    };
  }

  const centuryDigit = nid[0];
  let century = 0;
  if (centuryDigit === '2') century = 1900;
  else if (centuryDigit === '3') century = 2000;
  else {
    return { valid: false, message: 'الرقم الأول غير صحيح (يجب أن يبدأ بـ 2 أو 3)' };
  }

  const year = century + parseInt(nid.substring(1, 3), 10);
  const month = parseInt(nid.substring(3, 5), 10);
  const day = parseInt(nid.substring(5, 7), 10);

  if (month < 1 || month > 12) {
    return { valid: false, message: `شهر الميلاد غير صالح (${month})` };
  }

  if (day < 1 || day > 31) {
    return { valid: false, message: `يوم الميلاد غير صالح (${day})` };
  }

  // التحقق من صحة تاريخ الميلاد
  const birthDate = new Date(year, month - 1, day);
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return { valid: false, message: 'تاريخ الميلاد المستخرج غير مطابق للتقويم' };
  }

  const govCode = nid.substring(7, 9);
  const governorate = GOVERNORATES[govCode] || 'محافظة غير مدرجة';

  const genderDigit = parseInt(nid.charAt(12), 10);
  const gender = genderDigit % 2 === 0 ? 'أنثى' : 'ذكر';

  // تنسيق تاريخ الميلاد
  const formattedDate = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;

  return {
    valid: true,
    raw: nid,
    formatted: `${nid.slice(0, 1)} ${nid.slice(1, 3)} ${nid.slice(3, 5)} ${nid.slice(5, 7)} ${nid.slice(7, 9)} ${nid.slice(9, 13)} ${nid.slice(13)}`,
    birthDate: formattedDate,
    year,
    month,
    day,
    governorate,
    gender,
    summary: `${gender} • مواليد ${formattedDate} • ${governorate}`
  };
}
