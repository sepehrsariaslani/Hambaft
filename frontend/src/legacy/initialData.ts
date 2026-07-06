import { LifeData, CategoryDef, Document, Occasion, MindfulnessSession, WeightLog, VitalLog, Medication, DoctorVisit, AssetInvestment, BodyMeasurementLog } from './types';

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

// The current date in our simulation is 2026-07-04
export const TODAY_DATE = '2026-07-04';

export const getInitialLifeData = (): LifeData => {
  return {
    transactions: [
      {
        id: 't-1',
        type: 'income',
        amount: 25000000,
        category: 'salary',
        subcategory: 'حقوق ثابت',
        date: '2026-07-01',
        description: 'واریز حقوق ماه تیر'
      },
      {
        id: 't-2',
        type: 'expense',
        amount: 8500000,
        category: 'rent',
        subcategory: 'اجاره‌بها',
        date: '2026-07-01',
        description: 'پرداخت اجاره خانه این ماه'
      },
      {
        id: 't-3',
        type: 'expense',
        amount: 1450000,
        category: 'food',
        subcategory: 'سوپرمارکت',
        date: '2026-07-02',
        description: 'خرید سوپرمارکت هفتگی'
      },
      {
        id: 't-4',
        type: 'expense',
        amount: 420000,
        category: 'transport',
        subcategory: 'اسنپ / تپسی',
        date: '2026-07-03',
        description: 'اسنپ و شارژ کارت مترو'
      },
      {
        id: 't-5',
        type: 'expense',
        amount: 980000,
        category: 'entertainment',
        subcategory: 'رستوران و کافه',
        date: '2026-07-03',
        description: 'شام با دوستان در رستوران'
      },
      {
        id: 't-6',
        type: 'expense',
        amount: 550000,
        category: 'health',
        subcategory: 'داروخانه',
        date: '2026-07-04',
        description: 'خرید داروهای فصلی داروخانه'
      }
    ],
    habits: [
      {
        id: 'h-1',
        name: 'ورزش روزانه',
        description: '۳۰ دقیقه تمرین بدنی، دویدن یا کاردیو سبک',
        createdAt: '2026-06-15',
        logs: ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04'],
        streak: 4
      },
      {
        id: 'h-2',
        name: 'مطالعه و یادگیری',
        description: 'خواندن حداقل ۱۵ صفحه کتاب غیرداستانی یا تماشای دوره آموزشی',
        createdAt: '2026-06-15',
        logs: ['2026-07-01', '2026-07-03', '2026-07-04'],
        streak: 2
      },
      {
        id: 'h-3',
        name: 'مدیتیشن و تنفس عمیق',
        description: '۱۰ دقیقه سکوت مطلق و تمرکز روی نفس کشیدن برای آرامش ذهنی',
        createdAt: '2026-06-20',
        logs: ['2026-07-02', '2026-07-03'],
        streak: 0 // Missed today (2026-07-04) so far
      }
    ],
    goals: [
      {
        id: 'g-1',
        title: 'پس‌انداز هوشمند و سرمایه‌گذاری',
        description: 'جمع‌آوری ۱۰۰ میلیون تومان برای صندوق سرمایه‌گذاری امن',
        category: 'financial',
        targetDate: '2026-12-30',
        createdAt: '2026-06-01',
        completed: false,
        linkedBankAccountId: 'b-1',
        milestones: [
          { id: 'm-1-1', title: 'افتتاح حساب صندوق درآمد ثابت', completed: true },
          { id: 'm-1-2', title: 'رسیدن به پس‌انداز ۳۰ میلیونی', completed: true },
          { id: 'm-1-3', title: 'رسیدن به پس‌انداز ۶۰ میلیونی', completed: false },
          { id: 'm-1-4', title: 'رسیدن به هدف نهایی ۱۰۰ میلیون', completed: false }
        ],
        projects: [
          {
            id: 'p-1-1',
            title: 'راه‌اندازی سبد کم‌ریسک دارایی',
            description: 'توزیع دارایی بین صندوق درآمد ثابت و فلزات گرانبها',
            completed: false,
            createdAt: '2026-06-15',
            tasks: [
              { id: 'tk-p-1', title: 'بررسی سود ماهانه صندوق کاردان و کیان', completed: true, createdAt: '2026-06-15' },
              { id: 'tk-p-2', title: 'واریز ۱۰ میلیون تومان به صندوق درآمد ثابت', completed: true, createdAt: '2026-06-20' },
              { id: 'tk-p-3', title: 'تحلیل حباب سکه و خرید طلای آب‌شده', completed: false, createdAt: '2026-07-01' }
            ]
          }
        ],
        habits: [
          {
            id: 'h-g-1',
            name: 'ثبت روزانه تمام مخارج در برنامه',
            description: 'وارد کردن خریدها بلافاصله پس از پرداخت کارت به کارت',
            createdAt: '2026-06-15',
            logs: ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04'],
            streak: 4
          }
        ]
      },
      {
        id: 'g-2',
        title: 'سلامتی و آمادگی جسمانی بالا',
        description: 'کاهش درصد چربی و دویدن ماراتن کامل ۱۰ کیلومتری',
        category: 'health',
        targetDate: '2026-09-15',
        createdAt: '2026-06-01',
        completed: false,
        milestones: [
          { id: 'm-2-1', title: 'دویدن مداوم ۵ کیلومتر بدون توقف', completed: true },
          { id: 'm-2-2', title: '۳ روز تمرین قدرتی هفتگی منظم', completed: true },
          { id: 'm-2-3', title: 'رسیدن به دویدن مداوم ۸ کیلومتر', completed: false },
          { id: 'm-2-4', title: 'شرکت در دو ماراتن خیریه ۱۰ کیلومتر', completed: false }
        ],
        projects: [
          {
            id: 'p-2-1',
            title: 'برنامه غذایی و آنالیز بدن',
            description: 'تنظیم میزان کالری دریافتی روزانه و تست چربی بدنی',
            completed: true,
            createdAt: '2026-06-05',
            tasks: [
              { id: 'tk-p-4', title: 'انجام تست بادی آنالیز در باشگاه', completed: true, createdAt: '2026-06-05' },
              { id: 'tk-p-5', title: 'مشاوره با متخصص تغذیه ورزشی', completed: true, createdAt: '2026-06-10' }
            ]
          }
        ],
        habits: [
          {
            id: 'h-g-2',
            name: 'نوشیدن ۸ لیوان آب روزانه',
            description: 'حفظ شادابی پوست و دفع سموم بدن حین دویدن ماراتن',
            createdAt: '2026-06-10',
            logs: ['2026-07-01', '2026-07-02', '2026-07-04'],
            streak: 1
          }
        ],
        metric: {
          name: 'وزن بدنی',
          targetValue: 84,
          startValue: 92,
          currentValue: 87.5,
          unit: 'کیلوگرم',
          logs: [
            { id: 'ml-1', date: '2026-06-01', value: 92, note: 'شروع مسیر کاهش وزن با تمرکز بر تغذیه' },
            { id: 'ml-2', date: '2026-06-10', value: 90.5, note: 'رعایت کالری شماری دقیق و ورزش منظم' },
            { id: 'ml-3', date: '2026-06-20', value: 89.2, note: 'افزایش شدت تمرینات هوازی و دویدن' },
            { id: 'ml-4', date: '2026-07-01', value: 88.0, note: 'وزن‌کشی صبحگاهی ناشتا با ترازوی دیجیتال' },
            { id: 'ml-5', date: '2026-07-04', value: 87.5, note: 'کاهش پیوسته چربی بدنی و بهبود آمادگی' }
          ]
        }
      },
      {
        id: 'g-3',
        title: 'ارتقای مهارت تخصصی و کاری',
        description: 'یادگیری کامل فریم‌ورک‌های جدید وب و ساخت دو پروژه نمونه',
        category: 'learning',
        targetDate: '2026-08-31',
        createdAt: '2026-06-10',
        completed: false,
        milestones: [
          { id: 'm-3-1', title: 'گذراندن دوره آموزشی ویدئویی فشرده', completed: true },
          { id: 'm-3-2', title: 'طراحی ساختار دیتابیس پروژه شخصی اول', completed: false },
          { id: 'm-3-3', title: 'تکمیل کامل فرانت‌اند و بک‌اند پروژه اول', completed: false }
        ],
        projects: [
          {
            id: 'p-3-1',
            title: 'ساخت اولین وب‌اپلیکیشن آزمایشی',
            description: 'پیاده‌سازی یک سامانه‌ مدیریت وظایف بومی و جذاب',
            completed: false,
            createdAt: '2026-06-20',
            tasks: [
              { id: 'tk-p-6', title: 'ترسیم وایرفریم‌ها روی کاغذ', completed: true, createdAt: '2026-06-20' },
              { id: 'tk-p-7', title: 'نوشتن کامپوننت‌های فرانت‌اند با Tailwind', completed: false, createdAt: '2026-06-25' }
            ]
          }
        ],
        habits: [
          {
            id: 'h-g-3',
            name: '۱ ساعت کدنویسی متمرکز روزانه',
            description: 'تقویت حافظه عضلانی انگشتان برای فریم‌ورک‌های مدرن',
            createdAt: '2026-06-15',
            logs: ['2026-07-02', '2026-07-03', '2026-07-04'],
            streak: 3
          }
        ]
      }
    ],
    tasks: [
      { id: 'tk-1', title: 'خرید قهوه برای دفتر کار', completed: false, createdAt: '2026-07-04' },
      { id: 'tk-2', title: 'بررسی فاکتورهای هزینه‌کرده‌های هفته قبل', completed: true, createdAt: '2026-07-03' },
      { id: 'tk-3', title: 'تماس با مربی ورزشی برای برنامه تمرین جدید', completed: false, createdAt: '2026-07-04' },
      { id: 'tk-4', title: 'پرداخت قسط بیمه خودرو', completed: true, createdAt: '2026-07-01' },
      { id: 'tk-5', title: 'مرتب کردن میز تحریر و اتاق مطالعه', completed: false, createdAt: '2026-07-04' }
    ],
    journalEntries: [
      {
        id: 'j-1',
        date: '2026-07-03',
        title: 'شروع عالی هفته با انگیزه بالا',
        content: 'امروز خیلی زود ساعت ۶ بیدار شدم. تونستم قبل از رفتن به محل کار ۳۰ دقیقه بدوم. حس شادی و سبکی فوق‌العاده‌ای در کل روز داشتم. درآمدم طبق موعد واریز شد و حس خوبی بابت انضباط مالی ام داشتم. برای اهداف این ماهم تلاش بیشتری خواهم کرد.',
        mood: 'excited',
        gratitude: 'هوای عالی صبحگاهی، انگیزه بالا برای شروع مجدد و داشتن سلامتی کامل.'
      },
      {
        id: 'j-2',
        date: '2026-07-04',
        title: 'تمرکز روی انضباط شخصی و مدیریت زندگی',
        content: 'امروز متوجه شدم کنترل هزینه‌های ریز زندگی به شدت روی آرامش ذهنی تاثیر داره. یک برنامه مدیریت زندگی جامع نوشتم تا هم عادت‌هام، هم هزینه‌هام و هم کارهام متمرکز باشن. مربی هوشمندم کمک می‌کنه همیشه در مسیر درست بمونم. فردا پر قدرت به تمرین‌های دو ادامه میدم.',
        mood: 'happy',
        gratitude: 'پیشرفت تکنولوژی که کارها رو ساده میکنه، آرامش ذهن و امکان ثبت لحظات زندگی.'
      }
    ],
    subscriptions: [
      {
        id: 'sub-1',
        name: 'اشتراک نتفلیکس پریمیوم',
        price: 950000,
        billingCycle: 'monthly',
        nextBillingDate: '2026-07-28',
        category: 'entertainment',
        cardUsed: '•••• ۵۴۳۶',
        provider: 'Netflix',
        status: 'active'
      },
      {
        id: 'sub-2',
        name: 'اشتراک اسپاتیفای فمیلی',
        price: 450000,
        billingCycle: 'monthly',
        nextBillingDate: '2026-07-15',
        category: 'music',
        cardUsed: '•••• ۹۰۱۲',
        provider: 'Spotify',
        status: 'active'
      },
      {
        id: 'sub-3',
        name: 'یوتیوب پریمیوم سومین ماه',
        price: 620000,
        billingCycle: 'monthly',
        nextBillingDate: '2026-08-02',
        category: 'entertainment',
        cardUsed: '•••• ۵۴۳۶',
        provider: 'YouTube',
        status: 'active'
      },
      {
        id: 'sub-4',
        name: 'ادوبی کریتیو کلود',
        price: 2400000,
        billingCycle: 'monthly',
        nextBillingDate: '2026-07-10',
        category: 'design',
        cardUsed: '•••• ۳۴۸۱',
        provider: 'Adobe',
        status: 'active'
      },
      {
        id: 'sub-5',
        name: 'دریبل پرو بیزنس',
        price: 750000,
        billingCycle: 'monthly',
        nextBillingDate: '2026-07-22',
        category: 'design',
        cardUsed: '•••• ۵۴۳۶',
        provider: 'Dribbble',
        status: 'active'
      },
      {
        id: 'sub-6',
        name: 'فضای ابری دراپ‌باکس',
        price: 500000,
        billingCycle: 'monthly',
        nextBillingDate: '2026-07-28',
        category: 'utility',
        cardUsed: '•••• ۹۰۱۲',
        provider: 'Dropbox',
        status: 'inactive'
      }
    ],
    categories: DEFAULT_CATEGORIES,
    bankAccounts: [
      { id: 'b-1', bankName: 'بانک سامان', accountName: 'سپرده کوتاه‌مدت سامان', balance: 32000000, cardNumber: '۶۲۱۹-****-****-۴۵۲۱', color: '#1E3A8A' },
      { id: 'b-2', bankName: 'بانک ملی', accountName: 'حساب پس‌انداز ملی', balance: 14500000, cardNumber: '۶۰۳۷-****-****-۹۰۱۲', color: '#B91C1C' },
      { id: 'b-3', bankName: 'بانک پاسارگاد', accountName: 'سپرده کوتاه‌مدت پاسارگاد', balance: 54000000, cardNumber: '۵۰۲۲-****-****-۳۴۸۱', color: '#D4AF37' }
    ],
    profile: {
      name: 'پارس سلیمانی',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop',
      motto: 'زندگی همبافته‌ای از توازن، آرامش و تلاش هوشمندانه است.',
      workField: 'طراح ارشد محصول',
      dailyWaterGoal: 8,
      sleepGoalHours: 7.5
    },
    sleepLogs: [
      { id: 'sl-1', date: '2026-07-01', sleepTime: '23:30', wakeTime: '07:00', duration: 7.5, quality: 8, energyLevel: 8, notes: 'خواب خوبی بود و صبح پرانرژی بودم.' },
      { id: 'sl-2', date: '2026-07-02', sleepTime: '22:45', wakeTime: '06:30', duration: 7.75, quality: 9, energyLevel: 9, notes: 'زود بیدار شدم و پیاده‌روی رفتم.' },
      { id: 'sl-3', date: '2026-07-03', sleepTime: '00:15', wakeTime: '07:30', duration: 7.25, quality: 6, energyLevel: 7, notes: 'کمی دیر خوابیدم اما کیفیت خواب متوسط بود.' },
      { id: 'sl-4', date: '2026-07-04', sleepTime: '23:00', wakeTime: '07:00', duration: 8.0, quality: 9, energyLevel: 8, notes: 'خواب عمیق و کافی داشتیم.' }
    ],
    documents: [
      {
        id: 'doc-1',
        title: 'بیمه عمر البرز',
        type: 'insurance',
        description: 'بیمه عمر و تشکیل سرمایه ۲۰ ساله — پوشش حوادث و فوت',
        issuedBy: 'شرکت بیمه البرز',
        issuedDate: '2024-01-15',
        expiryDate: '2044-01-15',
        tags: ['مهم', 'سالانه', 'سرمایه‌گذاری'],
        createdAt: '2026-07-04',
        notes: 'قسط ماهانه ۸۰۰ هزار تومان — واریز هر اول ماه'
      },
      {
        id: 'doc-2',
        title: 'بیمه شخص ثالث خودرو',
        type: 'insurance',
        description: 'بیمه ثالث و سرنشین پژو پارس — پلاک ۱۱۴ب۳۴',
        issuedBy: 'بیمه ایران',
        issuedDate: '2026-02-10',
        expiryDate: '2026-08-05',
        tags: ['خودرو', 'ضروری'],
        createdAt: '2026-07-04',
      },
      {
        id: 'doc-3',
        title: 'قرارداد اجاره آپارتمان',
        type: 'contract',
        description: 'اجاره آپارتمان ۸۵ متری خیابان ولیعصر — اجاره ماهانه ۸.۵ میلیون',
        issuedBy: 'دفتر اسناد رسمی شماره ۱۲',
        issuedDate: '2025-07-01',
        expiryDate: '2026-07-01',
        tags: ['مسکن', 'قرارداد', 'تمدید'],
        createdAt: '2026-07-04',
        notes: 'تمدید قرارداد از اول مرداد — مذاکره اجاره جدید'
      },
      {
        id: 'doc-4',
        title: 'گواهینامه حرفه‌ای UX طراحی',
        type: 'certificate',
        description: 'مدرک UX Design از دانشگاه تهران — دوره فشرده ۶ ماهه',
        issuedBy: 'دانشگاه تهران — دانشکده هنر',
        issuedDate: '2025-03-20',
        tags: ['مدرک', 'حرفه‌ای', 'طراحی'],
        createdAt: '2026-07-04',
      }
    ] as Document[],
    occasions: [
      {
        id: 'occ-1',
        title: 'تولد مادر',
        type: 'birthday',
        date: '2026-08-12',
        person: 'مادر',
        recurrenceType: 'yearly',
        reminderDaysBefore: 5,
        notes: 'هدیه: گردنبند طلا یا دسته گل رز سفید',
        color: '#E26645'
      },
      {
        id: 'occ-2',
        title: 'سالگرد ازدواج',
        type: 'anniversary',
        date: '2026-09-03',
        person: 'همسر',
        recurrenceType: 'yearly',
        reminderDaysBefore: 7,
        notes: 'رزرو رستوران و تهیه هدیه',
        color: '#9B6B61'
      },
      {
        id: 'occ-3',
        title: 'تولد رضا دوست قدیمی',
        type: 'birthday',
        date: '2026-07-18',
        person: 'رضا',
        recurrenceType: 'yearly',
        reminderDaysBefore: 3,
        color: '#E26645'
      },
      {
        id: 'occ-4',
        title: 'جلسه سالانه ارزیابی کاری',
        type: 'event',
        date: '2026-09-15',
        recurrenceType: 'yearly',
        reminderDaysBefore: 14,
        notes: 'آماده‌سازی پورتفولیو و گزارش عملکرد سالانه',
        color: '#7C8363'
      }
    ] as Occasion[],
    mindfulnessSessions: [
      {
        id: 'ms-1',
        date: '2026-07-01',
        type: 'meditation',
        durationMinutes: 10,
        stressLevelBefore: 7,
        stressLevelAfter: 4,
        notes: 'صبح زود قبل از رفتن به محل کار — تمرکز خوب'
      },
      {
        id: 'ms-2',
        date: '2026-07-02',
        type: 'breathing',
        durationMinutes: 5,
        stressLevelBefore: 6,
        stressLevelAfter: 3,
        notes: 'تنفس ۴-۷-۸ قبل از خواب'
      },
      {
        id: 'ms-3',
        date: '2026-07-03',
        type: 'gratitude',
        durationMinutes: 10,
        stressLevelBefore: 5,
        stressLevelAfter: 2,
        notes: 'نوشتن ۵ چیز که شکرگزارشم'
      }
    ] as MindfulnessSession[],
    weightLogs: [
      { id: 'wl-1', date: '2026-06-01', weight: 92.0, note: 'شروع ردیابی وزن' },
      { id: 'wl-2', date: '2026-06-10', weight: 90.5, note: 'کاهش کالری و ورزش منظم' },
      { id: 'wl-3', date: '2026-06-20', weight: 89.2 },
      { id: 'wl-4', date: '2026-07-01', weight: 88.0, note: 'وزن‌کشی صبحگاهی ناشتا' },
      { id: 'wl-5', date: '2026-07-04', weight: 87.5, note: 'روند کاهشی عالی' },
    ] as WeightLog[],
    vitalLogs: [
      { id: 'vl-1', date: '2026-06-15', systolic: 125, diastolic: 82, heartRate: 74, note: 'اندازه‌گیری صبح ناشتا' },
      { id: 'vl-2', date: '2026-06-25', systolic: 122, diastolic: 80, heartRate: 71, bloodSugar: 98 },
      { id: 'vl-3', date: '2026-07-01', systolic: 118, diastolic: 78, heartRate: 68, temperature: 36.6, oxygenSaturation: 98, note: 'بعد از ورزش صبحگاهی — بهترین وضعیت' },
      { id: 'vl-4', date: '2026-07-04', systolic: 120, diastolic: 79, heartRate: 70, bloodSugar: 95 },
    ] as VitalLog[],
    medications: [
      {
        id: 'med-1',
        name: 'امگا ۳',
        dosage: '�۱۰۰۰ میلی‌گرم',
        frequency: 'روزی یک عدد بعد از ناهار',
        startDate: '2026-05-01',
        notes: 'مکمل برای سلامت قلب و کاهش التهاب',
        active: true,
        logs: ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04'],
      },
      {
        id: 'med-2',
        name: 'ویتامین D3',
        dosage: '۱۰۰۰ واحد',
        frequency: 'روزی یک عدد با وعده صبحانه',
        startDate: '2026-04-15',
        prescribedBy: 'دکتر رضایی',
        active: true,
        logs: ['2026-07-01', '2026-07-02', '2026-07-04'],
      },
    ] as Medication[],
    doctorVisits: [
      {
        id: 'dv-1',
        date: '2026-06-20',
        doctorName: 'دکتر رضایی',
        specialty: 'قلب و عروق',
        clinic: 'کلینیک قلب ایران',
        reason: 'چکاپ سالانه و بررسی فشار خون',
        diagnosis: 'فشار خون مرزی — نیاز به پیگیری',
        nextVisitDate: '2026-09-20',
        notes: 'تجویز ویتامین D3 — ورزش منظم و کاهش نمک توصیه شد',
      },
      {
        id: 'dv-2',
        date: '2026-05-10',
        doctorName: 'دکتر کریمی',
        specialty: 'دندان‌پزشکی',
        clinic: 'مطب دکتر کریمی',
        reason: 'جرم‌گیری و چکاپ دوره‌ای',
        nextVisitDate: '2026-11-10',
        notes: 'جرم‌گیری انجام شد — فلوراید تراپی توصیه شد',
      },
    ] as DoctorVisit[],
    assets: [
      {
        id: 'asset-1',
        name: 'بیت کوین',
        symbol: 'BTC',
        type: 'crypto',
        amount: 0.15,
        purchasePrice: 3800000000,
        currentPrice: 4200000000,
        notes: 'موجود در کیف پول سخت‌افزاری لجر',
        lastUpdated: '2026-07-04'
      },
      {
        id: 'asset-2',
        name: 'تتر (دلار دیجیتال)',
        symbol: 'USDT',
        type: 'crypto',
        amount: 1200,
        purchasePrice: 58000,
        currentPrice: 61200,
        notes: 'موجود در صرافی نوبیتکس برای نوسان‌گیری',
        lastUpdated: '2026-07-04'
      },
      {
        id: 'asset-3',
        name: 'طلای ۱۸ عیار آب‌شده',
        symbol: 'GOLD',
        type: 'gold',
        amount: 15.5,
        purchasePrice: 3100000,
        currentPrice: 3450000,
        notes: 'خریداری شده فیزیکی از بازار تهران',
        lastUpdated: '2026-07-04'
      }
    ] as AssetInvestment[],
    mealLogs: [
      { id: 'ml-meal-1', date: '2026-07-04', time: '08:30', type: 'breakfast', foods: '۲ عدد تخم مرغ آب‌پز، ۵۰ گرم نان سنگک، گوجه و خیار، چای سبز', calories: 320, protein: 18, carbs: 25, fat: 12, waterGlasses: 2 },
      { id: 'ml-meal-2', date: '2026-07-04', time: '13:30', type: 'lunch', foods: '۱۵۰ گرم سینه مرغ گریل شده، یک پیمانه برنج کته قهوه‌ای، سالاد با لیموترش', calories: 550, protein: 42, carbs: 60, fat: 8, waterGlasses: 2 },
      { id: 'ml-meal-3', date: '2026-07-04', time: '17:00', type: 'snack', foods: 'یک عدد سیب درختی به همراه ۱۰ عدد بادام درختی', calories: 180, protein: 3, carbs: 22, fat: 9, waterGlasses: 1 },
      { id: 'ml-meal-4', date: '2026-07-04', time: '20:30', type: 'dinner', foods: 'یک کاسه سوپ سبزیجات و ۱۰۰ گرم ماهی قزل‌آلا آب‌پز', calories: 350, protein: 28, carbs: 30, fat: 10, waterGlasses: 2 }
    ],
    dietSetting: {
      type: 'fasting',
      startDate: '2026-07-01',
      targetWeight: 84,
      dailyCaloriesGoal: 1800,
      fastingWindow: '16:8',
      fastingStartTime: '21:00',
      fastingEndTime: '13:00',
      dietNotes: 'کاهش تدریجی با چربی‌سوزی در پنجره فستینگ ۱۶ ساعته.'
    },
    bodyMeasurementLogs: [
      { id: 'bml-1', date: '2026-06-01', waist: 96, arm: 34, chest: 104, note: 'شروع دوره تمرینی چربی‌سوزی و عضله‌سازی' },
      { id: 'bml-2', date: '2026-06-10', waist: 95, arm: 34.5, chest: 104.2 },
      { id: 'bml-3', date: '2026-06-20', waist: 93.5, arm: 35, chest: 104.5 },
      { id: 'bml-4', date: '2026-07-01', waist: 91.5, arm: 35.8, chest: 105, note: 'پیشرفت چشمگیر در کاهش سایز شکم و افزایش حجم بازو' },
      { id: 'bml-5', date: '2026-07-04', waist: 90.5, arm: 36.2, chest: 105.5, note: 'بهترین فرم بدنی تا الان ناشتا' },
    ] as BodyMeasurementLog[],
    contacts: [
      {
        id: 'c-1',
        name: 'علیرضا کریمی',
        category: 'friend',
        birthday: '2026-05-12',
        traits: ['پرتلاش', 'خلاق', 'برنامه‌نویس باسابقه'],
        strengths: 'حل مسئله، انضباط کاری بالا',
        hobbies: 'کوهنوردی، قهوه دمی، شطرنج',
        notes: 'هم‌بنیان‌گذار پروژه استارتاپی همبافت و دوست نزدیک دانشگاهی.',
        lastInteractionDate: '2026-07-02',
        lastInteractionType: 'meeting',
        relationshipScore: 85,
        closenessTier: 'inner',
        interactionLogs: [
          { id: 'intl-1-1', date: '2026-07-02', type: 'meeting', durationMinutes: 120, notes: 'کافه‌گردی و همفکری درباره پلن بازاریابی همبافت', location: 'کافه راش' },
          { id: 'intl-1-2', date: '2026-06-25', type: 'call', durationMinutes: 15, notes: 'تبریک پروژه جدید و هماهنگی برای دیدار حضوری' }
        ]
      },
      {
        id: 'c-2',
        name: 'سارا رضایی',
        category: 'family',
        birthday: '2026-09-24',
        traits: ['مهربان', 'صبور', 'منظم'],
        strengths: 'شنونده عالی، مشاوره عالی در مسائل زندگی',
        hobbies: 'عکاسی، یوگا، رمان نویسی',
        notes: 'خواهرم. همیشه حامی و گوش شنوای من برای ایده‌های جدید است.',
        lastInteractionDate: '2026-07-04',
        lastInteractionType: 'call',
        relationshipScore: 98,
        closenessTier: 'inner',
        interactionLogs: [
          { id: 'intl-2-1', date: '2026-07-04', type: 'call', durationMinutes: 25, notes: 'مکالمه هفتگی خانوادگی و احوالپرسی گرم' }
        ]
      },
      {
        id: 'c-3',
        name: 'دکتر جمشیدی',
        category: 'mentor',
        birthday: '2026-02-18',
        traits: ['باتجربه', 'حرفه‌ای', 'عمیق'],
        strengths: 'مشاوره مدیریتی و تصمیم‌گیری‌های استراتژیک مالی',
        hobbies: 'تنیس، باغبانی، مطالعه تاریخ',
        notes: 'استاد راهنمای سابق من و مربی تجاری فعلی در شرکت سرمایه‌گذاری.',
        lastInteractionDate: '2026-06-18',
        lastInteractionType: 'meeting',
        relationshipScore: 60,
        closenessTier: 'outer',
        interactionLogs: [
          { id: 'intl-3-1', date: '2026-06-18', type: 'meeting', durationMinutes: 60, notes: 'جلسه بررسی پورتفولیو سرمایه‌گذاری طلا و ارز دیجیتال' }
        ]
      }
    ],
    moodLogs: [
      { id: 'mld-1', date: '2026-07-01', time: '09:30', mood: 'excited', energyLevel: 9, mentalFocus: 8, triggers: ['work', 'exercise'], notes: 'شروع عالی هفته با واریز حقوق و ورزش صبحگاهی!' },
      { id: 'mld-2', date: '2026-07-01', time: '18:00', mood: 'neutral', energyLevel: 6, mentalFocus: 7, triggers: ['work'], notes: 'جلسات پی‌درپی کمی خسته‌ام کرد ولی خروجی عالی بود.' },
      { id: 'mld-3', date: '2026-07-02', time: '11:00', mood: 'happy', energyLevel: 8, mentalFocus: 9, triggers: ['family', 'sleep'], notes: 'خواب باکیفیت دیشب و تماس صبحگاهی عالی با خانواده.' },
      { id: 'mld-4', date: '2026-07-03', time: '15:30', mood: 'tired', energyLevel: 4, mentalFocus: 5, triggers: ['sleep', 'work'], notes: 'نیاز مبرم به یک چرت نیم‌ساعته بعد از تمرکز زیاد.' },
      { id: 'mld-5', date: '2026-07-04', time: '10:00', mood: 'happy', energyLevel: 8, mentalFocus: 8, triggers: ['exercise', 'family'], notes: 'احساس نشاط و تندرستی بعد از صبحانه سالم و پیاده‌روی.' }
    ]
  };
};

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
  excited: { label: 'پرانرژی و عالی', icon: 'Sparkles', color: 'text-amber-600 bg-amber-50 border-amber-200' },
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
  learning: { label: 'یادگیری و مهارت', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  personal: { label: 'توسعه فردی', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  other: { label: 'سایر اهداف', color: 'text-slate-600 bg-slate-50 border-slate-200' }
};
