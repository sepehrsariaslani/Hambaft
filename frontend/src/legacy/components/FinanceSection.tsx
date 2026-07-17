import React, { useState, useMemo } from 'react';
import { Transaction, Subscription, CategoryDef, BudgetSettings, BankAccount, RecurringTransaction, Debt, AssetInvestment, Document, Installment } from '../types';
import { CATEGORY_LABELS } from '../initialData';
import LinkedContacts from './LinkedContacts';
import PersianDatePicker from './PersianDatePicker';
import FinanceCategoryDashboard from './FinanceCategoryDashboard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid
} from 'recharts';
import {
  TrendingUp, TrendingDown, PlusCircle, Trash2, Filter, DollarSign,
  PieChartIcon, ListOrdered, Plus, CreditCard, AlertCircle, RefreshCw,
  CalendarDays, Zap, Music, Film, Wallet, SlidersHorizontal, CheckCircle2,
  Search, Download, Edit2, X, Save, Repeat, Building2, ChevronLeft,
  ChevronRight, Eye, ShieldCheck, ToggleLeft, ToggleRight, ArrowLeftRight,
  Coins, Utensils, Coffee, Car, Home, ShoppingBag, Gamepad2, Tv, Plane,
  Dumbbell, GraduationCap, HeartPulse, Briefcase, Key, FileText, Settings,
  User, Check, Percent, Sparkles, Flame, PercentSquare, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MoneyInput from './MoneyInput';

const getNextMonthDate = (startDateStr: string, monthsToAdd: number, targetDay: number): string => {
  try {
    const parts = startDateStr.split('-');
    if (parts.length !== 3) return startDateStr;
    let year = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1; // 0-indexed month
    
    month += monthsToAdd;
    year += Math.floor(month / 12);
    month = (month % 12 + 12) % 12;
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const day = Math.min(targetDay, daysInMonth);
    
    const yStr = year.toString();
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${yStr}-${mStr}-${dStr}`;
  } catch (e) {
    return startDateStr;
  }
};

interface FinanceSectionProps {
  transactions: Transaction[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (id: string, updated: Omit<Transaction, 'id'>) => void;
  subscriptions: Subscription[];
  onAddSubscription: (s: Omit<Subscription, 'id'>) => void;
  onDeleteSubscription: (id: string) => void;
  onToggleSubscriptionStatus: (id: string) => void;
  onEditSubscription: (id: string, updated: Omit<Subscription, 'id'>) => void;
  categories: CategoryDef[];
  onAddCategory: (cat: Omit<CategoryDef, 'id'>) => void;
  onDeleteCategory: (id: string) => void;
  onAddSubcategory: (catId: string, subName: string) => void;
  onDeleteSubcategory: (catId: string, subName: string) => void;
  budgetSettings?: BudgetSettings;
  onUpdateBudgetSettings: (settings: BudgetSettings) => void;
  bankAccounts: BankAccount[];
  onAddBankAccount: (b: Omit<BankAccount, 'id'>) => void;
  onDeleteBankAccount: (id: string) => void;
  onUpdateBankAccount: (id: string, updated: Omit<BankAccount, 'id'>) => void;
  recurringTransactions: RecurringTransaction[];
  onAddRecurring: (r: Omit<RecurringTransaction, 'id'>) => void;
  onDeleteRecurring: (id: string) => void;
  onToggleRecurring: (id: string) => void;
  onApplyRecurring: (id: string) => void;
  debts: Debt[];
  onAddDebt: (d: Omit<Debt, 'id' | 'createdAt' | 'completed'>) => void;
  onDeleteDebt: (id: string) => void;
  onToggleDebtCompletion: (id: string) => void;
  todayDate: string;
  assets: AssetInvestment[];
  onAddAsset: (a: Omit<AssetInvestment, 'id'>) => void;
  onDeleteAsset: (id: string) => void;
  onUpdateAsset: (id: string, updated: Omit<AssetInvestment, 'id'>) => void;
  documents: Document[];
  installments?: Installment[];
  onAddInstallment?: (inst: Omit<Installment, 'id' | 'completed'>) => void;
  onDeleteInstallment?: (id: string) => void;
  onPayInstallment?: (id: string, bankAccountId: string) => void;
  initialQuickTemplates?: Array<{
    id: string;
    title: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    subcategory?: string;
    description?: string;
    bankAccountId?: string;
    iconName?: string;
  }>;
  onQuickTemplatesChange?: (templates: Array<{
    id: string;
    title: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    subcategory?: string;
    description?: string;
    bankAccountId?: string;
    iconName?: string;
  }>) => void;
  contacts?: { id: string; name: string; photoUrl?: string; category?: string }[];
  onNavigateContact?: (contactId: string) => void;
}

type FinanceTab = 'records' | 'accounts' | 'subscriptions' | 'budget' | 'report' | 'categories' | 'debts' | 'assets';
type TxFilter = 'all' | 'income' | 'expense';

const PAGE_SIZE = 15;

const COLORS = ['#7C8363','#9B6B61','#8D7F72','#5A5A40','#EBE3C8','#EDDDD7','#D4AF37','#DDE2D5','#D6CFC3'];

const BANK_COLOR_PRESETS = ['#1E3A8A','#B91C1C','#D4AF37','#065F46','#6D28D9','#C2410C','#1E40AF','#374151'];

const FREQ_LABELS: Record<string, string> = {
  daily: 'روزانه', weekly: 'هفتگی', monthly: 'ماهانه', yearly: 'سالانه'
};

const PROVIDER_META: Record<string, { bg: string; text: string; border: string; icon: React.ComponentType<any> }> = {
  spotify:  { bg:'#E8ECE0', text:'#7C8363', border:'#DDE2D5', icon: Music },
  youtube:  { bg:'#F4E9E4', text:'#9B6B61', border:'#EDDDD7', icon: Film },
  netflix:  { bg:'#F4E9E4', text:'#9B6B61', border:'#EDDDD7', icon: Film },
  filimo:   { bg:'#F9F1D8', text:'#5A5A40', border:'#EBE3C8', icon: Film },
  namava:   { bg:'#F9F1D8', text:'#5A5A40', border:'#EBE3C8', icon: Film },
  notion:   { bg:'#E6DFD3', text:'#3D3D3D', border:'#D6CFC3', icon: Zap  },
  figma:    { bg:'#EDDDD7', text:'#9B6B61', border:'#EDDDD7', icon: Zap  },
  adobe:    { bg:'#EDDDD7', text:'#9B6B61', border:'#EDDDD7', icon: Zap  },
  other:    { bg:'#F9F6EE', text:'#8D7F72', border:'#E6DFD3', icon: CreditCard }
};

const SUB_CATEGORY_LABELS: Record<string, string> = {
  entertainment:'سرگرمی و فیلم', music:'موسیقی و رسانه', utility:'کاربردی و ابزار',
  productivity:'بهره‌وری و کار', design:'دیزاین و گرافیک', other:'سایر موارد'
};

interface InstallmentDraftPayCardProps {
  inst: Installment;
  bankAccounts: BankAccount[];
  getNextMonthDate: (startDateStr: string, monthsToAdd: number, targetDay: number) => string;
  onPayInstallment?: (id: string, bankAccountId: string) => void;
}

function InstallmentDraftPayCard({ inst, bankAccounts, getNextMonthDate, onPayInstallment }: InstallmentDraftPayCardProps) {
  const [payBankId, setPayBankId] = React.useState('');

  React.useEffect(() => {
    if (bankAccounts.length > 0 && !payBankId) {
      setPayBankId(bankAccounts[0].id);
    }
  }, [bankAccounts]);

  const dueDate = getNextMonthDate(inst.startDate, inst.paidMonths, inst.dayOfMonth);

  const handlePayClick = () => {
    if (!payBankId) {
      alert('لطفاً یک حساب برای پرداخت انتخاب کنید.');
      return;
    }
    if (onPayInstallment) {
      onPayInstallment(inst.id, payBankId);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133] bg-[#FDFBF7] dark:bg-[#1B1D16] space-y-3 shadow-xs transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-xs text-[#2D3025]">{inst.title}</h4>
          <span className="text-[9px] text-[#9B6B61] dark:text-[#C59B93] font-bold block mt-0.5">سررسید قسط {inst.paidMonths + 1} از {inst.totalMonths}: {dueDate}</span>
        </div>
        <span className="text-xs font-black text-[#9B6B61] font-mono">{inst.installmentAmount.toLocaleString('fa-IR')} تومان</span>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-[#E6DFD3]/40 dark:border-[#3D4133]/40">
        <label className="text-[9px] font-bold text-[#8D7F72] block">پرداخت از حساب / کارت:</label>
        <select value={payBankId} onChange={e => setPayBankId(e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-lg border border-[#E6DFD3] dark:border-[#3D4133] text-[10px] font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]">
          {bankAccounts.map(b => (
            <option key={b.id} value={b.id}>
              {b.bankName} ({b.accountName}) — {b.isCredit ? 'اعتبار:' : 'موجودی:'} {b.balance.toLocaleString('fa-IR')} تومان
            </option>
          ))}
        </select>
      </div>

      <button type="button" onClick={handlePayClick}
        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>تایید و پرداخت قسط</span>
      </button>
    </div>
  );
}

export default function FinanceSection({
  transactions, onAddTransaction, onDeleteTransaction, onEditTransaction,
  subscriptions, onAddSubscription, onDeleteSubscription, onToggleSubscriptionStatus, onEditSubscription,
  categories, onAddCategory, onDeleteCategory, onAddSubcategory, onDeleteSubcategory,
  budgetSettings, onUpdateBudgetSettings,
  bankAccounts, onAddBankAccount, onDeleteBankAccount, onUpdateBankAccount,
  recurringTransactions, onAddRecurring, onDeleteRecurring, onToggleRecurring, onApplyRecurring,
  debts, onAddDebt, onDeleteDebt, onToggleDebtCompletion,
  todayDate,
  assets, onAddAsset, onDeleteAsset, onUpdateAsset,
  documents = [],
  installments = [],
  onAddInstallment,
  onDeleteInstallment,
  onPayInstallment,
  initialQuickTemplates,
  onQuickTemplatesChange,
  contacts = [],
  onNavigateContact,
}: FinanceSectionProps) {

  // ── Tab ──────────────────────────────────────────────────────────────────
  const [financeTab, setFinanceTab] = useState<FinanceTab>('records');
  const [debtSubTab, setDebtSubTab] = useState<'debts' | 'installments'>('debts');

  // ── Installments Form States ──────────────────────────────────────────────
  const [showInstallmentForm, setShowInstallmentForm] = useState(false);
  const [instTitle, setInstTitle] = useState('');
  const [instTotalAmount, setInstTotalAmount] = useState('');
  const [instMonths, setInstMonths] = useState('6');
  const [instPaidMonths, setInstPaidMonths] = useState('0');
  const [instStartDate, setInstStartDate] = useState(todayDate);
  const [instDayOfMonth, setInstDayOfMonth] = useState('5');
  const [instCategory, setInstCategory] = useState('shopping');

  // ── Asset Portfolio States ────────────────────────────────────────────────
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetSymbol, setAssetSymbol] = useState('');
  const [assetType, setAssetType] = useState<'crypto' | 'gold' | 'stock' | 'currency' | 'real_estate' | 'other'>('crypto');
  const [assetAmount, setAssetAmount] = useState('');
  const [assetPurchasePrice, setAssetPurchasePrice] = useState('');
  const [assetCurrentPrice, setAssetCurrentPrice] = useState('');
  const [assetNotes, setAssetNotes] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('all');
  const [assetSearch, setAssetSearch] = useState('');
  const [quickPrices, setQuickPrices] = useState<Record<string, string>>({});

  // ── Asset Purchase via Transaction States ──────────────────────────────────
  const [isAssetPurchase, setIsAssetPurchase] = useState(false);
  const [txAssetName, setTxAssetName] = useState('');
  const [txAssetSymbol, setTxAssetSymbol] = useState('');
  const [txAssetType, setTxAssetType] = useState<'crypto' | 'gold' | 'stock' | 'currency' | 'real_estate' | 'other'>('crypto');
  const [txAssetAmount, setTxAssetAmount] = useState('');
  const [txAssetMarketPrice, setTxAssetMarketPrice] = useState('');

  // ── Transaction Add Form ─────────────────────────────────────────────────
  const [type,        setType]        = useState<'income'|'expense'|'transfer'>('expense');
  const [amount,      setAmount]      = useState('');
  const [category,    setCategory]    = useState('food');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [date,        setDate]        = useState(todayDate); // ✅ fixed: no hardcoded date
  const [expandForm,  setExpandForm]  = useState(false);
  const [bankAccountId, setBankAccountId] = useState('');
  const [toBankAccountId, setToBankAccountId] = useState('');

  // ── Quick Templates ──────────────────────────────────────────────────────
  interface QuickTemplate {
    id: string;
    title: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    subcategory?: string;
    description?: string;
    bankAccountId?: string;
    iconName?: string;
  }

  const ICON_LIBRARIES: Record<string, Record<string, React.ComponentType<any>>> = {
    'مالی و بانکی (Finance)': {
      'Wallet': Wallet,
      'CreditCard': CreditCard,
      'Coins': Coins,
      'DollarSign': DollarSign,
      'TrendingUp': TrendingUp,
      'Percent': Percent,
    },
    'سبک زندگی و تفریح (Lifestyle)': {
      'Utensils': Utensils,
      'Coffee': Coffee,
      'Car': Car,
      'Home': Home,
      'ShoppingBag': ShoppingBag,
      'Gamepad2': Gamepad2,
      'Tv': Tv,
      'Plane': Plane,
      'Dumbbell': Dumbbell,
    },
    'آموزش و عمومی (General & Learning)': {
      'GraduationCap': GraduationCap,
      'Sparkles': Sparkles,
      'HeartPulse': HeartPulse,
      'Briefcase': Briefcase,
      'Key': Key,
      'FileText': FileText,
      'Flame': Flame,
    }
  };

  const [quickTemplates, setQuickTemplates] = useState<QuickTemplate[]>(() => initialQuickTemplates || [
    { id: 'qt-snapp', title: '🚕 اسنپ / تاکسی', type: 'expense', amount: 45000, category: 'transport', description: 'کرایه اسنپ' },
    { id: 'qt-super', title: '🛒 سوپرمارکت', type: 'expense', amount: 150000, category: 'food', description: 'خرید سوپرمارکتی' },
    { id: 'qt-bread', title: '🍞 خرید نان', type: 'expense', amount: 15000, category: 'food', description: 'نانوایی' },
    { id: 'qt-building', title: '🏢 شارژ ساختمان', type: 'expense', amount: 200000, category: 'rent', description: 'شارژ آپارتمان' },
  ]);
  React.useEffect(() => {
    if (initialQuickTemplates) {
      setQuickTemplates(initialQuickTemplates as QuickTemplate[]);
    }
  }, [initialQuickTemplates]);
  React.useEffect(() => {
    onQuickTemplatesChange?.(quickTemplates);
  }, [quickTemplates, onQuickTemplatesChange]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<'income' | 'expense'>('expense');
  const [newTemplateAmt, setNewTemplateAmt] = useState('');
  const [newTemplateCat, setNewTemplateCat] = useState('food');
  const [newTemplateSub, setNewTemplateSub] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateBank, setNewTemplateBank] = useState('');
  const [newTemplateIcon, setNewTemplateIcon] = useState('');

  // ── Records: filter / search / pagination ────────────────────────────────
  const [activeFilter,   setActiveFilter]   = useState<TxFilter>('all');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [currentPage,    setCurrentPage]    = useState(1);

  // ── Transaction detail/edit modal ────────────────────────────────────────
  const [detailTx,  setDetailTx]  = useState<Transaction | null>(null);
  const [txEditMode, setTxEditMode] = useState(false);
  const [editTxType, setEditTxType] = useState<'income'|'expense'|'transfer'>('expense');
  const [editTxAmt,  setEditTxAmt]  = useState('');
  const [editTxCat,  setEditTxCat]  = useState('');
  const [editTxSub,  setEditTxSub]  = useState('');
  const [editTxDesc, setEditTxDesc] = useState('');
  const [editTxDate, setEditTxDate] = useState('');
  const [editTxBank, setEditTxBank] = useState('');
  const [editTxToBank, setEditTxToBank] = useState('');

  // ── Debts & Loans ────────────────────────────────────────────────────────
  const [debtTitle,       setDebtTitle]       = useState('');
  const [debtType,        setDebtType]        = useState<'debt'|'loan'>('debt');
  const [debtAmount,      setDebtAmount]      = useState('');
  const [debtPerson,      setDebtPerson]      = useState('');
  const [debtDueDate,     setDebtDueDate]     = useState(todayDate);
  const [debtDesc,        setDebtDesc]        = useState('');
  const [showDebtForm,    setShowDebtForm]    = useState(false);

  // ── Bank accounts form ───────────────────────────────────────────────────
  const [showBankForm,  setShowBankForm]  = useState(false);
  const [editingBankId, setEditingBankId] = useState<string|null>(null);
  const [bkName,    setBkName]    = useState('');
  const [bkAccName, setBkAccName] = useState('');
  const [bkBalance, setBkBalance] = useState('');
  const [bkCard,    setBkCard]    = useState('');
  const [bkColor,   setBkColor]   = useState('#1E3A8A');
  const [bkIsCredit, setBkIsCredit] = useState(false);
  const [bkCreditLimit, setBkCreditLimit] = useState('');
  const [bkCreditDueDate, setBkCreditDueDate] = useState('');

  // ── Credit Card Settle / Repay States ─────────────────────────────────────
  const [settlingBankId, setSettlingBankId] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleFundingBankId, setSettleFundingBankId] = useState('');

  // ── Subscriptions ────────────────────────────────────────────────────────
  const [subName,     setSubName]     = useState('اشتراک فیلیمو');
  const [subPrice,    setSubPrice]    = useState('');
  const [subCycle,    setSubCycle]    = useState<'monthly'|'yearly'>('monthly');
  const [subNextDate, setSubNextDate] = useState(todayDate);
  const [subCategory, setSubCategory] = useState('entertainment');
  const [subCard,     setSubCard]     = useState('•••• ۴۵۲۱');
  const [subProvider, setSubProvider] = useState('filimo');
  const [editingSubId,  setEditingSubId]  = useState<string|null>(null);
  const [editSubPrice,  setEditSubPrice]  = useState('');
  const [editSubNext,   setEditSubNext]   = useState('');
  const [editSubName,   setEditSubName]   = useState('');

  // ── Budget ───────────────────────────────────────────────────────────────
  const currentMonthlyBudget = budgetSettings?.monthlyTotal ?? 15800000;
  const currentCatBudgets    = budgetSettings?.categoryBudgets ?? {};
  const [budgetTotalInput, setBudgetTotalInput] = useState(String(currentMonthlyBudget));
  const [catBudgetInputs,  setCatBudgetInputs]  = useState<Record<string,string>>(() => {
    const init: Record<string,string> = {};
    categories.filter(c => c.type === 'expense').forEach(c => {
      init[c.id] = String(currentCatBudgets[c.id] ?? '');
    });
    return init;
  });
  const [budgetDirty, setBudgetDirty] = useState(false);

  // ── Recurring form ───────────────────────────────────────────────────────
  const [showRecurForm, setShowRecurForm] = useState(false);
  const [recurType,     setRecurType]     = useState<'income'|'expense'>('expense');
  const [recurAmount,   setRecurAmount]   = useState('');
  const [recurCat,      setRecurCat]      = useState('food');
  const [recurDesc,     setRecurDesc]     = useState('');
  const [recurFreq,     setRecurFreq]     = useState<'daily'|'weekly'|'monthly'|'yearly'>('monthly');
  const [recurNext,     setRecurNext]     = useState(todayDate);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getCategoryName = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : (CATEGORY_LABELS[catId] || catId);
  };

  const incomes       = transactions.filter(t => t.type === 'income');
  const expenses      = transactions.filter(t => t.type === 'expense');
  const totalIncome   = incomes.reduce((s,t)  => s + t.amount, 0);
  const totalExpense  = expenses.reduce((s,t) => s + t.amount, 0);
  const netBalance    = totalIncome - totalExpense;
  const totalBankBal  = bankAccounts.reduce((s,b) => s + b.balance, 0);

  const expenseByCategory = useMemo(() =>
    expenses.reduce((acc,t) => { acc[t.category]=(acc[t.category]||0)+t.amount; return acc; }, {} as Record<string,number>),
    [expenses]
  );

  const pieChartData = Object.keys(expenseByCategory).map(cat => ({
    name: getCategoryName(cat), value: expenseByCategory[cat], id: cat
  }));

  // Filtered + paginated transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (activeFilter !== 'all' && t.type !== activeFilter) return false;
      if (filterCategory && t.category !== filterCategory) return false;
      if (filterStartDate && t.date < filterStartDate) return false;
      if (filterEndDate && t.date > filterEndDate) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!t.description.toLowerCase().includes(q) && !getCategoryName(t.category).includes(q) && !String(t.amount).includes(q)) return false;
      }
      return true;
    }).slice().reverse();
  }, [transactions, activeFilter, filterCategory, searchQuery, filterStartDate, filterEndDate]);

  const totalPages         = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const safePage           = Math.min(currentPage, totalPages);
  const paginatedTx        = filteredTransactions.slice((safePage-1)*PAGE_SIZE, safePage*PAGE_SIZE);

  const resetFilterPage = () => setCurrentPage(1);

  // Monthly report data
  const monthlyMap = useMemo(() =>
    transactions.reduce((acc, t) => {
      const month = t.date.slice(0,7);
      if (!acc[month]) acc[month] = { income:0, expense:0 };
      if (t.type==='income') acc[month].income += t.amount;
      else acc[month].expense += t.amount;
      return acc;
    }, {} as Record<string,{income:number;expense:number}>),
    [transactions]
  );

  const sortedMonths = Object.keys(monthlyMap).sort();
  const PERSIAN_MONTHS: Record<string,string> = {
    '01':'فروردین','02':'اردیبهشت','03':'خرداد','04':'تیر',
    '05':'مرداد','06':'شهریور','07':'مهر','08':'آبان',
    '09':'آذر','10':'دی','11':'بهمن','12':'اسفند'
  };
  const monthLabel = (key:string) => { const [,m]=key.split('-'); return PERSIAN_MONTHS[m]||key; };
  const monthlyChartData = sortedMonths.map(m => ({
    month:m, label:monthLabel(m),
    income:monthlyMap[m].income, expense:monthlyMap[m].expense,
    net: monthlyMap[m].income - monthlyMap[m].expense
  }));

  const thisMonth    = new Date().toISOString().slice(0,7);
  const prevMonthKey = (() => { const d=new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();
  const currentM     = monthlyMap[thisMonth]    || { income:0, expense:0 };
  const prevM        = monthlyMap[prevMonthKey] || { income:0, expense:0 };
  const pctChange    = (curr:number, prev:number) => prev===0 ? (curr>0?100:0) : Math.round(((curr-prev)/prev)*100);

  const thisMonthKey = todayDate.slice(0,7);
  const spendByCategory = useMemo(() =>
    expenses.filter(t => t.date.startsWith(thisMonthKey))
      .reduce((acc,t) => { acc[t.category]=(acc[t.category]||0)+t.amount; return acc; }, {} as Record<string,number>),
    [expenses, thisMonthKey]
  );
  const expenseCategories = categories.filter(c => c.type==='expense');

  // ── Subscription computed ────────────────────────────────────────────────
  const activeSubs      = subscriptions.filter(s => s.status==='active');
  const totalSubMonthly = activeSubs.reduce((s,sub) => s+(sub.billingCycle==='monthly'?sub.price:sub.price/12), 0);
  const largestSub      = activeSubs.length>0 ? activeSubs.reduce((max,s)=>s.price>max.price?s:max, activeSubs[0]) : null;
  const upcomingRenewals = activeSubs.slice().sort((a,b)=>a.nextBillingDate.localeCompare(b.nextBillingDate));

  // ── Debts & Loans computed ───────────────────────────────────────────────
  const activeDebtsList = debts.filter(d => !d.completed);
  const completedDebtsList = debts.filter(d => d.completed);
  const totalOwedToOthers = activeDebtsList.filter(d => d.type === 'debt').reduce((sum, d) => sum + d.amount, 0);
  const totalOwedToMe = activeDebtsList.filter(d => d.type === 'loan').reduce((sum, d) => sum + d.amount, 0);
  const netDebtBalance = totalOwedToMe - totalOwedToOthers;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleTypeChange = (newType: 'income'|'expense') => {
    setType(newType);
    const cats = categories.filter(c => c.type===newType);
    if (cats.length>0) { setCategory(cats[0].id); setSubcategory(cats[0].subcategories[0]||''); }
    else { setCategory(newType==='expense'?'food':'salary'); setSubcategory(''); }
  };

  const handleCategoryChange = (catId: string) => {
    setCategory(catId);
    const catObj = categories.find(c=>c.id===catId);
    setSubcategory(catObj?.subcategories[0]||'');
  };

  const handleSubmitTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount)<=0) return;
    
    if (type === 'transfer') {
      if (!bankAccountId || !toBankAccountId) {
        alert('لطفاً هم حساب مبدأ و هم حساب مقصد را انتخاب کنید.');
        return;
      }
      if (bankAccountId === toBankAccountId) {
        alert('حساب مبدأ و مقصد نمی‌توانند یکسان باشند.');
        return;
      }
      onAddTransaction({
        type: 'transfer',
        amount: Number(amount),
        category: 'other',
        date,
        description: description || `انتقال وجه از ${bankAccounts.find(b=>b.id===bankAccountId)?.bankName || ''} به ${bankAccounts.find(b=>b.id===toBankAccountId)?.bankName || ''}`,
        bankAccountId,
        toBankAccountId
      });
    } else {
      if (type === 'expense' && isAssetPurchase) {
        if (!txAssetName || !txAssetSymbol || !txAssetAmount) {
          alert('لطفاً اطلاعات دارایی را به طور کامل پر کنید.');
          return;
        }
        const qty = Number(txAssetAmount);
        const totalCost = Number(amount);
        if (isNaN(qty) || qty <= 0) {
          alert('مقدار واحد دارایی باید بزرگتر از صفر باشد.');
          return;
        }
        const pPrice = totalCost / qty;
        const cPrice = txAssetMarketPrice ? Number(txAssetMarketPrice) : pPrice;

        onAddAsset({
          name: txAssetName,
          symbol: txAssetSymbol.toUpperCase(),
          type: txAssetType,
          amount: qty,
          purchasePrice: pPrice,
          currentPrice: cPrice,
          notes: `خریداری شده از تراکنش بابت: ${description || 'سرمایه‌گذاری'} در تاریخ ${date}`,
          lastUpdated: date
        });
      }

      const targetAcc = bankAccountId ? bankAccounts.find(b => b.id === bankAccountId) : null;
      const isCreditPurchase = !!(targetAcc?.isCredit && type === 'expense');

      onAddTransaction({ 
        type, 
        amount:Number(amount), 
        category, 
        subcategory:subcategory||undefined, 
        date, 
        description: description || (isCreditPurchase ? `خرید اعتباری - ${getCategoryName(category)}` : getCategoryName(category)),
        bankAccountId:bankAccountId || undefined,
        isCreditPurchase: isCreditPurchase || undefined
      });
    }
    setAmount(''); setSubcategory(''); setDescription(''); setBankAccountId(''); setToBankAccountId('');
    setIsAssetPurchase(false);
    setTxAssetName('');
    setTxAssetSymbol('');
    setTxAssetType('crypto');
    setTxAssetAmount('');
    setTxAssetMarketPrice('');
  };

  // CSV export
  const handleExportCSV = () => {
    const header = 'نوع,مبلغ,دسته‌بندی,زیردسته,تاریخ,توضیح';
    const rows = transactions.map(t =>
      `${t.type==='income'?'درآمد':'هزینه'},${t.amount},${getCategoryName(t.category)},${t.subcategory||''},${t.date},"${t.description}"`
    );
    const csv = [header,...rows].join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download='hambaft-transactions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Open detail modal
  const openDetail = (tx: Transaction) => {
    setDetailTx(tx); setTxEditMode(false);
    setEditTxType(tx.type); setEditTxAmt(String(tx.amount));
    setEditTxCat(tx.category); setEditTxSub(tx.subcategory||'');
    setEditTxDesc(tx.description); setEditTxDate(tx.date);
    setEditTxBank(tx.bankAccountId || '');
    setEditTxToBank(tx.toBankAccountId || '');
  };

  const handleSaveEditTx = () => {
    if (!detailTx || !editTxAmt || Number(editTxAmt)<=0) return;
    onEditTransaction(detailTx.id, {
      type: editTxType, 
      amount: Number(editTxAmt), 
      category: editTxType === 'transfer' ? 'other' : editTxCat,
      subcategory: editTxType === 'transfer' ? undefined : (editTxSub || undefined), 
      description: editTxDesc || (editTxType === 'transfer' ? `انتقال وجه از ${bankAccounts.find(b=>b.id===editTxBank)?.bankName || ''} به ${bankAccounts.find(b=>b.id===editTxToBank)?.bankName || ''}` : getCategoryName(editTxCat)), 
      date: editTxDate,
      bankAccountId: editTxBank || undefined,
      toBankAccountId: editTxType === 'transfer' ? (editTxToBank || undefined) : undefined
    });
    setDetailTx(null);
  };

  // Bank account form handlers
  const resetBankForm = () => { 
    setBkName(''); 
    setBkAccName(''); 
    setBkBalance(''); 
    setBkCard(''); 
    setBkColor('#1E3A8A'); 
    setBkIsCredit(false);
    setBkCreditLimit('');
    setBkCreditDueDate('');
    setEditingBankId(null); 
    setShowBankForm(false); 
  };
  const openEditBank = (b: BankAccount) => {
    setEditingBankId(b.id); 
    setBkName(b.bankName); 
    setBkAccName(b.accountName);
    setBkBalance(String(b.balance)); 
    setBkCard(b.cardNumber||''); 
    setBkColor(b.color||'#1E3A8A');
    setBkIsCredit(!!b.isCredit);
    setBkCreditLimit(b.creditLimit ? String(b.creditLimit) : '');
    setBkCreditDueDate(b.creditDueDate || '');
    setShowBankForm(true);
  };
  const handleSubmitBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bkName||!bkBalance) return;
    const data = { 
      bankName: bkName, 
      accountName: bkAccName, 
      balance: Number(bkBalance), 
      cardNumber: bkCard || undefined, 
      color: bkColor,
      isCredit: bkIsCredit,
      creditLimit: bkIsCredit ? (Number(bkCreditLimit) || 0) : undefined,
      creditDebt: bkIsCredit ? Math.max(0, (Number(bkCreditLimit) || 0) - Number(bkBalance)) : undefined,
      creditDueDate: bkIsCredit ? bkCreditDueDate : undefined
    };
    if (editingBankId) onUpdateBankAccount(editingBankId, data);
    else onAddBankAccount(data);
    resetBankForm();
  };

  // Subscription form
  const handleSubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName||!subPrice||Number(subPrice)<=0) return;
    onAddSubscription({ name:subName, price:Number(subPrice), billingCycle:subCycle, nextBillingDate:subNextDate, category:subCategory, cardUsed:subCard, provider:subProvider, status:'active' });
    setSubPrice('');
  };

  const startEditSub = (s: Subscription) => {
    setEditingSubId(s.id); setEditSubName(s.name); setEditSubPrice(String(s.price)); setEditSubNext(s.nextBillingDate);
  };
  const saveEditSub = (s: Subscription) => {
    onEditSubscription(s.id, { ...s, name:editSubName, price:Number(editSubPrice)||s.price, nextBillingDate:editSubNext });
    setEditingSubId(null);
  };

  // Budget
  const handleSaveBudget = () => {
    const newCatBudgets: Record<string,number> = {};
    Object.entries(catBudgetInputs).forEach(([id,val]) => {
      const n=Number(val); if (!isNaN(n)&&n>0) newCatBudgets[id]=n;
    });
    onUpdateBudgetSettings({ monthlyTotal:Number(budgetTotalInput)||15800000, categoryBudgets:newCatBudgets });
    setBudgetDirty(false);
  };

  // Recurring
  const handleSubmitRecur = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurAmount||Number(recurAmount)<=0||!recurDesc) return;
    onAddRecurring({ type:recurType, amount:Number(recurAmount), category:recurCat, description:recurDesc, frequency:recurFreq, nextDate:recurNext, active:true });
    setRecurAmount(''); setRecurDesc(''); setShowRecurForm(false);
  };

  // Debts
  const handleAddDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtTitle || !debtAmount || Number(debtAmount) <= 0 || !debtPerson) return;
    onAddDebt({
      title: debtTitle,
      type: debtType,
      amount: Number(debtAmount),
      person: debtPerson,
      dueDate: debtDueDate,
      description: debtDesc || undefined
    });
    setDebtTitle('');
    setDebtAmount('');
    setDebtPerson('');
    setDebtDesc('');
    setShowDebtForm(false);
  };

  // ── Asset Portfolio Handlers ──
  const handleSubmitAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !assetSymbol || !assetAmount || !assetCurrentPrice) return;
    
    const amountVal = Number(assetAmount);
    const buyPriceVal = Number(assetPurchasePrice) || Number(assetCurrentPrice);
    const curPriceVal = Number(assetCurrentPrice);
    
    const assetData = {
      name: assetName.trim(),
      symbol: assetSymbol.trim().toUpperCase(),
      type: assetType,
      amount: amountVal,
      purchasePrice: buyPriceVal,
      currentPrice: curPriceVal,
      notes: assetNotes.trim() || undefined,
      lastUpdated: todayDate
    };
    
    if (editingAssetId) {
      onUpdateAsset(editingAssetId, assetData);
      setEditingAssetId(null);
    } else {
      onAddAsset(assetData);
    }
    
    // reset form
    setAssetName('');
    setAssetSymbol('');
    setAssetType('crypto');
    setAssetAmount('');
    setAssetPurchasePrice('');
    setAssetCurrentPrice('');
    setAssetNotes('');
    setShowAssetForm(false);
  };

  const handleEditAssetClick = (a: AssetInvestment) => {
    setEditingAssetId(a.id);
    setAssetName(a.name);
    setAssetSymbol(a.symbol);
    setAssetType(a.type);
    setAssetAmount(String(a.amount));
    setAssetPurchasePrice(String(a.purchasePrice));
    setAssetCurrentPrice(String(a.currentPrice));
    setAssetNotes(a.notes || '');
    setShowAssetForm(true);
    
    // Scroll to form anchor
    setTimeout(() => {
      const element = document.getElementById('asset-form-anchor');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // ── Shared UI pieces ──────────────────────────────────────────────────────
  const SummaryCard = ({ label, value, color, icon, borderColor }: { label:string; value:string; color:string; icon:React.ReactNode; borderColor:string }) => (
    <div className={`bg-[#FDFBF7] p-4 sm:p-5 rounded-2xl shadow-sm border ${borderColor} flex items-center justify-between`}>
      <div className="space-y-1 min-w-0 flex-1">
        <span className="text-[11px] text-[#8D7F72] font-semibold block">{label}</span>
        <h3 className={`text-lg sm:text-xl font-bold font-serif-elegant truncate ${color}`}>{value} <span className="text-[10px] font-normal text-[#8D7F72]">تومان</span></h3>
      </div>
      {icon}
    </div>
  );

  const iconBox = (bg:string, border:string, color:string, Icon:any) => (
    <div className={`p-3 rounded-xl shrink-0 mr-3 ${bg} ${color} border ${border}`}><Icon className="w-5 h-5" /></div>
  );

  const portfolioSummary = useMemo(() => {
    const list = assets || [];
    let totalCurrentValue = 0;
    let totalPurchaseCost = 0;
    
    list.forEach(a => {
      totalCurrentValue += a.amount * a.currentPrice;
      totalPurchaseCost += a.amount * a.purchasePrice;
    });
    
    const netProfitLoss = totalCurrentValue - totalPurchaseCost;
    const profitLossPercent = totalPurchaseCost > 0 ? (netProfitLoss / totalPurchaseCost) * 100 : 0;
    
    return {
      totalCurrentValue,
      totalPurchaseCost,
      netProfitLoss,
      profitLossPercent
    };
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const list = assets || [];
    return list.filter(a => {
      const matchType = assetTypeFilter === 'all' || a.type === assetTypeFilter;
      const matchSearch = a.name.toLowerCase().includes(assetSearch.toLowerCase()) || 
                          a.symbol.toLowerCase().includes(assetSearch.toLowerCase());
      return matchType && matchSearch;
    });
  }, [assets, assetTypeFilter, assetSearch]);

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5 text-right pb-8" dir="rtl">

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="bg-[#E6DFD3]/40 p-1 rounded-xl border border-[#E6DFD3] flex gap-1 w-full overflow-x-auto whitespace-nowrap scrollbar-none">
        {([
          { id:'records',       label:'تراکنش‌ها' },
          { id:'accounts',      label:'حساب‌ها' },
          { id:'subscriptions', label:'اشتراک‌ها' },
          { id:'budget',        label:'بودجه' },
          { id:'report',        label:'گزارش' },
          { id:'categories',    label:'دسته‌ها' },
          { id:'debts',         label:'بدهی و طلب' },
          { id:'assets',        label:'دارایی و کریپتو' },
        ] as const).map(tab => (
          <button key={tab.id} type="button" onClick={() => setFinanceTab(tab.id)}
            className={`flex-1 py-1.5 text-[9px] sm:text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer relative ${
              financeTab===tab.id ? 'bg-[#2D3025] text-white shadow-xs' : 'text-[#8D7F72] hover:text-[#2D3025]'
            }`}>
            {tab.id==='budget' && budgetDirty && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#E26645]" />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          RECORDS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {financeTab==='records' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Real bank balance (if accounts exist) OR transaction flow (clearly labelled) */}
            {bankAccounts.length > 0 ? (
              <div className="bg-[#FDFBF7] p-4 sm:p-5 rounded-2xl shadow-sm border border-[#EBE3C8] flex items-center justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <span className="text-[11px] text-[#8D7F72] font-semibold block">موجودی واقعی حساب‌های بانکی</span>
                  <h3 className="text-lg sm:text-xl font-bold font-serif-elegant truncate text-[#2D3025]">
                    {totalBankBal.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72]">تومان</span>
                  </h3>
                  <button onClick={() => setFinanceTab('accounts')}
                    className="text-[9px] font-bold text-[#7C8363] hover:underline cursor-pointer">
                    مشاهده {bankAccounts.length} حساب ←
                  </button>
                </div>
                {iconBox('bg-[#F9F1D8]','border-[#EBE3C8]','text-[#5A5A40]', Building2)}
              </div>
            ) : (
              <div className="bg-[#FDFBF7] p-4 sm:p-5 rounded-2xl shadow-sm border border-dashed border-[#DDE2D5] flex items-center justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <span className="text-[11px] text-[#8D7F72] font-semibold block">موجودی واقعی حساب‌های بانکی</span>
                  <p className="text-[10px] text-[#8D7F72] leading-relaxed">برای نمایش موجودی دقیق، حساب‌های بانکی‌ات را اضافه کن.</p>
                  <button onClick={() => setFinanceTab('accounts')}
                    className="text-[10px] font-bold text-[#7C8363] hover:underline cursor-pointer">
                    + افزودن حساب بانکی
                  </button>
                </div>
                {iconBox('bg-[#E8ECE0]','border-[#DDE2D5]','text-[#7C8363]', Building2)}
              </div>
            )}
            <SummaryCard label="کل درآمدهای ثبت‌شده در تراکنش‌ها" value={totalIncome.toLocaleString('fa-IR')} color="text-[#7C8363]" icon={iconBox('bg-[#E8ECE0]','border-[#DDE2D5]','text-[#7C8363]',TrendingUp)} borderColor="border-[#DDE2D5]" />
            <SummaryCard label="کل مخارج ثبت‌شده در تراکنش‌ها" value={totalExpense.toLocaleString('fa-IR')} color="text-[#9B6B61]" icon={iconBox('bg-[#F4E9E4]','border-[#EDDDD7]','text-[#9B6B61]',TrendingDown)} borderColor="border-[#EDDDD7]" />
          </div>

          {/* ── Quick Templates Section ── */}
          <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#2D3025] flex items-center gap-1.5 font-serif-elegant">
                <Zap className="w-4 h-4 text-[#E26645] fill-[#9B6B61] animate-pulse" />
                <span>الگوهای ثبت سریع (کلیک برای ثبت فوری تراکنش)</span>
              </h3>
              <button type="button" onClick={() => setShowTemplateForm(p => !p)}
                className="text-[9px] font-bold text-[#7C8363] hover:text-[#2D3025] border border-[#DDE2D5] px-2.5 py-1 rounded-xl hover:bg-[#E8ECE0] transition-all cursor-pointer">
                {showTemplateForm ? 'بستن فرم الگو' : '+ ساخت الگوی اختصاصی'}
              </button>
            </div>

            {/* Quick Templates Buttons Row */}
            <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1 scrollbar-none">
              {quickTemplates.map(qt => {
                const catObj = categories.find(c => c.id === qt.category);
                return (
                  <button key={qt.id} type="button"
                    onClick={() => {
                      setType(qt.type);
                      setAmount(String(qt.amount));
                      setCategory(qt.category);
                      setSubcategory(qt.subcategory || '');
                      setDescription(qt.description || qt.title || '');
                      setBankAccountId(qt.bankAccountId || '');
                      setExpandForm(true);
                      
                      // Also scroll to transaction form
                      const element = document.getElementById('transaction-form');
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#FDFBF7] dark:bg-[#1B1D16] hover:bg-[#F9F6EE] border border-[#E6DFD3] hover:border-[#7C8363] rounded-2xl shadow-2xs transition-all cursor-pointer text-xs font-bold text-[#2D3025] group shrink-0">
                    <span className="text-sm flex items-center justify-center">
                      {qt.iconName ? (() => {
                        let FoundIcon: React.ComponentType<any> = Wallet;
                        for (const lib of Object.values(ICON_LIBRARIES)) {
                          if (lib[qt.iconName]) {
                            FoundIcon = lib[qt.iconName];
                            break;
                          }
                        }
                        return <FoundIcon className="w-4 h-4 text-[#7C8363]" />;
                      })() : (catObj?.icon || '💰')}
                    </span>
                    <div className="text-right">
                      <span className="block text-[10px] text-[#2D3025] dark:text-[#E8ECE0] font-black">{qt.title}</span>
                      <span className="block text-[9px] text-[#8D7F72] mt-0.5 font-bold font-mono">
                        {qt.amount.toLocaleString('fa-IR')} تومان
                      </span>
                    </div>
                    {/* Delete template button for custom templates */}
                    {qt.id.startsWith('qt-custom-') && (
                      <span onClick={(e) => {
                        e.stopPropagation();
                        const filtered = quickTemplates.filter(q => q.id !== qt.id);
                        setQuickTemplates(filtered);
                      }} title="حذف این الگو"
                        className="mr-1.5 text-[#9D978B] dark:text-[#7C8363] hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-[#F9F6EE] dark:bg-[#1B1D16]">
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Template Add Form */}
            <AnimatePresence>
              {showTemplateForm && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="bg-[#F9F6EE] p-4 rounded-xl border border-[#E6DFD3] space-y-3 pt-3">
                    <h4 className="text-[11px] font-bold text-[#2D3025] border-b border-[#E6DFD3] pb-1.5 mb-1">تعریف الگوی جدید</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#8D7F72]">نام الگو (عنوان دکمه)</label>
                        <input type="text" placeholder="مثال: خرید نان بربری" value={newTemplateTitle} onChange={e => setNewTemplateTitle(e.target.value)} required
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#8D7F72]">نوع تراکنش</label>
                        <div className="flex bg-[#E6DFD3] p-0.5 rounded-lg w-full">
                          {(['expense', 'income'] as const).map(t => (
                            <button key={t} type="button" onClick={() => {
                              setNewTemplateType(t);
                              const cats = categories.filter(c => c.type === t);
                              if (cats.length > 0) setNewTemplateCat(cats[0].id);
                            }}
                              className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${newTemplateType === t ? 'bg-[#FDFBF7] dark:bg-[#1B1D16] text-[#2D3025] shadow-xs' : 'text-[#8D7F72]'}`}>
                              {t === 'expense' ? 'هزینه' : 'درآمد'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#8D7F72]">مبلغ (تومان)</label>
                        <MoneyInput value={newTemplateAmt} onChange={setNewTemplateAmt} placeholder="مثال: ۱۵۰۰۰" required
                          className="py-2 rounded-xl border border-[#D6CFC3] text-xs focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#8D7F72]">دسته‌بندی</label>
                        <select value={newTemplateCat} onChange={e => {
                          setNewTemplateCat(e.target.value);
                          const cat = categories.find(c => c.id === e.target.value);
                          setNewTemplateSub(cat?.subcategories[0] || '');
                        }}
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]">
                          {categories.filter(c => c.type === newTemplateType).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#8D7F72]">توضیحات پیش‌فرض (اختیاری)</label>
                        <input type="text" placeholder="مثال: خرید بربری هفتگی" value={newTemplateDesc} onChange={e => setNewTemplateDesc(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#8D7F72] flex items-center justify-between">
                          <span>آیکون الگو (کتابخانه آیکون‌ها)</span>
                          {newTemplateIcon && (() => {
                            let FoundIcon: React.ComponentType<any> = Wallet;
                            for (const lib of Object.values(ICON_LIBRARIES)) {
                              if (lib[newTemplateIcon]) {
                                FoundIcon = lib[newTemplateIcon];
                                break;
                              }
                            }
                            return <FoundIcon className="w-3.5 h-3.5 text-[#7C8363]" />;
                          })()}
                        </label>
                        <select value={newTemplateIcon} onChange={e => setNewTemplateIcon(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]">
                          <option value="">-- پیش‌فرض دسته‌بندی --</option>
                          {Object.entries(ICON_LIBRARIES).map(([libName, icons]) => (
                            <optgroup key={libName} label={libName}>
                              {Object.keys(icons).map(iconName => (
                                <option key={iconName} value={iconName}>{iconName}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      {bankAccounts.length > 0 && (
                        <div className="space-y-1 sm:col-span-3">
                          <label className="text-[9px] font-bold text-[#8D7F72]">کارت یا حساب بانکی (اختیاری)</label>
                          <select value={newTemplateBank} onChange={e => setNewTemplateBank(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]">
                            <option value="">-- نقدی/آفلاین --</option>
                            {bankAccounts.map(b => (
                              <option key={b.id} value={b.id}>{b.bankName} ({b.accountName})</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <button type="button"
                      onClick={() => {
                        if (!newTemplateTitle || !newTemplateAmt || Number(newTemplateAmt) <= 0) {
                          alert('لطفاً عنوان الگو و مبلغ معتبر را وارد کنید.');
                          return;
                        }
                        const newQt: QuickTemplate = {
                          id: `qt-custom-${Date.now()}`,
                          title: newTemplateTitle,
                          type: newTemplateType,
                          amount: Number(newTemplateAmt),
                          category: newTemplateCat,
                          subcategory: newTemplateSub || undefined,
                          description: newTemplateDesc || undefined,
                          bankAccountId: newTemplateBank || undefined,
                          iconName: newTemplateIcon || undefined
                        };
                        const updated = [...quickTemplates, newQt];
                        setQuickTemplates(updated);

                        // Reset fields
                        setNewTemplateTitle('');
                        setNewTemplateAmt('');
                        setNewTemplateDesc('');
                        setNewTemplateBank('');
                        setNewTemplateIcon('');
                        setShowTemplateForm(false);
                      }}
                      className="w-full py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer">
                      ذخیره و اضافه کردن الگوی جدید به لیست الگوها
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Add transaction ── */}
          <div id="transaction-form" className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
                <PlusCircle className="w-4 h-4 text-[#7C8363]" />
                <span>ثبت تراکنش</span>
              </h3>
              <button type="button" onClick={() => setExpandForm(p=>!p)}
                className="text-[10px] font-bold text-[#7C8363] hover:text-[#2D3025] flex items-center gap-1 cursor-pointer">
                {expandForm ? 'فرم ساده' : 'فرم کامل'}
              </button>
            </div>

            {/* Quick-add (always visible) */}
            <form onSubmit={handleSubmitTx}>
              <div className="flex gap-2 items-end flex-wrap">
                <div className="flex bg-[#E6DFD3] p-0.5 rounded-lg shrink-0">
                  {(['expense','income','transfer'] as const).map(t => (
                    <button key={t} type="button" onClick={()=>{
                      setType(t);
                      if (t !== 'transfer') {
                        handleTypeChange(t);
                      }
                    }}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${type===t?(t==='expense'?'bg-[#FDFBF7] text-[#9B6B61] shadow-xs':t==='income'?'bg-[#FDFBF7] text-[#7C8363] shadow-xs':'bg-[#FDFBF7] text-[#4A6B82] shadow-xs'):'text-[#8D7F72]'}`}>
                      {t==='expense'?'هزینه':t==='income'?'درآمد':'انتقال وجه'}
                    </button>
                  ))}
                </div>
                <div className="flex-1 min-w-[150px]">
                  <MoneyInput value={amount} onChange={setAmount} placeholder="مبلغ (تومان)" required
                    className="py-2 rounded-xl border border-[#D6CFC3] text-sm focus:border-[#7C8363] bg-[#FDFBF7]" />
                </div>
                
                {type === 'transfer' ? (
                  <select disabled
                    className="flex-1 min-w-[120px] px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#E6DFD3] text-[#8D7F72] cursor-not-allowed">
                    <option>🔄 انتقال بین حساب‌ها</option>
                  </select>
                ) : (
                  <select value={category} onChange={e=>handleCategoryChange(e.target.value)}
                    className="flex-1 min-w-[120px] px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7]">
                    {categories.filter(c=>c.type===type).map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                )}

                <button type="submit"
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1 ${type==='income'?'bg-[#7C8363] hover:bg-[#5A5A40]':type==='expense'?'bg-[#9B6B61] hover:bg-[#8D7F72]':'bg-[#4A6B82] hover:bg-[#344F63]'}`}>
                  {type==='transfer' ? <ArrowLeftRight className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>ثبت</span>
                </button>
              </div>

              {/* Extended form */}
              <AnimatePresence>
                {expandForm && (
                  <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
                    className="overflow-hidden pt-3 space-y-3">
                    {type !== 'transfer' && (() => { const activeCat=categories.find(c=>c.id===category); return activeCat&&activeCat.subcategories.length>0?(
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">زیردسته (اختیاری)</label>
                        <select value={subcategory} onChange={e=>setSubcategory(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7]">
                          <option value="">بدون زیردسته</option>
                          {activeCat.subcategories.map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    ):null; })()}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">تاریخ</label>
                        <PersianDatePicker value={date} onChange={setDate} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">توضیح</label>
                        <input type="text" placeholder={type === 'transfer' ? 'مثال: انتقال به کارت روزمره' : 'بابت چیست؟'} value={description} onChange={e=>setDescription(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7]" />
                      </div>
                      
                      {type === 'transfer' ? (
                        <div className="space-y-3 sm:col-span-2">
                          {bankAccounts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#EAF2F8]/40 p-4 rounded-xl border border-[#A9CCE3]/30">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#4A6B82] flex items-center gap-1">
                                  <span>حساب بانکی مبدأ (برداشت وجه)</span>
                                </label>
                                <select value={bankAccountId} onChange={e=>setBankAccountId(e.target.value)} required
                                  className="w-full px-3 py-2 rounded-xl border border-[#A9CCE3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]">
                                  <option value="">-- انتخاب حساب مبدأ --</option>
                                  {bankAccounts.map(b=>(
                                    <option key={b.id} value={b.id}>
                                      {b.bankName} ({b.accountName}) — {b.isCredit ? `کارت اعتباری (اعتبار باقیمانده: ${b.balance.toLocaleString('fa-IR')} تومان)` : `موجودی: ${b.balance.toLocaleString('fa-IR')} تومان`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#4A6B82] flex items-center gap-1">
                                  <span>حساب بانکی مقصد (واریز وجه)</span>
                                </label>
                                <select value={toBankAccountId} onChange={e=>setToBankAccountId(e.target.value)} required
                                  className="w-full px-3 py-2 rounded-xl border border-[#A9CCE3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]">
                                  <option value="">-- انتخاب حساب مقصد --</option>
                                  {bankAccounts.map(b=>(
                                    <option key={b.id} value={b.id}>
                                      {b.bankName} ({b.accountName}) — {b.isCredit ? `کارت اعتباری (اعتبار باقیمانده: ${b.balance.toLocaleString('fa-IR')} تومان)` : `موجودی: ${b.balance.toLocaleString('fa-IR')} تومان`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3.5 text-center text-xs text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-xl bg-[#FDFBF7]">
                              برای انتقال بین حساب‌ها، ابتدا باید حداقل دو کارت یا حساب بانکی در تب «حساب‌ها» ایجاد کنید.
                            </div>
                          )}
                        </div>
                      ) : (
                        bankAccounts.length > 0 && (
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] font-bold text-[#8D7F72]">حساب بانکی مرتبط (بروزرسانی خودکار موجودی)</label>
                            <select value={bankAccountId} onChange={e=>setBankAccountId(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7]">
                              <option value="">-- بدون حساب بانکی (تراکنش آفلاین/نقدی) --</option>
                              {bankAccounts.map(b=>(
                                <option key={b.id} value={b.id}>
                                  {b.bankName} ({b.accountName}) — {b.isCredit ? `کارت اعتباری (اعتبار باقیمانده: ${b.balance.toLocaleString('fa-IR')} تومان)` : `موجودی: ${b.balance.toLocaleString('fa-IR')} تومان`}
                                </option>
                              ))}
                            </select>

                            {(() => {
                              const selectedAcc = bankAccounts.find(b => b.id === bankAccountId);
                              if (selectedAcc?.isCredit && type === 'expense') {
                                return (
                                  <div className="bg-[#FDFBF7] dark:bg-[#1B1D16]/70 border border-[#E6DFD3] dark:border-[#3D4133]/60 p-3 rounded-xl text-[11px] text-[#2D3025] dark:text-[#E8ECE0] dark:bg-[#F9F1D8] dark:bg-[#201D13]/20 dark:border-[#E6DFD3] dark:border-[#3D4133]/30 dark:text-[#8D7F72] dark:text-[#9D978B] mt-2 flex items-center gap-2">
                                    <span className="text-sm">💳</span>
                                    <span>این تراکنش به عنوان <strong>خرید اعتباری</strong> ثبت خواهد شد. بدهی کارت افزایش و اعتبار باقیمانده آن کاهش می‌یابد.</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )
                      )}

                      {type === 'expense' && (
                        <div className="sm:col-span-2 border-t border-[#E6DFD3]/60 pt-3 mt-1 space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isAssetPurchase}
                              onChange={e => setIsAssetPurchase(e.target.checked)}
                              className="rounded border-[#D6CFC3] text-[#7C8363] focus:ring-[#7C8363] h-4 w-4"
                            />
                            <span className="text-xs font-bold text-[#2D3025] flex items-center gap-1">
                              🪙 ثبت این هزینه به عنوان خرید دارایی جدید در پورتفوی (طلا، بورس، کریپتو، ملک و زمین ...)
                            </span>
                          </label>

                          {isAssetPurchase && (
                            <div className="bg-[#F9F6EE] p-4 rounded-xl border border-[#E6DFD3] space-y-3 mt-1 text-right" dir="rtl">
                              <h4 className="text-[11px] font-bold text-[#7C8363] border-b border-[#E6DFD3] pb-1.5 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5" />
                                <span>جزئیات دارایی خریداری‌شده</span>
                              </h4>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[#8D7F72]">دسته‌بندی دارایی</label>
                                  <select 
                                    value={txAssetType} 
                                    onChange={e => setTxAssetType(e.target.value as any)}
                                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16] text-right"
                                  >
                                    <option value="crypto">🪙 ارز دیجیتال (Crypto)</option>
                                    <option value="gold">✨ طلا، سکه و فلزات گرانبها</option>
                                    <option value="stock">📈 سهام بورس و صندوق‌ها</option>
                                    <option value="currency">💵 ارزهای فیزیکی (دلار، یورو)</option>
                                    <option value="real_estate">🏢 ملک، زمین و ساختمان</option>
                                    <option value="other">💼 سایر دارایی‌ها</option>
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[#8D7F72]">نام دارایی (مثال: زمین دماوند، طلای آب‌شده)</label>
                                  <input 
                                    type="text" 
                                    value={txAssetName} 
                                    onChange={e => setTxAssetName(e.target.value)} 
                                    placeholder="نام دارایی" 
                                    required={isAssetPurchase}
                                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16] text-right" 
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[#8D7F72]">نماد یا شناسه اختصاری (مثال: LAND، GOLD، BTC)</label>
                                  <input 
                                    type="text" 
                                    value={txAssetSymbol} 
                                    onChange={e => setTxAssetSymbol(e.target.value)} 
                                    placeholder="نماد اختصاری" 
                                    required={isAssetPurchase}
                                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16] text-right" 
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[#8D7F72]">تعداد یا مقدار موجودی خریداری‌شده</label>
                                  <input 
                                    type="number" 
                                    step="any"
                                    value={txAssetAmount} 
                                    onChange={e => setTxAssetAmount(e.target.value)} 
                                    placeholder="مثلاً ۱.۵ یا ۱۰" 
                                    required={isAssetPurchase}
                                    className="w-full text-left px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" 
                                  />
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                  <label className="text-[10px] font-bold text-[#8D7F72]">قیمت فعلی بازار هر واحد (تومان - اختیاری)</label>
                                  <MoneyInput
                                    value={txAssetMarketPrice}
                                    onChange={setTxAssetMarketPrice}
                                    placeholder="در صورت خالی بودن، برابر با میانگین قیمت خرید در نظر گرفته می‌شود"
                                    className="py-2 rounded-xl border border-[#D6CFC3] text-xs focus:border-[#7C8363] bg-[#FDFBF7] dark:bg-[#1B1D16]"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          {/* ── Pie chart ── */}
          {pieChartData.length>0 && (
            <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3]">
              <h3 className="text-sm font-bold text-[#2D3025] mb-3 flex items-center gap-2 font-serif-elegant">
                <PieChartIcon className="w-4 h-4 text-[#9B6B61]" /><span>توزیع مخارج (کلیک روی هر بخش برای فیلتر و مشاهده جزئیات)</span>
              </h3>
              <div className="h-44 flex items-center gap-4">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                        {pieChartData.map((entry,i)=>(
                          <Cell 
                            key={i} 
                            fill={COLORS[i%COLORS.length]} 
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              setFilterCategory(entry.id);
                              resetFilterPage();
                              const el = document.getElementById('transaction-list-section');
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v:number)=>[`${v.toLocaleString('fa-IR')} تومان`,'']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 grid grid-cols-1 gap-1.5 text-[10px] font-semibold text-[#8D7F72]">
                  {pieChartData.map((item,i)=>(
                    <button key={item.name} 
                      onClick={() => {
                        setFilterCategory(item.id);
                        resetFilterPage();
                        const el = document.getElementById('transaction-list-section');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className="flex items-center gap-1.5 text-right w-full hover:bg-[#F9F6EE] dark:bg-[#1B1D16] p-1 rounded-lg transition-colors cursor-pointer">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{backgroundColor:COLORS[i%COLORS.length]}} />
                      <span className="truncate flex-1">{item.name}: {Math.round((item.value/totalExpense)*100)}%</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Transaction list ── */}
          <div id="transaction-list-section" className="bg-[#FDFBF7] p-4 sm:p-5 rounded-2xl border border-[#E6DFD3] space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
                <Filter className="w-4 h-4 text-[#7C8363]" /><span>دفترچه تراکنش‌ها</span>
                <span className="text-[9px] font-normal text-[#8D7F72] bg-[#E6DFD3]/50 px-2 py-0.5 rounded-full">{filteredTransactions.length} مورد</span>
              </h3>
              <button onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-[#7C8363] border border-[#DDE2D5] rounded-xl hover:bg-[#E8ECE0] transition-all cursor-pointer">
                <Download className="w-3.5 h-3.5" /><span>دریافت CSV</span>
              </button>
            </div>

            {/* Search & filter row */}
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[140px] relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8D7F72]" />
                <input type="text" placeholder="جستجو در تراکنش‌ها..." value={searchQuery}
                  onChange={e=>{setSearchQuery(e.target.value);resetFilterPage();}}
                  className="w-full pr-8 pl-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none focus:border-[#7C8363] bg-[#FDFBF7]" />
              </div>
              <select value={filterCategory} onChange={e=>{setFilterCategory(e.target.value);resetFilterPage();}}
                className="px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] text-[#3D3D3D]">
                <option value="">همه دسته‌ها</option>
                {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <div className="flex bg-[#E6DFD3] p-0.5 rounded-xl text-[10px]">
                {([['all','همه'],['income','درآمد'],['expense','هزینه']] as const).map(([v,l])=>(
                  <button key={v} onClick={()=>{setActiveFilter(v);resetFilterPage();}}
                    className={`px-3 py-1.5 font-semibold rounded-lg transition-all cursor-pointer ${activeFilter===v?'bg-[#FDFBF7] text-[#2D3025] shadow-xs':'text-[#8D7F72]'}`}>{l}</button>
                ))}
              </div>
            </div>

            {/* Date range filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F9F6EE] p-3 rounded-2xl border border-[#E6DFD3]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#8D7F72] shrink-0">از تاریخ:</span>
                <div className="flex-1 min-w-0">
                  <PersianDatePicker value={filterStartDate} onChange={val=>{setFilterStartDate(val); resetFilterPage();}} />
                </div>
                {filterStartDate && (
                  <button type="button" onClick={()=>{setFilterStartDate(''); resetFilterPage();}} className="text-[#9B6B61] hover:text-red-500 font-bold text-xs p-1">✕</button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#8D7F72] shrink-0">تا تاریخ:</span>
                <div className="flex-1 min-w-0">
                  <PersianDatePicker value={filterEndDate} onChange={val=>{setFilterEndDate(val); resetFilterPage();}} />
                </div>
                {filterEndDate && (
                  <button type="button" onClick={()=>{setFilterEndDate(''); resetFilterPage();}} className="text-[#9B6B61] hover:text-red-500 font-bold text-xs p-1">✕</button>
                )}
              </div>
            </div>

            {/* Mobile list */}
            <div className="block sm:hidden space-y-2">
              {paginatedTx.length>0 ? paginatedTx.map(t=>(
                <button key={t.id} onClick={()=>openDetail(t)} className="w-full bg-[#FDFBF7] dark:bg-[#1B1D16] p-3 rounded-xl border border-[#E6DFD3]/60 shadow-xs flex justify-between items-center text-right hover:bg-[#F9F6EE] transition-colors cursor-pointer">
                  <div className="space-y-1 min-w-0 flex-1 pl-2">
                    <h4 className="font-bold text-xs text-[#2D3025] truncate">{t.description}</h4>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${t.type==='income'?'bg-[#E8ECE0] border-[#DDE2D5] text-[#7C8363]':'bg-[#F4E9E4] border-[#EDDDD7] text-[#9B6B61]'}`}>{getCategoryName(t.category)}</span>
                      <span className="text-[8px] text-[#8D7F72] font-mono">{t.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-black font-mono ${t.type==='income'?'text-[#7C8363]':'text-[#9B6B61]'}`}>{t.type==='income'?'+':'-'}{t.amount.toLocaleString('fa-IR')}</span>
                    <Eye className="w-3.5 h-3.5 text-[#8D7F72]" />
                  </div>
                </button>
              )) : <div className="py-8 text-center text-xs text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-xl">هیچ تراکنشی یافت نشد.</div>}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E6DFD3] text-[#8D7F72] font-bold">
                    <th className="pb-3 pr-2">توضیح</th><th className="pb-3">دسته</th><th className="pb-3">تاریخ</th><th className="pb-3 text-left pl-4">مبلغ</th><th className="pb-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DFD3]/40">
                  {paginatedTx.length>0 ? paginatedTx.map(t=>(
                    <tr key={t.id} className="hover:bg-[#E8ECE0]/20 transition-colors cursor-pointer" onClick={()=>openDetail(t)}>
                      <td className="py-3 pr-2 font-bold text-[#2D3025]">{t.description}</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${t.type==='income'?'bg-[#E8ECE0] border-[#DDE2D5] text-[#7C8363]':'bg-[#F4E9E4] border-[#EDDDD7] text-[#9B6B61]'}`}>{getCategoryName(t.category)}</span>
                        {t.subcategory && <span className="mr-1 text-[8px] bg-[#E6DFD3]/40 border border-[#E6DFD3] px-1.5 py-0.5 rounded text-[#8D7F72] font-bold">{t.subcategory}</span>}
                      </td>
                      <td className="py-3 text-[#8D7F72] font-semibold font-mono">{t.date}</td>
                      <td className={`py-3 text-left pl-4 font-extrabold font-mono ${t.type==='income'?'text-[#7C8363]':'text-[#9B6B61]'}`}>{t.type==='income'?'+':'-'}{t.amount.toLocaleString('fa-IR')} تومان</td>
                      <td className="py-3 text-center" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={()=>openDetail(t)} className="p-1.5 text-[#8D7F72] hover:text-[#2D3025] hover:bg-[#E6DFD3] rounded-lg transition-all cursor-pointer"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={()=>onDeleteTransaction(t.id)} className="p-1.5 text-[#8D7F72] hover:text-[#9B6B61] hover:bg-[#F4E9E4] rounded-lg transition-all cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="py-10 text-center text-[#8D7F72] font-semibold">هیچ تراکنشی یافت نشد.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages>1 && (
              <div className="flex items-center justify-between pt-2 border-t border-[#E6DFD3]/50">
                <button disabled={safePage<=1} onClick={()=>setCurrentPage(p=>p-1)}
                  className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg border border-[#E6DFD3] disabled:opacity-40 hover:bg-[#E6DFD3]/50 transition-all cursor-pointer text-[#2D3025]">
                  <ChevronRight className="w-3.5 h-3.5" />قبلی
                </button>
                <span className="text-[10px] text-[#8D7F72] font-semibold">صفحه {safePage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}</span>
                <button disabled={safePage>=totalPages} onClick={()=>setCurrentPage(p=>p+1)}
                  className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg border border-[#E6DFD3] disabled:opacity-40 hover:bg-[#E6DFD3]/50 transition-all cursor-pointer text-[#2D3025]">
                  بعدی<ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* ── Recurring templates ── */}
          <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
                <Repeat className="w-4 h-4 text-[#7C8363]" /><span>تراکنش‌های تکرارشونده</span>
                <span className="text-[9px] text-[#8D7F72] bg-[#E6DFD3]/50 px-2 py-0.5 rounded-full">{recurringTransactions.filter(r=>r.active).length} فعال</span>
              </h3>
              <button onClick={()=>setShowRecurForm(p=>!p)}
                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#7C8363] border border-[#DDE2D5] rounded-xl hover:bg-[#E8ECE0] transition-all cursor-pointer">
                <Plus className="w-3.5 h-3.5" />{showRecurForm?'بستن':'افزودن قالب'}
              </button>
            </div>

            {/* Recurring add form */}
            <AnimatePresence>
              {showRecurForm && (
                <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                  <form onSubmit={handleSubmitRecur} className="bg-[#F9F6EE] p-4 rounded-xl border border-[#E6DFD3] space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">نام / توضیح</label>
                        <input type="text" value={recurDesc} onChange={e=>setRecurDesc(e.target.value)} placeholder="مثال: اجاره ماهانه" required
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">مبلغ (تومان)</label>
                        <MoneyInput value={recurAmount} onChange={setRecurAmount} placeholder="مبلغ" required
                          className="py-2 rounded-xl border border-[#D6CFC3] text-xs focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">نوع</label>
                        <div className="flex bg-[#E6DFD3] p-0.5 rounded-lg">
                          {(['expense','income'] as const).map(t=>(
                            <button key={t} type="button" onClick={()=>setRecurType(t)}
                              className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${recurType===t?'bg-[#FDFBF7] dark:bg-[#1B1D16] shadow-xs text-[#2D3025]':'text-[#8D7F72]'}`}>
                              {t==='expense'?'هزینه':'درآمد'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">تناوب</label>
                        <select value={recurFreq} onChange={e=>setRecurFreq(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]">
                          {(['daily','weekly','monthly','yearly'] as const).map(f=><option key={f} value={f}>{FREQ_LABELS[f]}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">دسته‌بندی</label>
                        <select value={recurCat} onChange={e=>setRecurCat(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]">
                          {categories.filter(c=>c.type===recurType).map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">تاریخ اول اجرا</label>
                        <PersianDatePicker value={recurNext} onChange={setRecurNext} />
                      </div>
                    </div>
                    <button type="submit"
                      className="w-full py-2.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                      <Repeat className="w-4 h-4" />ذخیره قالب تکرارشونده
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recurring list */}
            {recurringTransactions.length>0 ? (
              <div className="space-y-2">
                {recurringTransactions.map(r=>(
                  <div key={r.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${r.active?'bg-[#F9F6EE] border-[#E6DFD3]':'bg-[#FDFBF7] dark:bg-[#1B1D16] border-[#E6DFD3]/40 opacity-60'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${r.type==='income'?'bg-[#E8ECE0] text-[#7C8363]':'bg-[#F4E9E4] text-[#9B6B61]'}`}>
                        <Repeat className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-[#2D3025] truncate">{r.description}</div>
                        <div className="text-[9px] text-[#8D7F72] font-semibold">{r.amount.toLocaleString('fa-IR')} تومان · {FREQ_LABELS[r.frequency]} · {getCategoryName(r.category)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={()=>onApplyRecurring(r.id)} title="ثبت همین الان"
                        className="px-2 py-1 text-[9px] font-bold bg-[#2D3025] text-white rounded-lg hover:bg-[#5A5A40] transition-all cursor-pointer">
                        ثبت
                      </button>
                      <button onClick={()=>onToggleRecurring(r.id)}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${r.active?'text-[#7C8363] hover:bg-[#E8ECE0]':'text-[#8D7F72] hover:bg-[#E6DFD3]'}`}>
                        {r.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={()=>onDeleteRecurring(r.id)}
                        className="p-1.5 text-[#8D7F72] hover:text-[#9B6B61] hover:bg-[#F4E9E4] rounded-lg transition-all cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-xl">
                هنوز قالب تکرارشونده‌ای ثبت نشده. اجاره، قسط یا حقوق ماهانه را یک‌بار ثبت کنید.
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ACCOUNTS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {financeTab==='accounts' && (
        <>
          {/* Credit Card Settle Panel */}
          <AnimatePresence>
            {settlingBankId && (() => {
              const targetCard = bankAccounts.find(b => b.id === settlingBankId);
              if (!targetCard) return null;
              const maxDebt = (targetCard.creditLimit ?? 0) - targetCard.balance;
              const debitAccounts = bankAccounts.filter(x => !x.isCredit);

              const handleSettleSubmit = (e: React.FormEvent) => {
                e.preventDefault();
                const amt = Number(settleAmount);
                if (!amt || amt <= 0 || !settleFundingBankId) return;

                const fundingAcc = bankAccounts.find(x => x.id === settleFundingBankId);
                if (fundingAcc) {
                  onUpdateBankAccount(fundingAcc.id, {
                    ...fundingAcc,
                    balance: fundingAcc.balance - amt
                  });
                }
                onUpdateBankAccount(targetCard.id, {
                  ...targetCard,
                  balance: targetCard.balance + amt,
                  creditDebt: Math.max(0, maxDebt - amt)
                });

                onAddTransaction({
                  type: 'transfer',
                  amount: amt,
                  category: 'transfer',
                  date: todayDate,
                  description: `تسویه کارت اعتباری ${targetCard.bankName} از حساب ${fundingAcc?.bankName || ''}`,
                  bankAccountId: settleFundingBankId,
                  toBankAccountId: targetCard.id
                });

                setSettlingBankId(null);
                setSettleAmount('');
                setSettleFundingBankId('');
              };

              return (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133] p-5 rounded-2xl space-y-4 mb-4 dark:bg-[#F9F1D8] dark:bg-[#201D13]/20 dark:border-[#E6DFD3] dark:border-[#3D4133]/40">
                  <div className="flex justify-between items-center border-b border-[#E6DFD3] dark:border-[#3D4133] pb-2">
                    <h3 className="text-xs font-black text-[#8D7F72] dark:text-[#9D978B] dark:text-[#8D7F72] dark:text-[#9D978B] flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-[#9B6B61] dark:text-[#C59B93]" />
                      <span>پرداخت بدهی کارت اعتباری {targetCard.bankName}</span>
                    </h3>
                    <button type="button" onClick={() => setSettlingBankId(null)} className="text-[#9B6B61] dark:text-[#C59B93] hover:text-[#8D7F72] dark:text-[#9D978B] cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleSettleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#2D3025] dark:text-[#E8ECE0] dark:text-[#8D7F72] dark:text-[#9D978B]">حساب مبدا (برداشت)</label>
                      <select value={settleFundingBankId} onChange={e => setSettleFundingBankId(e.target.value)} required
                        className="w-full px-3 py-2 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133] bg-[#FDFBF7] dark:bg-[#1B1D16] text-xs font-bold focus:outline-none">
                        <option value="">-- انتخاب حساب مبدا --</option>
                        {debitAccounts.map(x => (
                          <option key={x.id} value={x.id}>
                            {x.bankName} ({x.accountName}) - موجودی: {x.balance.toLocaleString('fa-IR')} تومان
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#2D3025] dark:text-[#E8ECE0] dark:text-[#8D7F72] dark:text-[#9D978B]">مبلغ بازپرداخت (تومان)</label>
                      <MoneyInput value={settleAmount} onChange={setSettleAmount} placeholder="مبلغ بازپرداخت" required
                        className="py-2 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133] bg-[#FDFBF7] dark:bg-[#1B1D16] text-xs focus:outline-none" />
                      <span className="text-[9px] text-[#9B6B61] dark:text-[#C59B93] font-semibold block mt-1">حداکثر بدهی: {maxDebt.toLocaleString('fa-IR')} تومان</span>
                    </div>
                    <div className="flex items-end">
                      <button type="submit"
                        className="w-full py-2.5 bg-[#F9F1D8] dark:bg-[#201D13] hover:bg-[#F9F1D8] dark:bg-[#201D13] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                        <Check className="w-4 h-4" />
                        <span>تایید و تسویه بدهی</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* Header cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-[#FDFBF7] p-5 rounded-2xl border border-[#EBE3C8] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#8D7F72] font-bold block">مجموع دارایی در همه حساب‌ها</span>
                <h3 className="text-2xl font-black text-[#2D3025] font-serif-elegant mt-1">
                  {totalBankBal.toLocaleString('fa-IR')} <span className="text-xs font-normal text-[#8D7F72]">تومان</span>
                </h3>
              </div>
              <div className="p-4 bg-[#F9F1D8] text-[#5A5A40] rounded-xl border border-[#EBE3C8]"><Building2 className="w-6 h-6" /></div>
            </div>
            <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#DDE2D5] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#8D7F72] font-bold block">تعداد حساب‌های ثبت‌شده</span>
                <h3 className="text-2xl font-black text-[#7C8363] font-serif-elegant mt-1">{bankAccounts.length.toLocaleString('fa-IR')}</h3>
              </div>
              <div className="p-4 bg-[#E8ECE0] text-[#7C8363] rounded-xl border border-[#DDE2D5]"><CreditCard className="w-6 h-6" /></div>
            </div>
          </div>

          {/* Bank account cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map(b=>(
              <div key={b.id} className="rounded-2xl overflow-hidden border border-[#E6DFD3] shadow-sm">
                {/* Card header strip */}
                <div className="h-14 flex items-center px-4 justify-between" style={{backgroundColor:b.color||'#1E3A8A'}}>
                  <span className="font-bold text-white text-sm">{b.bankName}</span>
                  <CreditCard className="w-5 h-5 text-white/60" />
                </div>
                {/* Card body */}
                <div className="bg-[#FDFBF7] p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-[#8D7F72] font-semibold block">{b.accountName}</span>
                      {b.cardNumber && <span className="text-[10px] font-mono text-[#8D7F72] block mt-0.5">{b.cardNumber}</span>}
                    </div>
                    {b.isCredit && (
                      <span className="px-1.5 py-0.5 bg-[#F9F1D8] dark:bg-[#201D13] text-[#2D3025] dark:text-[#E8ECE0] text-[8px] font-bold rounded">
                        کارت اعتباری
                      </span>
                    )}
                  </div>

                  {!b.isCredit ? (
                    <>
                      <div>
                        <span className="text-[10px] text-[#8D7F72] font-semibold">موجودی</span>
                        <div className="text-lg font-black text-[#2D3025] font-mono">
                          {b.balance.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72]">تومان</span>
                        </div>
                        <div className="text-[9px] text-[#8D7F72] font-semibold mt-0.5">
                          {totalBankBal > 0 ? Math.round((b.balance / totalBankBal) * 100) : 0}% از کل دارایی‌ها
                        </div>
                      </div>
                      {/* Progress bar share */}
                      <div className="w-full h-1.5 bg-[#E6DFD3] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${totalBankBal > 0 ? Math.round((b.balance / totalBankBal) * 100) : 0}%`,backgroundColor:b.color||'#7C8363'}} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2 bg-[#F9F6EE] p-2 rounded-xl border border-[#E6DFD3]/60">
                        <div>
                          <span className="text-[9px] text-[#8D7F72] font-bold block">اعتبار باقیمانده</span>
                          <span className="text-xs font-black text-emerald-700 font-mono">
                            {b.balance.toLocaleString('fa-IR')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#8D7F72] font-bold block">بدهی فعلی</span>
                          <span className="text-xs font-black text-rose-700 font-mono">
                            {Math.max(0, (b.creditLimit ?? 0) - b.balance).toLocaleString('fa-IR')}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#8D7F72] font-semibold">سقف اعتبار: {b.creditLimit?.toLocaleString('fa-IR')} تومان</span>
                        <div className="w-full h-1.5 bg-[#E6DFD3] rounded-full overflow-hidden mt-1">
                          <div className="h-full rounded-full bg-rose-500" 
                            style={{width:`${b.creditLimit && b.creditLimit > 0 ? Math.min(100, Math.round(((b.creditLimit - b.balance) / b.creditLimit) * 100)) : 0}%`}} />
                        </div>
                        <span className="text-[8px] text-[#8D7F72] font-semibold mt-0.5 block text-left">
                          {b.creditLimit && b.creditLimit > 0 ? Math.round(((b.creditLimit - b.balance) / b.creditLimit) * 100) : 0}% اعتبار مصرف شده
                        </span>
                      </div>
                      {b.creditDueDate && (
                        <div className="flex justify-between items-center text-[10px] bg-[#FDFBF7] dark:bg-[#1B1D16]/50 p-2 rounded-xl border border-[#EBE3C8] dark:border-[#3D4133]/60 dark:bg-[#F9F1D8] dark:bg-[#201D13]/10 dark:border-[#E6DFD3] dark:border-[#3D4133]/20">
                          <span className="text-[#8D7F72] font-semibold">📅 تاریخ سررسید:</span>
                          <span className="font-bold text-[#8D7F72] dark:text-[#9D978B] dark:text-[#8D7F72] dark:text-[#9D978B]">{b.creditDueDate}</span>
                        </div>
                      )}
                      {b.isCredit && (b.creditLimit ?? 0) - b.balance > 0 && (
                        <button onClick={() => {
                          setSettlingBankId(b.id);
                          setSettleAmount(String((b.creditLimit ?? 0) - b.balance));
                          const firstDebit = bankAccounts.find(x => !x.isCredit);
                          setSettleFundingBankId(firstDebit?.id || '');
                        }}
                          className="w-full py-2 bg-[#F9F1D8] dark:bg-[#201D13] hover:bg-[#F9F1D8] dark:bg-[#201D13] text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 mt-1 shadow-sm">
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>تسویه قسط / پرداخت بدهی کارت</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Linked documents list */}
                  {(() => {
                    const linkedDocs = documents.filter(doc => doc.linkedBankAccountId === b.id);
                    if (linkedDocs.length === 0) return null;
                    return (
                      <div className="space-y-1 bg-[#F9F6EE] p-2.5 rounded-xl border border-[#E6DFD3]/60">
                        <span className="text-[9px] font-bold text-[#8D7F72] block mb-1">اسناد متصل ({linkedDocs.length.toLocaleString('fa-IR')} سند)</span>
                        <div className="space-y-1">
                          {linkedDocs.map(doc => (
                            <div key={doc.id} className="flex items-center gap-1.5 bg-[#FDFBF7] dark:bg-[#1B1D16] px-2 py-1 rounded-lg border border-[#D6CFC3]/40 text-[9px] text-[#2D3025] font-semibold">
                              <span className="text-[10px]">📄</span>
                              <span className="truncate flex-1">{doc.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex gap-2 pt-1">
                    <button onClick={()=>openEditBank(b)}
                      className="flex-1 py-1.5 text-[10px] font-bold text-[#7C8363] border border-[#DDE2D5] rounded-lg hover:bg-[#E8ECE0] transition-all cursor-pointer flex items-center justify-center gap-1">
                      <Edit2 className="w-3 h-3" />ویرایش
                    </button>
                    <button onClick={()=>{ if(confirm(`حساب "${b.bankName}" حذف شود؟`)) onDeleteBankAccount(b.id); }}
                      className="flex-1 py-1.5 text-[10px] font-bold text-[#9B6B61] border border-[#EDDDD7] rounded-lg hover:bg-[#F4E9E4] transition-all cursor-pointer flex items-center justify-center gap-1">
                      <Trash2 className="w-3 h-3" />حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add new button */}
            {!showBankForm && (
              <button onClick={()=>{ setShowBankForm(true); setEditingBankId(null); setBkName(''); setBkAccName(''); setBkBalance(''); setBkCard(''); setBkColor('#1E3A8A'); }}
                className="rounded-2xl border-2 border-dashed border-[#DDE2D5] hover:border-[#7C8363] hover:bg-[#E8ECE0]/20 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 p-8 text-[#8D7F72] hover:text-[#7C8363]">
                <Plus className="w-8 h-8" />
                <span className="text-xs font-bold">افزودن حساب بانکی</span>
              </button>
            )}
          </div>

          {/* Bank form */}
          <AnimatePresence>
            {showBankForm && (
              <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
                className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#7C8363] shadow-sm">
                <h3 className="text-sm font-bold text-[#2D3025] mb-4 flex items-center gap-2 font-serif-elegant">
                  <Building2 className="w-4 h-4 text-[#7C8363]" />
                  {editingBankId ? 'ویرایش حساب بانکی' : 'افزودن حساب بانکی جدید'}
                </h3>
                <form onSubmit={handleSubmitBank} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">نام بانک</label>
                    <input value={bkName} onChange={e=>setBkName(e.target.value)} placeholder="مثال: بانک سامان" required
                      className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">نام حساب</label>
                    <input value={bkAccName} onChange={e=>setBkAccName(e.target.value)} placeholder="مثال: سپرده کوتاه‌مدت"
                      className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                  </div>
                  
                  {/* Credit Card Toggle Option */}
                  <div className="sm:col-span-2 flex items-center justify-between bg-[#F9F6EE] p-2.5 rounded-xl border border-[#E6DFD3]/60">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#2D3025]">آیا این یک کارت اعتباری (Credit Card) است؟</span>
                      <span className="text-[9px] font-semibold text-[#8D7F72]">خرید با اعتبار و پرداخت در انتهای دوره تسویه</span>
                    </div>
                    <button type="button" onClick={() => setBkIsCredit(!bkIsCredit)} className="text-[#7C8363] focus:outline-none cursor-pointer">
                      {bkIsCredit ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-[#9D978B] dark:text-[#7C8363]" />}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">
                      {bkIsCredit ? 'اعتبار باقیمانده فعلی (تومان)' : 'موجودی (تومان)'}
                    </label>
                    <MoneyInput value={bkBalance} onChange={setBkBalance} placeholder={bkIsCredit ? 'اعتبار باقیمانده' : 'موجودی فعلی'} required
                      className="py-2 rounded-xl border border-[#D6CFC3] text-xs focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                  </div>

                  {bkIsCredit ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">سقف اعتبار کل کارت (تومان)</label>
                        <MoneyInput value={bkCreditLimit} onChange={setBkCreditLimit} placeholder="مثال: ۵۰,۰۰۰,۰۰۰" required
                          className="py-2 rounded-xl border border-[#D6CFC3] text-xs focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">تاریخ سررسید پرداخت بدهی</label>
                        <input value={bkCreditDueDate} onChange={e=>setBkCreditDueDate(e.target.value)} placeholder="مثال: ۲۵ام هر ماه" required={bkIsCredit}
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72]">شماره کارت (اختیاری)</label>
                      <input value={bkCard} onChange={e=>setBkCard(e.target.value)} placeholder="مثال: ۶۲۱۹-****-****-۱۲۳۴"
                        className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                    </div>
                  )}

                  {bkIsCredit && (
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72]">شماره کارت اعتباری (اختیاری)</label>
                      <input value={bkCard} onChange={e=>setBkCard(e.target.value)} placeholder="مثال: ۵۰۲۲-****-****-۱۲۳۴"
                        className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                    </div>
                  )}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-[#8D7F72]">رنگ کارت</label>
                    <div className="flex gap-2 flex-wrap">
                      {BANK_COLOR_PRESETS.map(c=>(
                        <button key={c} type="button" onClick={()=>setBkColor(c)}
                          className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${bkColor===c?'scale-110 border-[#2D3025]':'border-transparent'}`}
                          style={{backgroundColor:c}} />
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex gap-3">
                    <button type="submit"
                      className="flex-1 py-2.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                      <Save className="w-4 h-4" />{editingBankId?'ذخیره تغییرات':'افزودن حساب'}
                    </button>
                    <button type="button" onClick={resetBankForm}
                      className="px-4 py-2.5 border border-[#E6DFD3] text-xs font-bold text-[#8D7F72] rounded-xl hover:bg-[#F9F6EE] transition-all cursor-pointer">
                      انصراف
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SUBSCRIPTIONS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {financeTab==='subscriptions' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#EBE3C8] flex items-center justify-between">
              <div><span className="text-[10px] text-[#8D7F72] font-bold">کل هزینه ماهانه اشتراک‌ها</span>
                <h3 className="text-xl font-black text-[#2D3025] font-serif-elegant">{Math.round(totalSubMonthly).toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72]">تومان / ماه</span></h3>
              </div>
              <div className="p-3 bg-[#F4E9E4] text-[#9B6B61] rounded-xl border border-[#EDDDD7]"><RefreshCw className="w-5 h-5" /></div>
            </div>
            <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#DDE2D5] flex items-center justify-between">
              <div><span className="text-[10px] text-[#8D7F72] font-bold">سرویس‌های فعال</span>
                <h3 className="text-xl font-black text-[#7C8363] font-serif-elegant">{activeSubs.length.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72]">سرویس</span></h3>
              </div>
              <div className="p-3 bg-[#E8ECE0] text-[#7C8363] rounded-xl border border-[#DDE2D5]"><CreditCard className="w-5 h-5" /></div>
            </div>
            <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#EBE3C8] flex items-center justify-between">
              <div><span className="text-[10px] text-[#8D7F72] font-bold">نزدیک‌ترین تمدید</span>
                <h3 className="text-xs font-bold text-[#2D3025] font-serif-elegant truncate max-w-[170px]">
                  {upcomingRenewals[0] ? `${upcomingRenewals[0].name} — ${upcomingRenewals[0].nextBillingDate}` : 'ندارد'}
                </h3>
              </div>
              <div className="p-3 bg-[#F9F1D8] text-[#5A5A40] rounded-xl border border-[#EBE3C8]"><CalendarDays className="w-5 h-5" /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add form */}
            <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] space-y-3">
              <h3 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5 font-serif-elegant">
                <PlusCircle className="w-4 h-4 text-[#7C8363]" />ثبت اشتراک جدید
              </h3>
              <form onSubmit={handleSubSubmit} className="space-y-3">
                <div className="space-y-1"><label className="text-[10px] font-bold text-[#8D7F72]">سرویس‌دهنده</label>
                  <select value={subProvider} onChange={e=>{
                    setSubProvider(e.target.value);
                    // فقط نام و دسته — بدون قیمت (قیمت‌ها تغییر می‌کنند، کاربر خودش وارد می‌کند)
                    const p:{[k:string]:{name:string;cat:string}}={
                      filimo:{name:'اشتراک فیلیمو',cat:'entertainment'},
                      namava:{name:'اشتراک نماوا',cat:'entertainment'},
                      spotify:{name:'اسپاتیفای',cat:'music'},
                      youtube:{name:'یوتیوب پریمیوم',cat:'entertainment'},
                      netflix:{name:'نتفلیکس',cat:'entertainment'},
                      notion:{name:'نوشن پرو',cat:'productivity'},
                      figma:{name:'فیگما',cat:'design'},
                      adobe:{name:'ادوبی',cat:'design'},
                      other:{name:'اشتراک جدید',cat:'other'},
                    };
                    if(p[e.target.value]){
                      setSubName(p[e.target.value].name);
                      setSubCategory(p[e.target.value].cat);
                      setSubPrice('');
                    }
                  }} className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-[11px] font-semibold focus:outline-none bg-[#FDFBF7]">
                    {['filimo','namava','spotify','youtube','netflix','notion','figma','adobe','other'].map(p=>(
                      <option key={p} value={p}>{p==='other'?'سایر':p.charAt(0).toUpperCase()+p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-[#8D7F72]">نام اشتراک</label>
                  <input value={subName} onChange={e=>setSubName(e.target.value)} required className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-[11px] font-semibold focus:outline-none bg-[#FDFBF7]" />
                </div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-[#8D7F72]">هزینه (تومان)</label>
                  <MoneyInput value={subPrice} onChange={setSubPrice} required className="py-2 rounded-xl border border-[#D6CFC3] text-[11px] focus:outline-none bg-[#FDFBF7]" />
                </div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-[#8D7F72]">بازه تمدید</label>
                  <select value={subCycle} onChange={e=>setSubCycle(e.target.value as any)} className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-[11px] font-semibold focus:outline-none bg-[#FDFBF7]">
                    <option value="monthly">ماهانه</option><option value="yearly">سالانه</option>
                  </select>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-[#8D7F72]">تاریخ تمدید بعدی</label>
                  <PersianDatePicker value={subNextDate} onChange={setSubNextDate} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">پرداخت از حساب</label>
                  {bankAccounts.length > 0 ? (
                    <select value={subCard} onChange={e=>setSubCard(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-[11px] font-semibold focus:outline-none bg-[#FDFBF7]">
                      <option value="">انتخاب حساب بانکی...</option>
                      {bankAccounts.map(b=>(
                        <option key={b.id} value={`${b.bankName} — ${b.accountName}`}>
                          {b.bankName} — {b.accountName}{b.cardNumber ? ` (${b.cardNumber})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[#D6CFC3] bg-[#F9F6EE]">
                      <span className="text-[10px] text-[#8D7F72] flex-1">ابتدا حساب بانکی اضافه کن</span>
                      <button type="button" onClick={()=>setFinanceTab('accounts')}
                        className="text-[10px] font-bold text-[#7C8363] hover:underline cursor-pointer shrink-0">افزودن ←</button>
                    </div>
                  )}
                </div>
                <button type="submit" className="w-full py-2.5 bg-[#2D3025] hover:bg-[#5A5A40] text-white text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <Plus className="w-4 h-4" />ثبت اشتراک
                </button>
              </form>
            </div>

            {/* Subscription cards */}
            <div className="lg:col-span-2 space-y-4">
              {/* Upcoming renewals strip */}
              {upcomingRenewals.length>0 && (
                <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3] space-y-2">
                  <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5 font-serif-elegant">
                    <CalendarDays className="w-4 h-4 text-[#9B6B61]" />تمدیدهای نزدیک
                  </h4>
                  <div className="space-y-2">
                    {upcomingRenewals.slice(0,3).map(sub=>{
                      const meta=PROVIDER_META[sub.provider.toLowerCase()]||PROVIDER_META.other;
                      const Icon=meta.icon;
                      return (
                        <div key={sub.id} className="flex justify-between items-center p-2.5 rounded-xl bg-[#F9F6EE] border border-[#E6DFD3]">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{backgroundColor:meta.bg,color:meta.text,border:`1px solid ${meta.border}`}}><Icon className="w-3.5 h-3.5" /></div>
                            <div><span className="font-bold text-xs text-[#2D3025]">{sub.name}</span><div className="text-[9px] text-[#8D7F72]">تمدید: <span className="font-mono text-[#9B6B61]">{sub.nextBillingDate}</span></div></div>
                          </div>
                          <span className="text-xs font-extrabold text-[#7C8363] font-mono">{sub.price.toLocaleString('fa-IR')} تومان</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subscriptions.map(sub=>{
                  const meta=PROVIDER_META[sub.provider.toLowerCase()]||PROVIDER_META.other;
                  const Icon=meta.icon;
                  const isActive=sub.status==='active';
                  const isEditing=editingSubId===sub.id;
                  return (
                    <div key={sub.id} className={`p-4 rounded-2xl border bg-[#FDFBF7] transition-all ${isActive?'border-[#DDE2D5] shadow-xs':'border-[#E6DFD3] opacity-60'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{backgroundColor:meta.bg,color:meta.text,border:`1px solid ${meta.border}`}}><Icon className="w-4 h-4" /></div>
                          <div>
                            {isEditing ? (
                              <input value={editSubName} onChange={e=>setEditSubName(e.target.value)}
                                className="text-xs font-bold text-[#2D3025] border-b border-[#7C8363] bg-transparent focus:outline-none w-full" />
                            ) : (
                              <h4 className="font-extrabold text-xs text-[#2D3025] line-clamp-1">{sub.name}</h4>
                            )}
                            <span className="text-[8px] text-[#8D7F72] font-bold bg-[#E6DFD3]/35 px-1.5 py-0.5 rounded">{SUB_CATEGORY_LABELS[sub.category]||sub.category}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!isEditing && (
                            <button onClick={()=>startEditSub(sub)} className="p-1.5 text-[#8D7F72] hover:text-[#2D3025] hover:bg-[#E6DFD3] rounded-lg transition-all cursor-pointer"><Edit2 className="w-3 h-3" /></button>
                          )}
                          <button onClick={()=>onDeleteSubscription(sub.id)} className="p-1.5 text-[#8D7F72] hover:text-[#9B6B61] hover:bg-[#F4E9E4] rounded-lg transition-all cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="mt-3 space-y-2">
                          <div className="space-y-1"><label className="text-[9px] font-bold text-[#8D7F72]">قیمت (تومان)</label>
                            <input type="number" value={editSubPrice} onChange={e=>setEditSubPrice(e.target.value)}
                              className="w-full text-left px-2 py-1.5 rounded-lg border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                          </div>
                          <div className="space-y-1"><label className="text-[9px] font-bold text-[#8D7F72]">تاریخ تمدید بعدی</label>
                            <PersianDatePicker value={editSubNext} onChange={setEditSubNext} />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={()=>saveEditSub(sub)} className="flex-1 py-1.5 bg-[#7C8363] text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer"><Save className="w-3 h-3" />ذخیره</button>
                            <button onClick={()=>setEditingSubId(null)} className="flex-1 py-1.5 border border-[#E6DFD3] text-[10px] font-bold text-[#8D7F72] rounded-lg cursor-pointer">انصراف</button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <div className="text-sm font-extrabold text-[#2D3025] font-mono">{sub.price.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72]">تومان / {sub.billingCycle==='monthly'?'ماه':'سال'}</span></div>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#E6DFD3]/40 text-[9px] text-[#8D7F72]">
                            <div className="flex items-center gap-1"><CreditCard className="w-3 h-3 text-[#7C8363]" /><span>{sub.cardUsed}</span></div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold">{isActive?'فعال':'غیرفعال'}</span>
                              <button type="button" onClick={()=>onToggleSubscriptionStatus(sub.id)}
                                className={`w-8 h-4 rounded-full p-0.5 transition-colors relative cursor-pointer flex items-center ${isActive?'bg-[#7C8363]':'bg-[#D6CFC3]'}`}>
                                <div className={`w-3 h-3 bg-[#FDFBF7] dark:bg-[#1B1D16] rounded-full transition-transform shadow-xs ${isActive?'-translate-x-3.5':'translate-x-0'}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {subscriptions.length===0 && (
                <div className="p-10 text-center text-xs text-[#8D7F72] bg-[#F9F6EE] border border-[#E6DFD3] rounded-2xl">اشتراکی ثبت نشده. از فرم سمت راست استفاده کنید.</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BUDGET TAB
      ══════════════════════════════════════════════════════════════════ */}
      {financeTab==='budget' && (
        <>
          {/* Unsaved changes banner */}
          <AnimatePresence>
            {budgetDirty && (
              <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                className="flex items-center justify-between bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133] rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#9B6B61] dark:text-[#C59B93]">
                  <AlertCircle className="w-4 h-4" />تغییرات ذخیره‌نشده‌ای دارید
                </div>
                <button onClick={handleSaveBudget}
                  className="px-3 py-1.5 bg-[#F9F1D8] dark:bg-[#201D13] hover:bg-[#F9F1D8] dark:bg-[#201D13] text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1">
                  <Save className="w-3.5 h-3.5" />ذخیره همین الان
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {label:'بودجه ماهانه کل',value:(budgetSettings?.monthlyTotal??15800000).toLocaleString('fa-IR'),icon:Wallet,bg:'bg-[#F9F1D8]',border:'border-[#EBE3C8]',col:'text-[#2D3025]'},
              {label:'هزینه‌کرد ماه جاری',value:Object.values(spendByCategory).reduce((s,v)=>s+v,0).toLocaleString('fa-IR'),icon:TrendingDown,bg:'bg-[#F4E9E4]',border:'border-[#EDDDD7]',col:'text-[#9B6B61]'},
              {label:'مانده بودجه',value:((budgetSettings?.monthlyTotal??15800000)-Object.values(spendByCategory).reduce((s,v)=>s+v,0)).toLocaleString('fa-IR'),icon:TrendingUp,bg:'bg-[#E8ECE0]',border:'border-[#DDE2D5]',col:'text-[#7C8363]'},
            ].map(c=>(
              <div key={c.label} className={`bg-[#FDFBF7] p-5 rounded-2xl border ${c.border} flex items-center justify-between`}>
                <div><span className="text-[10px] text-[#8D7F72] font-bold">{c.label}</span>
                  <h3 className={`text-lg font-black font-serif-elegant ${c.col}`}>{c.value} <span className="text-[10px] font-normal text-[#8D7F72]">تومان</span></h3>
                </div>
                <div className={`p-3 ${c.bg} rounded-xl border ${c.border}`}><c.icon className="w-5 h-5 text-[#8D7F72]" /></div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Settings form */}
            <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] space-y-4">
              <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
                <SlidersHorizontal className="w-4 h-4 text-[#9B6B61]" />تنظیم بودجه
              </h3>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#8D7F72]">بودجه ماهانه کل (تومان)</label>
                <MoneyInput value={budgetTotalInput}
                  onChange={val=>{setBudgetTotalInput(val);setBudgetDirty(true);}}
                  placeholder="بودجه ماهانه کل"
                  className="py-2.5 rounded-xl border border-[#D6CFC3] text-sm focus:border-[#9B6B61] bg-[#FDFBF7]" />
              </div>
              <div className="border-t border-[#E6DFD3] pt-3 space-y-3">
                <span className="text-[11px] font-bold text-[#8D7F72] block">بودجه هر دسته (تومان)</span>
                {expenseCategories.map(cat=>(
                  <div key={cat.id} className="space-y-1">
                    <label className="text-[10px] font-bold text-[#5A5A40] flex items-center gap-1"><span>{cat.icon||'📂'}</span><span>{cat.name}</span></label>
                    <MoneyInput value={catBudgetInputs[cat.id]??''}
                      onChange={val=>{setCatBudgetInputs(p=>({...p,[cat.id]:val}));setBudgetDirty(true);}}
                      placeholder="بدون محدودیت"
                      className="py-2 rounded-xl border border-[#D6CFC3] text-xs focus:border-[#9B6B61] bg-[#FDFBF7]" />
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleSaveBudget}
                className="w-full py-3 bg-[#9B6B61] hover:bg-[#7C5048] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                <CheckCircle2 className="w-4 h-4" />ذخیره تنظیمات بودجه
              </button>
            </div>

            {/* Progress bars */}
            <div className="lg:col-span-2 bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] space-y-5">
              <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
                <PieChartIcon className="w-4 h-4 text-[#9B6B61]" />وضعیت مصرف بودجه ماه جاری
              </h3>
              {(() => {
                const totalBudget=budgetSettings?.monthlyTotal??15800000;
                const totalSpent=Object.values(spendByCategory).reduce((s,v)=>s+v,0);
                const pct=totalBudget>0?Math.min(100,Math.round((totalSpent/totalBudget)*100)):0;
                const isOver=pct>=100; const isWarn=pct>=80&&pct<100;
                return (
                  <div className="bg-[#F9F1D8] border border-[#EBE3C8] rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-[#5A5A40]">بودجه کل ماه</span>
                      <span className={isOver?'text-[#9B6B61]':isWarn?'text-[#9B6B61] dark:text-[#C59B93]':'text-[#7C8363]'}>{pct}٪ مصرف شده</span>
                    </div>
                    <div className="w-full h-3 bg-[#E6DFD3] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${isOver?'bg-[#9B6B61]':isWarn?'bg-[#D4AF37]':'bg-[#7C8363]'}`} style={{width:`${pct}%`}} />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#8D7F72] font-semibold">
                      <span>{totalSpent.toLocaleString('fa-IR')} هزینه شده</span>
                      <span>{totalBudget.toLocaleString('fa-IR')} تومان</span>
                    </div>
                    {isOver && (
                      <div className="p-2 bg-red-50 border border-red-100 rounded-lg text-[9px] text-[#9B6B61] font-bold flex items-center gap-1.5 mt-2">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>هشدار مکرر: کل بودجه ماهانه شما تکمیل/تجاوز شده است! لطفاً مخارج خود را کنترل کنید.</span>
                      </div>
                    )}
                    {isWarn && (
                      <div className="p-2 bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#EBE3C8] dark:border-[#3D4133] rounded-lg text-[9px] text-[#9B6B61] dark:text-[#C59B93] font-bold flex items-center gap-1.5 mt-2">
                        <AlertCircle className="w-3.5 h-3.5 text-[#E26645] shrink-0 animate-pulse" />
                        <span>توجه: بیش از ۸۰٪ از کل بودجه ماهانه مصرف شده است. نزدیک شدن به محدوده پرخطر!</span>
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="space-y-3">
                {expenseCategories.map(cat=>{
                  const budget=budgetSettings?.categoryBudgets?.[cat.id];
                  const spent=spendByCategory[cat.id]||0;
                  if(spent===0&&!budget) return null;
                  const pct=budget&&budget>0?Math.min(100,Math.round((spent/budget)*100)):null;
                  const isOver=pct!==null&&pct>=100; const isWarn=pct!==null&&pct>=80&&pct<100;
                  return (
                    <div key={cat.id} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D3025]"><span>{cat.icon||'📂'}</span><span>{cat.name}</span></div>
                        <div className="text-[10px] font-semibold text-[#8D7F72]">{spent.toLocaleString('fa-IR')}{budget?` / ${budget.toLocaleString('fa-IR')} تومان`:' تومان (بدون سقف)'}</div>
                      </div>
                      <div className="w-full h-2 bg-[#E6DFD3] rounded-full overflow-hidden">
                        {pct!==null ? (
                          <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.6,ease:'easeOut'}}
                            className={`h-full rounded-full ${isOver?'bg-[#9B6B61]':isWarn?'bg-[#D4AF37]':'bg-[#7C8363]'}`} />
                        ) : (
                          <div className="h-full w-full bg-[#D6CFC3]/50 rounded-full" />
                        )}
                      </div>
                      {isOver && <p className="text-[9px] text-[#9B6B61] font-bold flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3 text-red-500 shrink-0" />بودجه این دسته تجاوز شده!</p>}
                      {isWarn && <p className="text-[9px] text-[#9B6B61] dark:text-[#C59B93] font-bold flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3 text-[#E26645] shrink-0" />بیش از ۸۰٪ بودجه مصرف شده (نزدیک به سقف)</p>}
                    </div>
                  );
                })}
                {expenseCategories.every(c=>(spendByCategory[c.id]||0)===0&&!budgetSettings?.categoryBudgets?.[c.id]) && (
                  <div className="py-8 text-center text-xs text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-xl">هزینه‌ای در ماه جاری ثبت نشده یا بودجه تنظیم نشده.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          REPORT TAB
      ══════════════════════════════════════════════════════════════════ */}
      {financeTab==='report' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {label:'درآمد ماه جاری',cur:currentM.income,prev:prevM.income,green:true,border:'border-[#DDE2D5]',icon:TrendingUp,bg:'bg-[#E8ECE0]'},
              {label:'هزینه ماه جاری',cur:currentM.expense,prev:prevM.expense,green:false,border:'border-[#EDDDD7]',icon:TrendingDown,bg:'bg-[#F4E9E4]'},
              {label:'خالص ماه جاری',cur:currentM.income-currentM.expense,prev:prevM.income-prevM.expense,green:true,border:'border-[#EBE3C8]',icon:DollarSign,bg:'bg-[#F9F1D8]'},
            ].map(c=>{
              const chg=pctChange(c.cur,c.prev); const up=chg>=0;
              const positive=c.green?up:!up;
              return (
                <div key={c.label} className={`bg-[#FDFBF7] p-5 rounded-2xl border ${c.border}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-2.5 ${c.bg} rounded-xl border ${c.border}`}><c.icon className="w-4 h-4 text-[#8D7F72]" /></div>
                    <span className="text-[9px] font-bold text-[#8D7F72] bg-[#F9F1D8] px-2 py-0.5 rounded-full">{monthLabel(thisMonthKey)} در برابر قبل</span>
                  </div>
                  <p className="text-[10px] text-[#8D7F72] font-semibold">{c.label}</p>
                  <h3 className={`text-xl font-black font-serif-elegant mt-0.5 ${c.cur>=0?'text-[#7C8363]':'text-[#9B6B61]'}`}>{c.cur.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72]">تومان</span></h3>
                  <div className={`flex items-center gap-1 mt-2 text-[10px] font-bold ${positive?'text-[#7C8363]':'text-[#9B6B61]'}`}>
                    {up?<TrendingUp className="w-3 h-3"/>:<TrendingDown className="w-3 h-3"/>}
                    <span>{Math.abs(chg)}٪ {up?'بیشتر':'کمتر'} از ماه قبل</span>
                  </div>
                  <p className="text-[9px] text-[#8D7F72] mt-1">ماه قبل: {c.prev.toLocaleString('fa-IR')} تومان</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] space-y-3">
              <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant"><ListOrdered className="w-4 h-4 text-[#7C8363]" />مقایسه ماه‌به‌ماه</h3>
              {monthlyChartData.length>0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} barGap={2}>
                      <XAxis dataKey="label" tick={{fontSize:9,fill:'#8D7F72'}} stroke="#E6DFD3" />
                      <YAxis tick={{fontSize:9,fill:'#8D7F72'}} width={50} stroke="#E6DFD3" tickFormatter={v=>(v/1000000).toFixed(1)+'M'} />
                      <Tooltip formatter={(v:number,n:string)=>[`${v.toLocaleString('fa-IR')} تومان`,n==='income'?'درآمد':'هزینه']} labelFormatter={l=>`ماه: ${l}`} />
                      <Bar dataKey="income" fill="#7C8363" radius={[3,3,0,0]} />
                      <Bar dataKey="expense" fill="#9B6B61" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="h-56 flex items-center justify-center text-xs text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-xl">داده کافی برای نمودار ثبت نشده.</div>}
            </div>

            <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] space-y-3">
              <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant"><PieChartIcon className="w-4 h-4 text-[#9B6B61]" />خالص ماهانه</h3>
              {monthlyChartData.length>0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData}>
                      <XAxis dataKey="label" tick={{fontSize:9,fill:'#8D7F72'}} stroke="#E6DFD3" />
                      <YAxis tick={{fontSize:9,fill:'#8D7F72'}} width={55} stroke="#E6DFD3" tickFormatter={v=>(v/1000000).toFixed(1)+'M'} />
                      <Tooltip formatter={(v:number)=>[`${v.toLocaleString('fa-IR')} تومان`,'خالص']} labelFormatter={l=>`ماه: ${l}`} />
                      <Bar dataKey="net" radius={[3,3,0,0]}>
                        {monthlyChartData.map((entry,i)=><Cell key={i} fill={entry.net>=0?'#7C8363':'#9B6B61'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="h-56 flex items-center justify-center text-xs text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-xl">داده‌ای برای نمایش وجود ندارد.</div>}
            </div>
          </div>

          {/* Trend chart over time */}
          <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] space-y-3">
            <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
              <TrendingUp className="w-4 h-4 text-[#7C8363]" />
              <span>نمودار روند درآمد و هزینه‌ها در گذر زمان (مالی خطی)</span>
            </h3>
            {monthlyChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1ECE4" />
                    <XAxis dataKey="label" tick={{fontSize:9,fill:'#8D7F72'}} stroke="#E6DFD3" />
                    <YAxis tick={{fontSize:9,fill:'#8D7F72'}} width={55} stroke="#E6DFD3" tickFormatter={v=>(v/1000000).toFixed(1)+'M'} />
                    <Tooltip formatter={(v:number, name:string)=>[`${v.toLocaleString('fa-IR')} تومان`, name === 'income' ? 'درآمد' : 'هزینه']} labelFormatter={l=>`ماه: ${l}`} />
                    <Line type="monotone" dataKey="income" stroke="#7C8363" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="expense" stroke="#9B6B61" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-xs text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-xl">
                داده‌ای برای نمایش وجود ندارد.
              </div>
            )}
          </div>

          {/* Monthly table */}
          <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] space-y-4">
            <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant"><Filter className="w-4 h-4 text-[#7C8363]" />جدول گزارش تمام ماه‌ها</h3>
            {monthlyChartData.length>0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead><tr className="border-b border-[#E6DFD3] text-[#8D7F72] font-bold">
                    <th className="pb-3 pr-2">ماه</th><th className="pb-3 text-[#7C8363]">درآمد</th><th className="pb-3 text-[#9B6B61]">هزینه</th><th className="pb-3">خالص</th><th className="pb-3 text-center">وضعیت بودجه</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[#E6DFD3]/40">
                    {[...monthlyChartData].reverse().map(row=>{
                      const net=row.income-row.expense;
                      const budget=budgetSettings?.monthlyTotal;
                      const budgetPct=budget?Math.min(100,Math.round((row.expense/budget)*100)):null;
                      return (
                        <tr key={row.month} className={`hover:bg-[#F9F6EE] transition-colors ${row.month===thisMonthKey?'bg-[#F9F1D8]/40':''}`}>
                          <td className="py-3 pr-2 font-bold text-[#2D3025]">{row.label}{row.month===thisMonthKey&&<span className="mr-1.5 text-[8px] bg-[#E26645] text-white px-1.5 py-0.5 rounded-full font-bold">جاری</span>}</td>
                          <td className="py-3 font-semibold text-[#7C8363] font-mono">{row.income.toLocaleString('fa-IR')}</td>
                          <td className="py-3 font-semibold text-[#9B6B61] font-mono">{row.expense.toLocaleString('fa-IR')}</td>
                          <td className={`py-3 font-extrabold font-mono ${net>=0?'text-[#7C8363]':'text-[#9B6B61]'}`}>{net>=0?'+':''}{net.toLocaleString('fa-IR')}</td>
                          <td className="py-3 text-center">
                            {budgetPct!==null ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <div className="w-16 h-1.5 bg-[#E6DFD3] rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${budgetPct>=100?'bg-[#9B6B61]':budgetPct>=80?'bg-[#D4AF37]':'bg-[#7C8363]'}`} style={{width:`${budgetPct}%`}} />
                                </div>
                                <span className="text-[9px] font-bold text-[#8D7F72]">{budgetPct}٪</span>
                              </div>
                            ) : <span className="text-[9px] text-[#8D7F72]">بدون سقف</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <div className="py-8 text-center text-xs text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-xl">تراکنشی ثبت نشده.</div>}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CATEGORIES TAB
      ══════════════════════════════════════════════════════════════════ */}
      {financeTab==='categories' && (
        <FinanceCategoryDashboard
          categories={categories} transactions={transactions}
          onAddCategory={onAddCategory} onDeleteCategory={onDeleteCategory}
          onAddSubcategory={onAddSubcategory} onDeleteSubcategory={onDeleteSubcategory}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          DEBTS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {financeTab==='debts' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#FDFBF7] p-4 sm:p-5 rounded-2xl shadow-sm border border-[#EDDDD7] flex items-center justify-between">
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-[11px] text-[#8D7F72] font-semibold block">بدهی‌های من (طلب دیگران)</span>
                <h3 className="text-lg sm:text-xl font-bold font-serif-elegant truncate text-[#9B6B61]">
                  {totalOwedToOthers.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72]">تومان</span>
                </h3>
                <span className="text-[9px] text-[#8D7F72] block font-semibold">
                  {activeDebtsList.filter(d => d.type === 'debt').length.toLocaleString('fa-IR')} مورد پرداخت‌نشده
                </span>
              </div>
              {iconBox('bg-[#F4E9E4]', 'border-[#EDDDD7]', 'text-[#9B6B61]', TrendingDown)}
            </div>

            <div className="bg-[#FDFBF7] p-4 sm:p-5 rounded-2xl shadow-sm border border-[#DDE2D5] flex items-center justify-between">
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-[11px] text-[#8D7F72] font-semibold block">طلب‌های من (بدهی دیگران)</span>
                <h3 className="text-lg sm:text-xl font-bold font-serif-elegant truncate text-[#7C8363]">
                  {totalOwedToMe.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72]">تومان</span>
                </h3>
                <span className="text-[9px] text-[#8D7F72] block font-semibold">
                  {activeDebtsList.filter(d => d.type === 'loan').length.toLocaleString('fa-IR')} مورد دریافت‌نشده
                </span>
              </div>
              {iconBox('bg-[#E8ECE0]', 'border-[#DDE2D5]', 'text-[#7C8363]', TrendingUp)}
            </div>

            <div className={`bg-[#FDFBF7] p-4 sm:p-5 rounded-2xl shadow-sm border ${netDebtBalance >= 0 ? 'border-[#DDE2D5]' : 'border-[#EDDDD7]'} flex items-center justify-between`}>
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-[11px] text-[#8D7F72] font-semibold block">موازنه نهایی بدهی و طلب</span>
                <h3 className={`text-lg sm:text-xl font-bold font-serif-elegant truncate ${netDebtBalance >= 0 ? 'text-[#7C8363]' : 'text-[#9B6B61]'}`}>
                  {netDebtBalance >= 0 ? '+' : ''}{netDebtBalance.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72]">تومان</span>
                </h3>
                <span className="text-[9px] text-[#8D7F72] block font-semibold">
                  {netDebtBalance >= 0 ? 'مجموعاً طلبکار هستید' : 'مجموعاً بدهکار هستید'}
                </span>
              </div>
              {iconBox(
                netDebtBalance >= 0 ? 'bg-[#E8ECE0]' : 'bg-[#F4E9E4]',
                netDebtBalance >= 0 ? 'border-[#DDE2D5]' : 'border-[#EDDDD7]',
                netDebtBalance >= 0 ? 'text-[#7C8363]' : 'text-[#9B6B61]',
                Wallet
              )}
            </div>
          </div>

          {/* Sub-navigation within Debts tab */}
          <div className="flex bg-[#E6DFD3] p-1 rounded-xl w-full max-w-md mx-auto my-2 mb-4">
            <button type="button" onClick={() => setDebtSubTab('debts')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${debtSubTab === 'debts' ? 'bg-[#9B6B61] text-white shadow' : 'text-[#8D7F72]'}`}>
              <Coins className="w-4 h-4" />
              <span>بدهی‌ها و طلب‌های دستی</span>
            </button>
            <button type="button" onClick={() => setDebtSubTab('installments')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${debtSubTab === 'installments' ? 'bg-[#9B6B61] text-white shadow' : 'text-[#8D7F72]'}`}>
              <PercentSquare className="w-4 h-4" />
              <span>مدیریت اقساط و وام‌ها</span>
            </button>
          </div>

          {debtSubTab === 'debts' && (
            <>
              {/* Add / Toggle form button */}
          <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
                <PlusCircle className="w-4 h-4 text-[#7C8363]" />
                <span>مدیریت بدهی‌ها و طلب‌ها</span>
              </h3>
              <button type="button" onClick={() => setShowDebtForm(p=>!p)}
                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#7C8363] border border-[#DDE2D5] rounded-xl hover:bg-[#E8ECE0] transition-all cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                {showDebtForm ? 'بستن فرم' : 'افزودن بدهی / طلب جدید'}
              </button>
            </div>

            {/* Add debt form */}
            <AnimatePresence>
              {showDebtForm && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <form onSubmit={handleAddDebtSubmit} className="bg-[#F9F6EE] p-4 rounded-xl border border-[#E6DFD3] space-y-3 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">نوع تعهد مالی</label>
                        <div className="flex bg-[#E6DFD3] p-0.5 rounded-lg w-full">
                          <button type="button" onClick={() => setDebtType('debt')}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${debtType === 'debt' ? 'bg-[#FDFBF7] dark:bg-[#1B1D16] text-[#9B6B61] shadow-xs' : 'text-[#8D7F72]'}`}>
                            بدهکار هستم (بدهی به دیگران)
                          </button>
                          <button type="button" onClick={() => setDebtType('loan')}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${debtType === 'loan' ? 'bg-[#FDFBF7] dark:bg-[#1B1D16] text-[#7C8363] shadow-xs' : 'text-[#8D7F72]'}`}>
                            طلبکار هستم (قرض دادن به دیگران)
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">طرف حساب / شخص</label>
                        <input type="text" value={debtPerson} onChange={e => setDebtPerson(e.target.value)} placeholder="مثال: رضا محمدی، بانک ملی" required
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">عنوان تعهد</label>
                        <input type="text" value={debtTitle} onChange={e => setDebtTitle(e.target.value)} placeholder="مثال: قرض دستی، قسط شهریور" required
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">مبلغ (تومان)</label>
                        <MoneyInput value={debtAmount} onChange={setDebtAmount} placeholder="مبلغ" required
                          className="py-2 rounded-xl border border-[#D6CFC3] text-xs focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">تاریخ سررسید / تسویه</label>
                        <PersianDatePicker value={debtDueDate} onChange={setDebtDueDate} />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">توضیحات (اختیاری)</label>
                        <input type="text" value={debtDesc} onChange={e => setDebtDesc(e.target.value)} placeholder="بابت چه چیز..."
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                      </div>
                    </div>

                    <button type="submit"
                      className="w-full py-2.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                      <Save className="w-4 h-4" />
                      ثبت تعهد مالی جدید
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active debts & loans list */}
          <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] space-y-4">
            <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
              <SlidersHorizontal className="w-4 h-4 text-[#7C8363]" />
              <span>لیست بدهی‌ها و طلب‌های فعال</span>
              <span className="text-[9px] text-[#8D7F72] bg-[#E6DFD3]/50 px-2.5 py-0.5 rounded-full font-bold">
                {activeDebtsList.length.toLocaleString('fa-IR')} فعال
              </span>
            </h3>

            {activeDebtsList.length > 0 ? (
              <div className="space-y-3">
                {activeDebtsList.map(d => (
                  <div key={d.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl border transition-all ${d.type === 'debt' ? 'bg-[#F4E9E4]/20 border-[#EDDDD7]' : 'bg-[#E8ECE0]/20 border-[#DDE2D5]'}`}>
                    <div className="flex items-center gap-3 min-w-0 mb-3 sm:mb-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${d.type === 'debt' ? 'bg-[#F4E9E4] text-[#9B6B61]' : 'bg-[#E8ECE0] text-[#7C8363]'}`}>
                        {d.type === 'debt' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#2D3025]">{d.title}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${d.type === 'debt' ? 'bg-[#F4E9E4] text-[#9B6B61]' : 'bg-[#E8ECE0] text-[#7C8363]'}`}>
                            {d.type === 'debt' ? `بدهی به ${d.person}` : `طلب از ${d.person}`}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#8D7F72] font-semibold mt-1">
                          {d.description || 'بدون توضیحات'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-0 pt-2 sm:pt-0 border-black/5">
                      <div className="text-right">
                        <span className="text-[9px] text-[#8D7F72] font-bold block">مبلغ تعهد</span>
                        <span className={`text-sm font-black font-mono ${d.type === 'debt' ? 'text-[#9B6B61]' : 'text-[#7C8363]'}`}>
                          {d.amount.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72]">تومان</span>
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] text-[#8D7F72] font-bold block">تاریخ سررسید</span>
                        <span className="text-xs font-bold text-[#2D3025] font-mono flex items-center gap-1">
                          <CalendarDays className="w-3 h-3 text-[#8D7F72]" />
                          {d.dueDate}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button onClick={() => onToggleDebtCompletion(d.id)} title="علامت‌گذاری به عنوان تسویه شده"
                          className="px-2.5 py-1.5 text-[10px] font-bold bg-[#2D3025] text-white hover:bg-[#7C8363] rounded-xl transition-all cursor-pointer flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تسویه شد</span>
                        </button>
                        <button onClick={() => onDeleteDebt(d.id)} title="حذف دائمی"
                          className="p-2 text-[#8D7F72] hover:text-[#9B6B61] hover:bg-[#F4E9E4] rounded-xl transition-all cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-2xl bg-[#FDFBF7]">
                <ShieldCheck className="w-8 h-8 text-[#7C8363] mx-auto mb-2 opacity-60" />
                <span>هیچ بدهی یا طلب فعالی ثبت نشده است! وضعیت مالی شما کاملاً متعادل است.</span>
              </div>
            )}
          </div>

          {/* Settle/Completed history list */}
          {completedDebtsList.length > 0 && (
            <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] space-y-4 opacity-75">
              <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
                <ShieldCheck className="w-4 h-4 text-[#7C8363]" />
                <span>تاریخچه موارد تسویه شده (بایگانی)</span>
                <span className="text-[9px] text-[#8D7F72] bg-[#E6DFD3]/50 px-2.5 py-0.5 rounded-full font-bold">
                  {completedDebtsList.length.toLocaleString('fa-IR')} مورد
                </span>
              </h3>

              <div className="space-y-2">
                {completedDebtsList.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3.5 rounded-xl border border-[#DDE2D5] bg-[#E8ECE0]/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E8ECE0] text-[#7C8363] flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#8D7F72] dark:text-[#9D978B] line-through">{d.title}</span>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#E6DFD3] dark:bg-[#3D4133] text-[#8D7F72] dark:text-[#9D978B]">
                            {d.type === 'debt' ? `پرداخت شده به ${d.person}` : `دریافت شده از ${d.person}`}
                          </span>
                        </div>
                        <span className="text-[9px] text-[#9D978B] dark:text-[#7C8363] font-mono">تسویه با مبلغ {d.amount.toLocaleString('fa-IR')} تومان</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => onToggleDebtCompletion(d.id)}
                        className="px-2 py-1 text-[9px] font-bold border border-[#E6DFD3] dark:border-[#3D4133] text-[#3D3D3D] dark:text-[#9D978B] rounded-lg hover:bg-[#F9F6EE] dark:bg-[#1B1D16] transition-all cursor-pointer">
                        بازگرداندن به فعال
                      </button>
                      <button onClick={() => onDeleteDebt(d.id)}
                        className="p-1.5 text-[#9D978B] dark:text-[#7C8363] hover:text-red-600 rounded-lg transition-all cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
            </>
          )}

          {/* Installments sub-tab */}
          {debtSubTab === 'installments' && (
            <div className="space-y-6">
              {/* Installments Summary Cards */}
              {(() => {
                const activeInsts = installments.filter(i => i.paidMonths < i.totalMonths);
                const totalFutureCommitment = activeInsts.reduce((sum, i) => sum + (i.totalMonths - i.paidMonths) * i.installmentAmount, 0);
                
                const monthlyCommitment = activeInsts.reduce((sum, i) => sum + i.installmentAmount, 0);

                const dueThisMonthInsts = activeInsts.filter(i => {
                  const dueDate = getNextMonthDate(i.startDate, i.paidMonths, i.dayOfMonth);
                  return dueDate.substring(0, 7) === todayDate.substring(0, 7) || dueDate < todayDate;
                });
                const dueThisMonthAmount = dueThisMonthInsts.reduce((sum, i) => sum + i.installmentAmount, 0);

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#FDFBF7] p-5 rounded-2xl shadow-sm border border-[#EDDDD7] flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] text-[#8D7F72] font-semibold block">مجموع تعهدات مالی آتی (باقیمانده اقساط)</span>
                        <h3 className="text-lg sm:text-xl font-bold font-serif-elegant text-[#9B6B61]">
                          {totalFutureCommitment.toLocaleString('fa-IR')} <span className="text-xs font-normal text-[#8D7F72]">تومان</span>
                        </h3>
                        <span className="text-[9px] text-[#8D7F72] block font-semibold">
                          از کل {installments.length.toLocaleString('fa-IR')} طرح اقساطی تعریف شده
                        </span>
                      </div>
                      <div className="p-3 bg-[#F4E9E4] text-[#9B6B61] rounded-xl border border-[#EDDDD7]"><TrendingDown className="w-5 h-5" /></div>
                    </div>

                    <div className="bg-[#FDFBF7] p-5 rounded-2xl shadow-sm border border-[#DDE2D5] flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] text-[#8D7F72] font-semibold block">مجموع قسط ماهانه فعلی</span>
                        <h3 className="text-lg sm:text-xl font-bold font-serif-elegant text-[#7C8363]">
                          {monthlyCommitment.toLocaleString('fa-IR')} <span className="text-xs font-normal text-[#8D7F72]">تومان / ماه</span>
                        </h3>
                        <span className="text-[9px] text-[#8D7F72] block font-semibold">
                          بابت {activeInsts.length.toLocaleString('fa-IR')} خرید اقساطی فعال
                        </span>
                      </div>
                      <div className="p-3 bg-[#E8ECE0] text-[#7C8363] rounded-xl border border-[#DDE2D5]"><PercentSquare className="w-5 h-5" /></div>
                    </div>

                    <div className="bg-[#FDFBF7] p-5 rounded-2xl shadow-sm border border-[#EBE3C8] flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] text-[#8D7F72] font-semibold block">سررسید پرداخت‌نشده این ماه</span>
                        <h3 className="text-lg sm:text-xl font-bold font-serif-elegant text-[#9B6B61] dark:text-[#C59B93]">
                          {dueThisMonthAmount.toLocaleString('fa-IR')} <span className="text-xs font-normal text-[#8D7F72]">تومان</span>
                        </h3>
                        <span className="text-[9px] text-[#8D7F72] block font-semibold">
                          {dueThisMonthInsts.length.toLocaleString('fa-IR')} قسط آماده پرداخت
                        </span>
                      </div>
                      <div className="p-3 bg-[#F9F1D8] text-[#9B6B61] dark:text-[#C59B93] rounded-xl border border-[#EBE3C8]"><AlertCircle className="w-5 h-5" /></div>
                    </div>
                  </div>
                );
              })()}

              {/* Add Installment Form Card */}
              <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
                    <PlusCircle className="w-4 h-4 text-[#7C8363]" />
                    <span>ثبت خرید اقساطی یا وام جدید</span>
                  </h3>
                  <button type="button" onClick={() => setShowInstallmentForm(p => !p)}
                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#7C8363] border border-[#DDE2D5] rounded-xl hover:bg-[#E8ECE0] transition-all cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />
                    {showInstallmentForm ? 'بستن فرم' : 'ثبت قسط جدید'}
                  </button>
                </div>

                <AnimatePresence>
                  {showInstallmentForm && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!instTitle || !instTotalAmount || !instMonths) return;
                        if (onAddInstallment) {
                          onAddInstallment({
                            title: instTitle,
                            totalAmount: Number(instTotalAmount),
                            installmentAmount: Math.round(Number(instTotalAmount) / Number(instMonths)),
                            totalMonths: Number(instMonths),
                            paidMonths: Number(instPaidMonths),
                            startDate: instStartDate,
                            dayOfMonth: Number(instDayOfMonth),
                            category: instCategory
                          });
                        }
                        setInstTitle('');
                        setInstTotalAmount('');
                        setInstMonths('6');
                        setInstPaidMonths('0');
                        setInstStartDate(todayDate);
                        setInstDayOfMonth('5');
                        setShowInstallmentForm(false);
                      }} className="bg-[#F9F6EE] p-4 rounded-xl border border-[#E6DFD3] space-y-3 pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#8D7F72]">عنوان خرید / وام</label>
                            <input type="text" value={instTitle} onChange={e => setInstTitle(e.target.value)} placeholder="مثال: گوشی آیفون ۱۶، وام مسکن" required
                              className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16] text-[#2D3025] dark:text-[#E8ECE0]" />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#8D7F72]">مبلغ کل خرید یا وام (تومان)</label>
                            <MoneyInput value={instTotalAmount} onChange={setInstTotalAmount} placeholder="مبلغ کل تعهد" required
                              className="py-2 rounded-xl border border-[#D6CFC3] text-xs focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16] text-[#2D3025] dark:text-[#E8ECE0]" />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#8D7F72]">دسته‌بندی مخارج</label>
                            <select value={instCategory} onChange={e => setInstCategory(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16] text-[#2D3025] dark:text-[#E8ECE0]">
                              {categories.filter(c => c.type === 'expense').map(c => (
                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#8D7F72]">تعداد ماه‌های بازپرداخت (تعداد اقساط)</label>
                            <input type="number" min="1" max="120" value={instMonths} onChange={e => setInstMonths(e.target.value)} required
                              className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16] text-[#2D3025] dark:text-[#E8ECE0]" />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#8D7F72]">تعداد اقساط پرداخت‌شده تا الان</label>
                            <input type="number" min="0" max={instMonths} value={instPaidMonths} onChange={e => setInstPaidMonths(e.target.value)} required
                              className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16] text-[#2D3025] dark:text-[#E8ECE0]" />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#8D7F72]">روز سررسید در هر ماه</label>
                            <input type="number" min="1" max="31" value={instDayOfMonth} onChange={e => setInstDayOfMonth(e.target.value)} required
                              className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16] text-[#2D3025] dark:text-[#E8ECE0]" />
                          </div>

                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] font-bold text-[#8D7F72]">تاریخ شروع بازپرداخت (قسط اول)</label>
                            <PersianDatePicker value={instStartDate} onChange={setInstStartDate} />
                          </div>

                          {instTotalAmount && instMonths && Number(instMonths) > 0 && (
                            <div className="sm:col-span-3 bg-[#FDFBF7] dark:bg-[#1B1D16] p-3 rounded-xl border border-[#D6CFC3]/60 text-center">
                              <span className="text-xs font-bold text-[#7C8363]">پیش‌نمایش طرح اقساطی:</span>
                              <p className="text-xs font-black text-[#2D3025] mt-1">
                                مبلغ هر قسط:{' '}
                                <span className="text-[#9B6B61]">
                                  {Math.round(Number(instTotalAmount) / Number(instMonths)).toLocaleString('fa-IR')}
                                </span>{' '}
                                تومان در ماه به مدت <span className="text-[#9B6B61]">{Number(instMonths).toLocaleString('fa-IR')}</span> ماه
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button type="submit"
                            className="flex-1 py-2.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>ثبت تعهد و زمان‌بندی اقساط</span>
                          </button>
                          <button type="button" onClick={() => setShowInstallmentForm(false)}
                            className="px-4 py-2.5 border border-[#E6DFD3] text-xs font-bold text-[#8D7F72] rounded-xl hover:bg-[#F9F6EE] transition-all cursor-pointer">
                            انصراف
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Current Month Unpaid Drafts */}
              {(() => {
                const activeInsts = installments.filter(i => i.paidMonths < i.totalMonths);
                const dueThisMonth = activeInsts.filter(i => {
                  const dueDate = getNextMonthDate(i.startDate, i.paidMonths, i.dayOfMonth);
                  return dueDate.substring(0, 7) === todayDate.substring(0, 7) || dueDate < todayDate;
                });

                if (dueThisMonth.length === 0) return null;

                return (
                  <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133] bg-[#FDFBF7] dark:bg-[#1B1D16]/20 space-y-4">
                    <h3 className="text-sm font-bold text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2 font-serif-elegant">
                      <AlertCircle className="w-4 h-4 text-[#9B6B61] dark:text-[#C59B93] animate-pulse" />
                      <span>پیش‌نویس اقساط ماه جاری (آماده پرداخت)</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dueThisMonth.map(inst => (
                        <InstallmentDraftPayCard 
                          key={inst.id}
                          inst={inst}
                          bankAccounts={bankAccounts}
                          getNextMonthDate={getNextMonthDate}
                          onPayInstallment={onPayInstallment}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Installment Timelines & Plans list */}
              <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] space-y-4">
                <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
                  <ListOrdered className="w-4 h-4 text-[#9B6B61]" />
                  <span>طرح‌های اقساطی و بازه بازپرداخت</span>
                </h3>

                {installments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-xl">
                    هیچ طرح اقساطی ثبت نشده است. می‌توانید با استفاده از دکمه بالا طرح جدید ثبت کنید.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {installments.map(inst => {
                      const pct = Math.min(100, Math.round((inst.paidMonths / inst.totalMonths) * 100));
                      const isOver = inst.paidMonths >= inst.totalMonths;
                      const nextDueDate = getNextMonthDate(inst.startDate, inst.paidMonths, inst.dayOfMonth);
                      const currentCat = categories.find(c => c.id === inst.category);

                      return (
                        <div key={inst.id} className="p-4 rounded-xl border border-[#DDE2D5] bg-[#FDFBF7] dark:bg-[#1B1D16] space-y-3 shadow-xs">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">{currentCat?.icon || '📂'}</span>
                              <div>
                                <h4 className="font-bold text-xs text-[#2D3025]">{inst.title}</h4>
                                <span className="text-[9px] text-[#8D7F72] font-semibold">
                                  کل خرید: {inst.totalAmount.toLocaleString('fa-IR')} تومان — هر قسط: {inst.installmentAmount.toLocaleString('fa-IR')} تومان
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isOver ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-bold rounded-full">تکمیل شده</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-[#F9F1D8] dark:bg-[#201D13] text-[#2D3025] dark:text-[#E8ECE0] text-[8px] font-bold rounded-full">قسط {inst.paidMonths.toLocaleString('fa-IR')} از {inst.totalMonths.toLocaleString('fa-IR')}</span>
                              )}
                              <button onClick={() => { if (confirm(`طرح اقساطی "${inst.title}" حذف شود؟`)) onDeleteInstallment?.(inst.id); }}
                                className="p-1.5 text-[#9D978B] dark:text-[#7C8363] hover:text-red-600 rounded-lg hover:bg-red-50 transition-all cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-bold text-[#8D7F72]">
                              <span>بازپرداخت شده: {pct}%</span>
                              <span>کل دوره: {inst.totalMonths.toLocaleString('fa-IR')} ماه</span>
                            </div>
                            <div className="w-full h-2 bg-[#E6DFD3] rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                                className={`h-full rounded-full ${isOver ? 'bg-emerald-600' : 'bg-[#9B6B61]'}`} />
                            </div>
                          </div>

                          {/* Dots timeline representation */}
                          <div className="flex gap-1.5 flex-wrap pt-1 border-t border-[#E6DFD3]/40 dark:border-[#3D4133]/40 mt-2">
                            {Array.from({ length: inst.totalMonths }).map((_, i) => (
                              <div key={i} title={`قسط ماه ${i + 1}`}
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold border shrink-0 ${i < inst.paidMonths ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-[#F9F6EE] dark:bg-[#1B1D16] text-[#9D978B] dark:text-[#7C8363] border-[#E6DFD3] dark:border-[#3D4133]'}`}>
                                {(i + 1).toLocaleString('fa-IR')}
                              </div>
                            ))}
                          </div>

                          {!isOver && (
                            <div className="flex justify-between items-center text-[9px] text-[#8D7F72] font-semibold pt-1">
                              <span>سررسید بعدی: {nextDueDate}</span>
                              <span className="text-[#9B6B61] dark:text-[#C59B93] font-bold bg-[#FDFBF7] dark:bg-[#1B1D16] px-2 py-0.5 rounded-lg border border-[#EBE3C8] dark:border-[#3D4133]">
                                {nextDueDate <= todayDate ? 'موعد پرداخت رسیده' : 'فعال'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ASSETS & CRYPTO TAB
      ══════════════════════════════════════════════════════════════════ */}
      {financeTab==='assets' && (
        <>
          {/* Summary Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#FDFBF7] p-4 sm:p-5 rounded-2xl shadow-sm border border-[#E6DFD3] flex items-center justify-between">
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-[11px] text-[#8D7F72] font-semibold block">ارزش فعلی کل سبد دارایی</span>
                <h3 className="text-lg sm:text-xl font-black font-serif-elegant truncate text-[#2D3025]">
                  {portfolioSummary.totalCurrentValue.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72]">تومان</span>
                </h3>
                <span className="text-[9px] text-[#8D7F72] block font-semibold">
                  مجموع ارزش دارایی‌ها بر اساس قیمت روز
                </span>
              </div>
              {iconBox('bg-[#E8ECE0]', 'border-[#DDE2D5]', 'text-[#7C8363]', Wallet)}
            </div>

            <div className="bg-[#FDFBF7] p-4 sm:p-5 rounded-2xl shadow-sm border border-[#E6DFD3] flex items-center justify-between">
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-[11px] text-[#8D7F72] font-semibold block">کل بهای تمام‌شده خرید</span>
                <h3 className="text-lg sm:text-xl font-black font-serif-elegant truncate text-[#8D7F72]">
                  {portfolioSummary.totalPurchaseCost.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72]">تومان</span>
                </h3>
                <span className="text-[9px] text-[#8D7F72] block font-semibold">
                  کل سرمایه اولیه وارد شده
                </span>
              </div>
              {iconBox('bg-[#E6DFD3]/40', 'border-[#D6CFC3]', 'text-[#8D7F72]', CreditCard)}
            </div>

            <div className={`bg-[#FDFBF7] p-4 sm:p-5 rounded-2xl shadow-sm border ${portfolioSummary.netProfitLoss >= 0 ? 'border-[#DDE2D5]' : 'border-[#EDDDD7]'} flex items-center justify-between`}>
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-[11px] text-[#8D7F72] font-semibold block">سود یا زیان کل سبد</span>
                <h3 className={`text-lg sm:text-xl font-black font-serif-elegant truncate ${portfolioSummary.netProfitLoss >= 0 ? 'text-[#7C8363]' : 'text-[#9B6B61]'}`}>
                  {portfolioSummary.netProfitLoss >= 0 ? '+' : ''}{portfolioSummary.netProfitLoss.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72]">تومان</span>
                </h3>
                <span className={`text-[9px] block font-extrabold ${portfolioSummary.netProfitLoss >= 0 ? 'text-[#7C8363]' : 'text-[#9B6B61]'}`}>
                  {portfolioSummary.netProfitLoss >= 0 ? '📈 صعودی ' : '📉 نزولی '}({Number(portfolioSummary.profitLossPercent.toFixed(1)).toLocaleString('fa-IR')}٪)
                </span>
              </div>
              {iconBox(
                portfolioSummary.netProfitLoss >= 0 ? 'bg-[#E8ECE0]' : 'bg-[#F4E9E4]',
                portfolioSummary.netProfitLoss >= 0 ? 'border-[#DDE2D5]' : 'border-[#EDDDD7]',
                portfolioSummary.netProfitLoss >= 0 ? 'text-[#7C8363]' : 'text-[#9B6B61]',
                Coins
              )}
            </div>
          </div>

          {/* Allocation & Add Form Block */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Allocation Chart */}
            <div className="lg:col-span-5 bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] flex flex-col justify-between">
              <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
                <PieChartIcon className="w-4 h-4 text-[#7C8363]" />
                <span>توزیع دارایی‌ها</span>
              </h3>
              
              {assets && assets.length > 0 ? (
                <div className="flex flex-col items-center justify-center py-4 flex-1">
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(() => {
                            const types: Record<string, number> = {};
                            assets.forEach(a => {
                              const val = a.amount * a.currentPrice;
                              types[a.type] = (types[a.type] || 0) + val;
                            });
                            const labels: Record<string, string> = {
                              crypto: 'کریپتو',
                              gold: 'طلا و فلزات',
                              stock: 'سهام',
                              currency: 'ارز فیزیکی',
                              real_estate: 'ملک و زمین',
                              other: 'سایر'
                            };
                            return Object.entries(types).map(([key, value]) => ({
                              name: labels[key] || key,
                              value
                            }));
                          })()}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {assets.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [`${value.toLocaleString('fa-IR')} تومان`, 'ارزش کل']} 
                          contentStyle={{ background: '#FDFBF7', borderRadius: '12px', border: '1px solid #E6DFD3', fontSize: '11px', fontFamily: 'Inter' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend list */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full text-[10px] text-[#8D7F72] mt-2 border-t border-[#E6DFD3]/50 pt-3">
                    {(() => {
                      const types: Record<string, number> = {};
                      let sum = 0;
                      assets.forEach(a => {
                        const val = a.amount * a.currentPrice;
                        types[a.type] = (types[a.type] || 0) + val;
                        sum += val;
                      });
                      const labels: Record<string, string> = {
                        crypto: 'کریپتو',
                        gold: 'طلا و فلزات',
                        stock: 'سهام',
                        currency: 'ارز فیزیکی',
                        real_estate: 'ملک و زمین',
                        other: 'سایر'
                      };
                      return Object.entries(types).map(([key, value], idx) => {
                        const pct = sum > 0 ? (value / sum) * 100 : 0;
                        return (
                          <div key={key} className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="font-bold text-[#2D3025]">{labels[key]}:</span>
                            <span className="font-mono">{Number(pct.toFixed(0)).toLocaleString('fa-IR')}٪</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[#8D7F72]">
                  اطلاعاتی برای نمایش وجود ندارد.
                </div>
              )}
            </div>

            {/* Form & Controls Container */}
            <div id="asset-form-anchor" className="lg:col-span-7 bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
                  <PlusCircle className="w-4 h-4 text-[#7C8363]" />
                  <span>{editingAssetId ? 'ویرایش دارایی انتخابی' : 'افزودن دارایی جدید به سبد'}</span>
                </h3>
                <button 
                  type="button"
                  onClick={() => {
                    setShowAssetForm(p => !p);
                    if (editingAssetId) {
                      setEditingAssetId(null);
                      setAssetName('');
                      setAssetSymbol('');
                      setAssetAmount('');
                      setAssetPurchasePrice('');
                      setAssetCurrentPrice('');
                      setAssetNotes('');
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#7C8363] border border-[#DDE2D5] rounded-xl hover:bg-[#E8ECE0] transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showAssetForm ? 'بستن فرم' : 'نمایش فرم دارایی'}
                </button>
              </div>

              {/* Form rendering */}
              <AnimatePresence>
                {showAssetForm && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <form onSubmit={handleSubmitAsset} className="bg-[#F9F6EE] p-4 rounded-xl border border-[#E6DFD3] space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#8D7F72]">نام دارایی (مثلاً بیت‌کوین، طلای ۱۸ عیار)</label>
                          <input 
                            type="text" 
                            value={assetName} 
                            onChange={e => setAssetName(e.target.value)} 
                            placeholder="نام دارایی" 
                            required
                            className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" 
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#8D7F72]">نماد یا اختصار (مثلاً BTC، USD، GOLD)</label>
                          <input 
                            type="text" 
                            value={assetSymbol} 
                            onChange={e => setAssetSymbol(e.target.value)} 
                            placeholder="نماد اختصاری" 
                            required
                            className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" 
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#8D7F72]">دسته‌بندی دارایی</label>
                          <select 
                            value={assetType} 
                            onChange={e => setAssetType(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16] text-right"
                          >
                            <option value="crypto">🪙 ارز دیجیتال (Crypto)</option>
                            <option value="gold">✨ طلا، سکه و فلزات گرانبها</option>
                            <option value="stock">📈 سهام بورس و صندوق‌ها</option>
                            <option value="currency">💵 ارزهای فیزیکی (دلار، یورو)</option>
                            <option value="real_estate">🏢 ملک، زمین و ساختمان</option>
                            <option value="other">💼 سایر دارایی‌ها</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#8D7F72]">مقدار موجودی (تعداد واحد)</label>
                          <input 
                            type="number" 
                            step="any" 
                            value={assetAmount} 
                            onChange={e => setAssetAmount(e.target.value)} 
                            placeholder="مثلاً ۰.۱۵ یا ۱۰" 
                            required
                            className="w-full text-left px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-extrabold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" 
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#8D7F72]">قیمت خرید هر واحد (تومان - اختیاری)</label>
                          <MoneyInput
                            value={assetPurchasePrice}
                            onChange={setAssetPurchasePrice}
                            placeholder="بهای تمام‌شده هر واحد"
                            className="py-2 rounded-xl border border-[#D6CFC3] text-xs focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#8D7F72]">قیمت فعلی بازار هر واحد (تومان)</label>
                          <MoneyInput
                            value={assetCurrentPrice}
                            onChange={setAssetCurrentPrice}
                            placeholder="قیمت روز بازار"
                            required
                            className="py-2 rounded-xl border border-[#D6CFC3] text-xs focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">یادداشت یا محل ذخیره‌سازی (اختیاری)</label>
                        <input 
                          type="text" 
                          value={assetNotes} 
                          onChange={e => setAssetNotes(e.target.value)} 
                          placeholder="مثلاً ذخیره در کیف پول لجر، صرافی نوبیتکس"
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" 
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button 
                          type="submit"
                          className="flex-1 py-2.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          {editingAssetId ? 'ذخیره تغییرات دارایی' : 'ثبت دارایی در سبد'}
                        </button>
                        {editingAssetId && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setEditingAssetId(null);
                              setAssetName('');
                              setAssetSymbol('');
                              setAssetAmount('');
                              setAssetPurchasePrice('');
                              setAssetCurrentPrice('');
                              setAssetNotes('');
                              setShowAssetForm(false);
                            }}
                            className="px-4 py-2.5 border border-[#E6DFD3] text-xs font-bold text-[#8D7F72] rounded-xl hover:bg-[#F9F6EE] transition-all cursor-pointer"
                          >
                            انصراف
                          </button>
                        )}
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {!showAssetForm && (
                <div className="text-center py-6 text-xs text-[#8D7F72] leading-relaxed bg-[#F9F6EE] border border-dashed border-[#D6CFC3] rounded-xl">
                  <span>با ثبت دارایی‌های خود مانند رمز ارز، طلا و سهام می‌توانید ارزش پورتفوی مالی خود را ردیابی کنید.</span>
                </div>
              )}
            </div>
          </div>

          {/* Filters and List */}
          <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] space-y-4">
            
            {/* Filter controls bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <h3 className="text-sm font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
                <SlidersHorizontal className="w-4 h-4 text-[#7C8363]" />
                <span>سبد دارایی‌های شما</span>
                <span className="text-[9px] text-[#8D7F72] bg-[#E6DFD3]/50 px-2.5 py-0.5 rounded-full font-bold">
                  {filteredAssets.length.toLocaleString('fa-IR')} دارایی فعال
                </span>
              </h3>
              
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Search input */}
                <div className="relative flex-1 md:flex-initial min-w-[150px]">
                  <Search className="w-3.5 h-3.5 text-[#9D978B] dark:text-[#7C8363] absolute right-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    value={assetSearch}
                    onChange={e => setAssetSearch(e.target.value)}
                    placeholder="جستجو نام یا نماد..."
                    className="w-full pl-3 pr-8 py-1.5 text-xs bg-[#F9F6EE] border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] text-right font-semibold"
                  />
                </div>

                {/* Filter buttons */}
                <div className="flex bg-[#E6DFD3]/50 p-0.5 rounded-xl text-[9px] font-bold">
                  {[
                    { id: 'all', label: 'همه' },
                    { id: 'crypto', label: 'کریپتو' },
                    { id: 'gold', label: 'طلا' },
                    { id: 'stock', label: 'سهام' },
                    { id: 'currency', label: 'ارز' },
                    { id: 'real_estate', label: 'ملک و زمین' },
                    { id: 'other', label: 'سایر' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setAssetTypeFilter(f.id)}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${assetTypeFilter === f.id ? 'bg-[#2D3025] text-white' : 'text-[#8D7F72] hover:text-[#2D3025]'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List of Asset Cards */}
            {filteredAssets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssets.map(a => {
                  const currentValue = a.amount * a.currentPrice;
                  const purchaseCost = a.amount * a.purchasePrice;
                  const profitLoss = currentValue - purchaseCost;
                  const pct = purchaseCost > 0 ? (profitLoss / purchaseCost) * 100 : 0;
                  
                  const isQuickUpdating = quickPrices[a.id] !== undefined;
                  const currentQuickVal = quickPrices[a.id] ?? String(a.currentPrice);
                  
                  const handleQuickPriceSubmit = (e: React.FormEvent) => {
                    e.preventDefault();
                    const newPrice = Number(currentQuickVal);
                    if (!isNaN(newPrice) && newPrice > 0) {
                      onUpdateAsset(a.id, {
                        ...a,
                        currentPrice: newPrice,
                        lastUpdated: todayDate
                      });
                      // remove active edit
                      const updatedQuickPrices = { ...quickPrices };
                      delete updatedQuickPrices[a.id];
                      setQuickPrices(updatedQuickPrices);
                    }
                  };

                  return (
                    <div key={a.id} className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3] hover:shadow-md transition-all flex flex-col justify-between space-y-3.5">
                      {/* Card Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            a.type === 'crypto' ? 'bg-[#E8ECE0] text-[#7C8363]' :
                            a.type === 'gold' ? 'bg-[#F9F1D8] text-[#D4AF37]' :
                            a.type === 'stock' ? 'bg-[#EAF2F8] text-[#2980B9]' :
                            a.type === 'currency' ? 'bg-[#EAF2F8] text-[#27AE60]' :
                            a.type === 'real_estate' ? 'bg-[#F4E9E4] text-[#9B6B61]' : 'bg-[#F9F6EE] dark:bg-[#1B1D16] text-[#8D7F72] dark:text-[#9D978B]'
                          }`}>
                            {a.type === 'crypto' ? <Coins className="w-4 h-4" /> :
                             a.type === 'gold' ? <Zap className="w-4 h-4" /> :
                             a.type === 'stock' ? <TrendingUp className="w-4 h-4" /> :
                             a.type === 'currency' ? <DollarSign className="w-4 h-4" /> :
                             a.type === 'real_estate' ? <Building2 className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-xs text-[#2D3025]">{a.name}</span>
                            <span className="text-[9px] font-mono font-bold text-[#8D7F72] block">{a.symbol}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button 
                            type="button"
                            onClick={() => handleEditAssetClick(a)}
                            className="p-1.5 text-[#8D7F72] hover:text-[#2D3025] hover:bg-[#E6DFD3] rounded-lg transition-all cursor-pointer"
                            title="ویرایش دارایی"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              if (confirm(`آیا از حذف دارایی "${a.name}" اطمینان دارید؟`)) {
                                onDeleteAsset(a.id);
                              }
                            }}
                            className="p-1.5 text-[#8D7F72] hover:text-[#9B6B61] hover:bg-[#F4E9E4] rounded-lg transition-all cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Financial values */}
                      <div className="bg-[#F9F6EE] p-3 rounded-xl space-y-2 border border-[#E6DFD3]/60">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-[#8D7F72] font-semibold">مقدار موجودی</span>
                          <span className="font-mono font-black text-[#2D3025]">{a.amount.toLocaleString('fa-IR')} <span className="font-sans text-[9px] font-bold text-[#8D7F72]">{a.symbol}</span></span>
                        </div>
                        
                        <div className="flex justify-between items-center text-[10px] border-t border-[#E6DFD3]/40 pt-1.5">
                          <span className="text-[#8D7F72] font-semibold">ارزش فعلی کل</span>
                          <span className="font-mono font-black text-[#7C8363] text-xs">{currentValue.toLocaleString('fa-IR')} <span className="font-sans text-[8px] font-normal text-[#8D7F72]">تومان</span></span>
                        </div>

                        <div className="flex justify-between items-center text-[9px] border-t border-[#E6DFD3]/40 pt-1.5">
                          <span className="text-[#8D7F72] font-semibold">سود / زیان</span>
                          <span className={`font-mono font-bold ${profitLoss >= 0 ? 'text-[#7C8363]' : 'text-[#9B6B61]'}`}>
                            {profitLoss >= 0 ? '+' : ''}{profitLoss.toLocaleString('fa-IR')} ({Number(pct.toFixed(1)).toLocaleString('fa-IR')}٪)
                          </span>
                        </div>

                        {a.notes && (
                          <div className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] bg-white/40 p-1.5 rounded border border-[#E6DFD3]/30 font-semibold text-right">
                            📝 {a.notes}
                          </div>
                        )}
                      </div>

                      {/* Linked documents list */}
                      {(() => {
                        const linkedDocs = documents.filter(doc => doc.linkedAssetId === a.id);
                        if (linkedDocs.length === 0) return null;
                        return (
                          <div className="space-y-1 bg-[#F9F6EE] p-2.5 rounded-xl border border-[#E6DFD3]/60">
                            <span className="text-[9px] font-bold text-[#8D7F72] block mb-1">اسناد مرتبط ({linkedDocs.length.toLocaleString('fa-IR')} سند)</span>
                            <div className="space-y-1">
                              {linkedDocs.map(doc => (
                                <div key={doc.id} className="flex items-center gap-1.5 bg-[#FDFBF7] dark:bg-[#1B1D16] px-2 py-1 rounded-lg border border-[#D6CFC3]/40 text-[9px] text-[#2D3025] font-semibold">
                                  <span className="text-[10px]">📄</span>
                                  <span className="truncate flex-1">{doc.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Price Quick-Update Section */}
                      <div className="border-t border-[#E6DFD3]/60 pt-2.5">
                        <form onSubmit={handleQuickPriceSubmit} className="flex gap-1.5 items-center">
                          <div className="flex-1">
                            <span className="text-[8px] font-black text-[#8D7F72] block mb-1">بروزرسانی قیمت واحد (تومان)</span>
                            <input 
                              type="number"
                              value={currentQuickVal}
                              onChange={e => {
                                setQuickPrices({
                                  ...quickPrices,
                                  [a.id]: e.target.value
                                });
                              }}
                              className="w-full text-left font-mono font-bold text-xs bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#D6CFC3] rounded-lg px-2 py-1 focus:outline-none focus:border-[#7C8363]"
                            />
                          </div>
                          <button 
                            type="submit"
                            disabled={!isQuickUpdating}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold self-end transition-all ${
                              isQuickUpdating 
                                ? 'bg-[#2D3025] text-white cursor-pointer hover:bg-[#7C8363]' 
                                : 'bg-[#E6DFD3]/40 text-[#8D7F72] cursor-not-allowed'
                            }`}
                          >
                            ثبت قیمت
                          </button>
                        </form>
                        <div className="text-[8px] text-[#9D978B] dark:text-[#7C8363] font-bold mt-1 text-left font-mono">
                          آخرین بروزرسانی: {a.lastUpdated || '—'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-2xl bg-[#FDFBF7]">
                <Coins className="w-8 h-8 text-[#7C8363] mx-auto mb-2 opacity-60 animate-bounce" />
                <span>هیچ دارایی یا رمز ارزی در سبد شما ثبت نشده است!</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TRANSACTION DETAIL / EDIT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {detailTx && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={()=>setDetailTx(null)}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}}
              className="bg-[#FDFBF7] rounded-3xl shadow-xl border border-[#E6DFD3] w-full max-w-md p-6 space-y-4"
              onClick={e=>e.stopPropagation()}>

              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-[#2D3025] font-serif-elegant flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#7C8363]" />
                  {txEditMode ? 'ویرایش تراکنش' : 'جزئیات تراکنش'}
                </h2>
                <div className="flex items-center gap-1">
                  {!txEditMode && (
                    <button onClick={()=>setTxEditMode(true)}
                      className="p-1.5 text-[#8D7F72] hover:text-[#2D3025] hover:bg-[#E6DFD3] rounded-lg transition-all cursor-pointer">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={()=>setDetailTx(null)}
                    className="p-1.5 text-[#8D7F72] hover:text-[#9B6B61] hover:bg-[#F4E9E4] rounded-lg transition-all cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {txEditMode ? (
                <div className="space-y-3">
                  <div className="flex bg-[#E6DFD3] p-0.5 rounded-xl">
                    {(['expense','income','transfer'] as const).map(t=>(
                      <button key={t} type="button" onClick={()=>{
                        setEditTxType(t);
                        // sync category to a valid one for the new type
                        const validCats = categories.filter(c=>c.type===t);
                        if (validCats.length>0 && !validCats.find(c=>c.id===editTxCat)) {
                          setEditTxCat(validCats[0].id);
                          setEditTxSub(validCats[0].subcategories[0]||'');
                        }
                      }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${editTxType===t?'bg-[#FDFBF7] text-[#2D3025] shadow-xs':'text-[#8D7F72]'}`}>
                        {t==='expense'?'هزینه':t==='income'?'درآمد':'انتقال وجه'}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-[#8D7F72]">مبلغ (تومان)</label>
                    <MoneyInput value={editTxAmt} onChange={setEditTxAmt}
                      className="py-2 rounded-xl border border-[#D6CFC3] text-sm focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                  </div>
                  
                  {editTxType !== 'transfer' && (
                    <>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-[#8D7F72]">دسته‌بندی</label>
                        <select value={editTxCat} onChange={e=>{
                          setEditTxCat(e.target.value);
                          const cat = categories.find(c=>c.id===e.target.value);
                          setEditTxSub(cat?.subcategories[0]||'');
                        }}
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]">
                          {categories.filter(c=>c.type===editTxType).map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                        </select>
                      </div>
                      {(() => { const editCatObj = categories.find(c=>c.id===editTxCat); return editCatObj&&editCatObj.subcategories.length>0 ? (
                        <div className="space-y-1"><label className="text-[10px] font-bold text-[#8D7F72]">زیردسته</label>
                          <select value={editTxSub} onChange={e=>setEditTxSub(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]">
                            <option value="">بدون زیردسته</option>
                            {editCatObj.subcategories.map(s=><option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      ) : null; })()}
                    </>
                  )}

                  <div className="space-y-1"><label className="text-[10px] font-bold text-[#8D7F72]">توضیح</label>
                    <input value={editTxDesc} onChange={e=>setEditTxDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]" />
                  </div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-[#8D7F72]">تاریخ</label>
                    <PersianDatePicker value={editTxDate} onChange={setEditTxDate} />
                  </div>
                  
                  {bankAccounts.length > 0 && (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">
                          {editTxType === 'transfer' ? 'حساب مبدأ (برداشت وجه)' : 'حساب بانکی مرتبط (بروزرسانی موجودی)'}
                        </label>
                        <select value={editTxBank} onChange={e=>setEditTxBank(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]">
                          <option value="">-- بدون حساب بانکی (نقدی) --</option>
                          {bankAccounts.map(b=>(
                            <option key={b.id} value={b.id}>{b.bankName} ({b.accountName})</option>
                          ))}
                        </select>
                      </div>

                      {editTxType === 'transfer' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#4A6B82]">حساب مقصد (واریز وجه)</label>
                          <select value={editTxToBank} onChange={e=>setEditTxToBank(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-[#FDFBF7] dark:bg-[#1B1D16]">
                            <option value="">-- انتخاب حساب مقصد --</option>
                            {bankAccounts.map(b=>(
                              <option key={b.id} value={b.id}>{b.bankName} ({b.accountName})</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSaveEditTx}
                      className="flex-1 py-2.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                      <Save className="w-4 h-4" />ذخیره تغییرات
                    </button>
                    <button onClick={()=>setTxEditMode(false)}
                      className="px-4 py-2.5 border border-[#E6DFD3] text-xs font-bold text-[#8D7F72] rounded-xl hover:bg-[#F9F6EE] transition-all cursor-pointer">
                      انصراف
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${detailTx.type==='income'?'bg-[#E8ECE0] border-[#DDE2D5] text-[#7C8363]':detailTx.type==='expense'?'bg-[#F4E9E4] border-[#EDDDD7] text-[#9B6B61]':'bg-[#EAF2F8] border-[#A9CCE3] text-[#2980B9]'}`}>
                    {detailTx.type==='income'?<TrendingUp className="w-3.5 h-3.5"/>:detailTx.type==='expense'?<TrendingDown className="w-3.5 h-3.5"/>:<ArrowLeftRight className="w-3.5 h-3.5" />}
                    {detailTx.type==='income'?'درآمد':detailTx.type==='expense'?'هزینه':'انتقال وجه بین حساب‌ها'}
                  </div>
                  <div className="bg-[#F9F1D8] border border-[#EBE3C8] rounded-2xl p-4 text-center">
                    <span className="text-[10px] text-[#8D7F72] font-semibold block">مبلغ</span>
                    <div className={`text-3xl font-black font-mono mt-1 ${detailTx.type==='income'?'text-[#7C8363]':detailTx.type==='expense'?'text-[#9B6B61]':'text-[#2980B9]'}`}>
                      {detailTx.type==='income'?'+':detailTx.type==='expense'?'-':'🔄'}{detailTx.amount.toLocaleString('fa-IR')}
                      <span className="text-sm font-normal text-[#8D7F72]"> تومان</span>
                    </div>
                  </div>
                  {[
                    ['توضیح', detailTx.description],
                    ...(detailTx.type === 'transfer' ? [
                      ['حساب مبدأ (برداشت)', bankAccounts.find(b=>b.id===detailTx.bankAccountId)?.bankName || '—'],
                      ['حساب مقصد (واریز)', bankAccounts.find(b=>b.id===detailTx.toBankAccountId)?.bankName || '—'],
                    ] : [
                      ['دسته‌بندی', getCategoryName(detailTx.category)],
                      ['زیردسته', detailTx.subcategory||'—'],
                      ['حساب بانکی', bankAccounts.find(b=>b.id===detailTx.bankAccountId)?.bankName || '—']
                    ]),
                    ['تاریخ', detailTx.date],
                  ].map(([label,val])=>(
                    <div key={label} className="flex justify-between items-center py-2 border-b border-[#E6DFD3]/50 last:border-0">
                      <span className="text-[10px] font-bold text-[#8D7F72]">{label}</span>
                      <span className="text-xs font-bold text-[#2D3025] font-mono">{val}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button onClick={()=>setTxEditMode(true)}
                      className="flex-1 py-2.5 bg-[#2D3025] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                      <Edit2 className="w-4 h-4" />ویرایش
                    </button>
                    <button onClick={()=>{onDeleteTransaction(detailTx.id);setDetailTx(null);}}
                      className="flex-1 py-2.5 bg-[#9B6B61] hover:bg-[#7C5048] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                      <Trash2 className="w-4 h-4" />حذف
                    </button>
                  </div>
                </div>
              )}

              {/* Linked Contacts */}
              {detailTx.id && !txEditMode && (
                <div className="border-t border-[#E6DFD3]/60 pt-3 mt-2">
                  <LinkedContacts entityType="finance" entityId={detailTx.id} contacts={contacts} onNavigateContact={onNavigateContact} />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
