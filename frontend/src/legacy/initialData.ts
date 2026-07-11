import { CategoryDef } from './types';

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { id: 'food', name: 'خوراک و رستوران', type: 'expense', subcategories: ['سوپرمارکت', 'رستوران و کافه', 'سفارش آنلاین', 'میوه و سبزیجات'], color: '#7C8363', icon: '🍕' },
  { id: 'rent', name: 'مسکن و اجاره', type: 'expense', subcategories: ['اجاره‌بها', 'شارژ ساختمان', 'قبوض خدماتی', 'تعمیرات مسکن'], color: '#9B6B61', icon: '🏠' },
  { id: 'transport', name: 'حمل و نقل', type: 'expense', subcategories: ['اسنپ / تپسی', 'کارت مترو و اتوبوس', 'بنزین و سوخت', 'تعمیرات ماشین'], color: '#8D7F72', icon: '🚗' },
  { id: 'entertainment', name: 'تفریح و سرگرمی', type: 'expense', subcategories: ['سینما و تئاتر', 'بازی و گیم', 'کنسرت و رویداد', 'سفر و هتل'], color: '#5A5A40', icon: '🎬' },
  { id: 'health', name: 'سلامت و درمان', type: 'expense', subcategories: ['داروخانه', 'ویزیت پزشک', 'دندان‌پزشکی', 'آزمایشگاه'], color: '#9B6B61', icon: '💊' },
  { id: 'education', name: 'آموزش', type: 'expense', subcategories: ['کتاب و مجله', 'دوره‌های آموزشی', 'شهریه کلاس‌ها', 'لوازم‌التحریر'], color: '#EDDDD7', icon: '🎓' },
  { id: 'shopping', name: 'خرید', type: 'expense', subcategories: ['پوشاک', 'لوازم دیجیتال', 'هدیه و کادو', 'آرایشی و بهداشتی'], color: '#D4AF37', icon: '🛍️' },
  { id: 'salary', name: 'حقوق و دستمزد', type: 'income', subcategories: ['حقوق ثابت', 'اضافه‌کاری', 'پاداش عملکرد'], color: '#7C8363', icon: '💵' },
  { id: 'business', name: 'درآمد کسب و کار', type: 'income', subcategories: ['فروش خدمات', 'فروش محصول', 'قرارداد پروژه‌ای'], color: '#9B6B61', icon: '💼' },
  { id: 'investment', name: 'سرمایه‌گذاری', type: 'income', subcategories: ['سود سهام', 'سود صندوق درآمد ثابت', 'ارز دیجیتال'], color: '#8D7F72', icon: '📈' },
  { id: 'other', name: 'سایر موارد', type: 'expense', subcategories: ['بانک و کارمزد', 'خیریه', 'سایر موارد'], color: '#DDE2D5', icon: '✨' }
];

// NOTE: TODAY_DATE was previously a hardcoded simulation date.
// It has been replaced by useToday() hook which provides the real current date.
// Kept here only for test compatibility; do NOT use in production components.
export const TODAY_DATE = new Date().toISOString().slice(0, 10);

export const CATEGORY_LABELS: Record<string, string> = {
  salary: 'حقوق و دستمزد',
  business: 'درآمد کسب و کار',
  investment: 'سرمایه‌گذاری',
  food: 'خوراک و رستوران',
  rent: 'مسکن و اجاره',
  transport: 'حمل و نقل',
  entertainment: 'تفریح و سرگرمی',
  health: 'سلامت و درمان',
  education: 'آموزش و تحصیل',
  shopping: 'خرید و پوشاک',
  other: 'سایر موارد'
};

export const MOOD_LABELS: Record<string, { label: string, icon: string, color: string }> = {
  excited: { label: 'پرانرژی و عالی', icon: 'Sparkles', color: 'text-[#9B6B61] bg-[#F9F1D8] border-[#EBE3C8]' },
  happy: { label: 'خوشحال و آرام', icon: 'Smile', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  neutral: { label: 'معمولی', icon: 'Meh', color: 'text-slate-600 bg-slate-50 border-slate-200' },
  tired: { label: 'خسته', icon: 'Moon', color: 'text-sky-600 bg-sky-50 border-sky-200' },
  sad: { label: 'غمگین و بی‌انگیزه', icon: 'Frown', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  stressed: { label: 'مضطرب و نگران', icon: 'AlertCircle', color: 'text-rose-600 bg-rose-50 border-rose-200' }
};

export const GOAL_CATEGORY_LABELS: Record<string, { label: string, color: string }> = {
  financial: { label: 'مالی', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  health: { label: 'سلامت و ورزش', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  career: { label: 'شغل و حرفه', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  learning: { label: 'یادگیری و مهارت', color: 'text-[#9B6B61] bg-[#F9F1D8] border-[#EBE3C8]' },
  personal: { label: 'توسعه فردی', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  other: { label: 'سایر اهداف', color: 'text-slate-600 bg-slate-50 border-slate-200' }
};
