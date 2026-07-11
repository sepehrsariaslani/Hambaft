import React, { useState } from 'react';
import { Transaction, CategoryDef } from '../types';
import { 
  Plus, 
  Trash2, 
  Tag, 
  PieChart as PieIcon, 
  FolderPlus, 
  ListCollapse, 
  Coins, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PlusCircle, 
  FolderHeart, 
  LineChart, 
  Activity,
  AlertCircle,
  HelpCircle,
  FolderOpen
} from 'lucide-react';
import { motion } from 'motion/react';

// Persian digit converter helper
function toPersianDigits(num: number | string): string {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, x => farsiDigits[parseInt(x)]);
}

interface FinanceCategoryDashboardProps {
  categories: CategoryDef[];
  transactions: Transaction[];
  onAddCategory: (cat: Omit<CategoryDef, 'id'>) => void;
  onDeleteCategory: (id: string) => void;
  onAddSubcategory: (catId: string, subName: string) => void;
  onDeleteSubcategory: (catId: string, subName: string) => void;
}

export default function FinanceCategoryDashboard({
  categories,
  transactions,
  onAddCategory,
  onDeleteCategory,
  onAddSubcategory,
  onDeleteSubcategory
}: FinanceCategoryDashboardProps) {
  // Tabs and view states
  const [activeCategoryTab, setActiveCategoryTab] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categories[0]?.id || 'food');
  const [newSubcategoryName, setNewSubcategoryName] = useState<Record<string, string>>({});
  
  // New Category form state
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'expense' | 'income'>('expense');
  const [catColor, setCatColor] = useState('#7C8363');
  const [catIcon, setCatIcon] = useState('🛍️');
  const [catSubList, setCatSubList] = useState<string>('');
  const [showAddCatForm, setShowAddCatForm] = useState(false);

  // Filter categories
  const filteredCategories = categories.filter(c => {
    if (activeCategoryTab === 'all') return true;
    return c.type === activeCategoryTab;
  });

  // Calculate statistics per category
  const getCategoryStats = (catId: string) => {
    const catTransactions = transactions.filter(t => t.category === catId);
    const totalAmount = catTransactions.reduce((sum, t) => sum + t.amount, 0);
    const count = catTransactions.length;
    
    // Group by subcategory
    const subcategoryTotals: Record<string, number> = {};
    catTransactions.forEach(t => {
      const sub = t.subcategory || 'سایر موارد';
      subcategoryTotals[sub] = (subcategoryTotals[sub] || 0) + t.amount;
    });

    return {
      totalAmount,
      count,
      subcategoryTotals
    };
  };

  const totalExpenseTransactions = transactions.filter(t => t.type === 'expense');
  const overallExpenseSum = totalExpenseTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Emojis for selection
  const emojiPresets = ['🍔', '🏠', '🚗', '🎬', '💊', '🎓', '🛍️', '💵', '💼', '📈', '✨', '✈️', '🎮', '🏋️', '🐈', '🎁', '📱'];
  const colorPresets = ['#7C8363', '#9B6B61', '#8D7F72', '#5A5A40', '#D4AF37', '#EDDDD7', '#E26645', '#9F7AEA', '#4299E1', '#48BB78'];

  // Handle Add Category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    // Split subcategories by comma or enter
    const subs = catSubList
      .split(/[,،\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    onAddCategory({
      name: catName.trim(),
      type: catType,
      subcategories: subs.length > 0 ? subs : ['سایر موارد'],
      color: catColor,
      icon: catIcon
    });

    // Reset fields
    setCatName('');
    setCatSubList('');
    setShowAddCatForm(false);
  };

  // Handle Add Subcategory
  const handleCreateSubcategory = (catId: string) => {
    const name = newSubcategoryName[catId];
    if (!name || !name.trim()) return;

    onAddSubcategory(catId, name.trim());
    setNewSubcategoryName(prev => ({ ...prev, [catId]: '' }));
  };

  // Active Category details mapping
  const activeCategoryObject = categories.find(c => c.id === selectedCategory) || categories[0];
  const activeCategoryStats = activeCategoryObject ? getCategoryStats(activeCategoryObject.id) : null;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Header Panel */}
      <div className="bg-gradient-to-br from-[#FDFBF7] to-[#F9F6EE] p-5 rounded-3xl border border-[#EBE3C8] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
            <FolderHeart className="w-5 h-5 text-[#7C8363]" />
            <span>مدیریت دسته‌ها و آنالیز مخارج</span>
          </h2>
          <p className="text-[10px] text-[#8D7F72] font-semibold mt-1">
            دسته‌بندی‌های اختصاصی خود را بسازید، زیردسته‌ها را مدیریت کنید و مخارج را با جزئیات دنبال کنید.
          </p>
        </div>
        
        <button
          onClick={() => setShowAddCatForm(!showAddCatForm)}
          className="px-4 py-2 bg-[#2D3025] hover:bg-[#5A5A40] text-white text-[11px] font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <FolderPlus className="w-4 h-4" />
          <span>{showAddCatForm ? 'بستن فرم' : 'تعریف دسته جدید'}</span>
        </button>
      </div>

      {/* NEW CATEGORY FORM (EXPANDABLE) */}
      {showAddCatForm && (
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FDFBF7] p-6 rounded-3xl border border-[#7C8363] shadow-md space-y-4"
        >
          <h3 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5 font-serif-elegant border-b border-[#E6DFD3] pb-2">
            <PlusCircle className="w-4 h-4 text-[#7C8363]" />
            <span>ایجاد دسته‌بندی و زیردسته‌های جدید</span>
          </h3>

          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left Column: Core Settings */}
              <div className="space-y-3.5">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">نام دسته‌بندی</label>
                  <input
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="مثال: هزینه خودرو، قبض‌ها، آرایشی"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D6CFC3] text-xs font-bold text-[#3D3D3D] focus:outline-none focus:border-[#7C8363] bg-white"
                    required
                  />
                </div>

                {/* Type toggle */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">نوع تراکنش مربوطه</label>
                  <div className="flex bg-[#E6DFD3]/40 p-1 rounded-xl border border-[#E6DFD3]">
                    <button
                      type="button"
                      onClick={() => setCatType('expense')}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer ${
                        catType === 'expense'
                          ? 'bg-[#9B6B61] text-white shadow-xs'
                          : 'text-[#8D7F72] hover:text-[#2D3025]'
                      }`}
                    >
                      هزینه و مخارج
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatType('income')}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer ${
                        catType === 'income'
                          ? 'bg-[#7C8363] text-white shadow-xs'
                          : 'text-[#8D7F72] hover:text-[#2D3025]'
                      }`}
                    >
                      درآمد و سود
                    </button>
                  </div>
                </div>

                {/* Color presets selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#8D7F72]">رنگ تم دسته</label>
                  <div className="flex flex-wrap gap-2">
                    {colorPresets.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCatColor(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                          catColor === color ? 'scale-110 border-black' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Icon presets selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#8D7F72]">آیکون / ایموجی دسته</label>
                  <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto p-1 bg-white border border-[#D6CFC3] rounded-xl">
                    {emojiPresets.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setCatIcon(emoji)}
                        className={`w-7 h-7 text-sm rounded-lg hover:bg-[#E8ECE0] flex items-center justify-center transition-colors cursor-pointer ${
                          catIcon === emoji ? 'bg-[#E6DFD3] scale-105 border border-[#7C8363]' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Subcategories initial list */}
              <div className="space-y-3.5 flex flex-col justify-between">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72] flex justify-between">
                    <span>لیست زیردسته‌ها (با کاما یا اینتر جدا کنید)</span>
                    <span className="text-[8px] text-[#5A5A40]">اختیاری</span>
                  </label>
                  <textarea
                    rows={5}
                    value={catSubList}
                    onChange={(e) => setCatSubList(e.target.value)}
                    placeholder="مثال:&#10;مکانیک خودرو&#10;کارواش و تمیزی&#10;خرید بنزین"
                    className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold text-[#3D3D3D] focus:outline-none focus:border-[#7C8363] resize-none bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت دسته بندی جدید در سیستم</span>
                </button>
              </div>

            </div>
          </form>
        </motion.div>
      )}

      {/* MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SIDEBAR: Category Selector List */}
        <div className="space-y-4">
          <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3] space-y-3">
            <h3 className="text-xs font-bold text-[#2D3025] font-serif-elegant">فیلتر تراکنش‌ها</h3>
            
            {/* Filter Pill switches */}
            <div className="flex bg-[#E6DFD3]/40 p-0.5 rounded-lg border border-[#E6DFD3]/60 text-[9px] font-bold">
              <button
                onClick={() => setActiveCategoryTab('all')}
                className={`flex-1 py-1 rounded text-center transition-all cursor-pointer ${
                  activeCategoryTab === 'all' ? 'bg-[#2D3025] text-white' : 'text-[#8D7F72]'
                }`}
              >
                همه دسته‌ها
              </button>
              <button
                onClick={() => setActiveCategoryTab('expense')}
                className={`flex-1 py-1 rounded text-center transition-all cursor-pointer ${
                  activeCategoryTab === 'expense' ? 'bg-[#9B6B61] text-white' : 'text-[#8D7F72]'
                }`}
              >
                مخارج
              </button>
              <button
                onClick={() => setActiveCategoryTab('income')}
                className={`flex-1 py-1 rounded text-center transition-all cursor-pointer ${
                  activeCategoryTab === 'income' ? 'bg-[#7C8363] text-white' : 'text-[#8D7F72]'
                }`}
              >
                درآمدها
              </button>
            </div>

            {/* List scroll container */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5">
              {filteredCategories.map(cat => {
                const stats = getCategoryStats(cat.id);
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full p-3 rounded-xl border text-right transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-[#2D3025] text-white border-[#2D3025] shadow-xs scale-[1.01]'
                        : 'bg-[#F9F6EE]/60 hover:bg-[#E8ECE0]/30 text-[#3D3D3D] border-[#E6DFD3]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon || '✨'}</span>
                      <div>
                        <span className="text-xs font-bold block">{cat.name}</span>
                        <span className={`text-[8px] font-semibold px-1 rounded-sm ${
                          cat.type === 'expense' 
                            ? isSelected ? 'bg-[#9B6B61] text-white' : 'bg-red-50 text-red-700'
                            : isSelected ? 'bg-[#7C8363] text-white' : 'bg-green-50 text-green-700'
                        }`}>
                          {cat.type === 'expense' ? 'هزینه' : 'درآمد'} ({toPersianDigits(cat.subcategories.length)} زیردسته)
                        </span>
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <span className="text-[11px] font-bold block">
                        {toPersianDigits(stats.totalAmount.toLocaleString('fa-IR'))}
                      </span>
                      <span className="text-[8px] opacity-70">تومان</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* MAIN PANEL: Category Breakdown & Interactive Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {activeCategoryObject ? (
            <div className="bg-[#FDFBF7] p-6 rounded-3xl border border-[#E6DFD3] space-y-6">
              
              {/* Category Card Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E6DFD3]/60 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs"
                    style={{ backgroundColor: `${activeCategoryObject.color}20`, border: `1px solid ${activeCategoryObject.color}40` }}
                  >
                    {activeCategoryObject.icon || '🛍️'}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#2D3025] flex items-center gap-2 font-serif-elegant">
                      <span>آنالیز دسته {activeCategoryObject.name}</span>
                      {activeCategoryObject.id !== 'food' && 
                       activeCategoryObject.id !== 'rent' && 
                       activeCategoryObject.id !== 'transport' && 
                       activeCategoryObject.id !== 'salary' && (
                        <button
                          onClick={() => {
                            if (confirm(`آیا از حذف دسته بندی "${activeCategoryObject.name}" اطمینان دارید؟`)) {
                              onDeleteCategory(activeCategoryObject.id);
                              setSelectedCategory(categories[0]?.id || null);
                            }
                          }}
                          className="text-red-700/60 hover:text-red-700 p-1 rounded-md hover:bg-red-50"
                          title="حذف کامل این دسته‌بندی"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 text-[9px] text-[#8D7F72] font-semibold mt-1">
                      <span>کل تراکنش‌ها: {toPersianDigits(activeCategoryStats?.count || 0)} مورد</span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.5 rounded-full ${activeCategoryObject.type === 'expense' ? 'bg-[#F4E9E4] text-[#9B6B61]' : 'bg-[#E8ECE0] text-[#7C8363]'}`}>
                        نوع: {activeCategoryObject.type === 'expense' ? 'هزینه‌ای' : 'درآمدی'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Massive statistics visual value */}
                <div className="text-left font-serif-elegant">
                  <span className="text-[10px] text-[#8D7F72] font-semibold block">مجموع مبلغ ثبت‌شده</span>
                  <div className="text-xl font-black text-[#2D3025] font-mono leading-none mt-1">
                    {toPersianDigits((activeCategoryStats?.totalAmount || 0).toLocaleString('fa-IR'))} <span className="text-xs font-normal text-[#8D7F72]">تومان</span>
                  </div>
                  {activeCategoryObject.type === 'expense' && overallExpenseSum > 0 && (
                    <span className="text-[9px] text-[#8D7F72] font-bold block mt-1 bg-[#F9F1D8] px-2 py-0.5 rounded-md border border-[#EBE3C8]/40">
                      سهم از کل مخارج: {toPersianDigits(Math.round(((activeCategoryStats?.totalAmount || 0) / overallExpenseSum) * 100))}%
                    </span>
                  )}
                </div>
              </div>

              {/* Subcategories Breakdown visual bar */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-[#2D3025] flex items-center gap-1.5 font-serif-elegant">
                    <ListCollapse className="w-4 h-4 text-[#8D7F72]" />
                    <span>جزئیات مخارج به تفکیک زیردسته‌ها</span>
                  </h4>
                  <span className="text-[8px] text-[#8D7F72] font-bold">بخش‌بندی داخلی</span>
                </div>

                {activeCategoryObject.subcategories.length > 0 ? (
                  <div className="space-y-3 bg-[#F9F6EE] p-4 rounded-2xl border border-[#E6DFD3]/50">
                    {activeCategoryObject.subcategories.map(sub => {
                      const amount = activeCategoryStats?.subcategoryTotals[sub] || 0;
                      const percentage = activeCategoryStats?.totalAmount && activeCategoryStats.totalAmount > 0
                        ? Math.round((amount / activeCategoryStats.totalAmount) * 100)
                        : 0;

                      return (
                        <div key={sub} className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#2D3025]">{sub}</span>
                              {activeCategoryObject.subcategories.length > 1 && (
                                <button
                                  onClick={() => onDeleteSubcategory(activeCategoryObject.id, sub)}
                                  className="text-[#8D7F72] hover:text-red-700 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity p-0.5"
                                  title="حذف این زیردسته"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <div className="font-mono font-bold text-[#8D7F72] flex items-center gap-1.5">
                              <span>{toPersianDigits(amount.toLocaleString('fa-IR'))} تومان</span>
                              <span className="text-[8px] bg-white border border-[#E6DFD3] px-1.5 py-0.5 rounded text-[#2D3025]">{toPersianDigits(percentage)}%</span>
                            </div>
                          </div>

                          {/* Progress bar line */}
                          <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-[#E6DFD3]/40">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${percentage}%`, 
                                backgroundColor: activeCategoryObject.color || '#7C8363'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-xl">
                    هیچ زیردسته‌ای ثبت نشده است. از فرم زیر یکی اضافه کنید.
                  </div>
                )}
              </div>

              {/* QUICK ADD SUBCATEGORY FORM */}
              <div className="bg-[#F9F6EE] p-4 rounded-2xl border border-[#E6DFD3] flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-bold text-[#8D7F72]">
                  <Tag className="w-3.5 h-3.5 text-[#7C8363]" />
                  <span>افزودن زیردسته جدید به {activeCategoryObject.name}:</span>
                </div>
                <div className="flex-1 flex gap-2 w-full">
                  <input
                    type="text"
                    value={newSubcategoryName[activeCategoryObject.id] || ''}
                    onChange={(e) => setNewSubcategoryName(prev => ({ ...prev, [activeCategoryObject.id]: e.target.value }))}
                    placeholder="مثال: تنقلات، تعمیر گاز، بنزین..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-[#D6CFC3] text-xs font-semibold focus:outline-none bg-white"
                  />
                  <button
                    onClick={() => handleCreateSubcategory(activeCategoryObject.id)}
                    className="px-3 py-1.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-[10px] font-black rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تایید</span>
                  </button>
                </div>
              </div>

              {/* TRANSACTION LIST FOR ACTIVE CATEGORY */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-[#2D3025] flex items-center gap-1.5 font-serif-elegant border-b border-[#E6DFD3]/40 pb-2">
                  <FolderOpen className="w-4 h-4 text-[#7C8363]" />
                  <span>تراکنش‌های ثبت شده در این دسته</span>
                </h4>

                {transactions.filter(t => t.category === activeCategoryObject.id).length > 0 ? (
                  <div className="overflow-x-auto max-h-[220px] overflow-y-auto bg-white rounded-2xl border border-[#E6DFD3]/50">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E6DFD3] text-[#8D7F72] font-bold bg-[#F9F6EE]/40 sticky top-0">
                          <th className="p-3 pr-4">توضیح</th>
                          <th className="p-3">زیردسته</th>
                          <th className="p-3">تاریخ</th>
                          <th className="p-3 text-left pl-4">مبلغ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6DFD3]/40">
                        {transactions
                          .filter(t => t.category === activeCategoryObject.id)
                          .slice()
                          .reverse()
                          .map(t => (
                            <tr key={t.id} className="hover:bg-[#E8ECE0]/20 transition-colors">
                              <td className="p-3 pr-4 font-bold text-[#2D3025]">{t.description}</td>
                              <td className="p-3">
                                <span className="bg-[#E6DFD3]/45 border border-[#E6DFD3]/60 text-[9px] px-2 py-0.5 rounded-md font-semibold text-[#8D7F72]">
                                  {t.subcategory || 'سایر موارد'}
                                </span>
                              </td>
                              <td className="p-3 text-[#8D7F72] font-semibold font-mono">{toPersianDigits(t.date)}</td>
                              <td className={`p-3 text-left pl-4 font-extrabold font-mono ${
                                t.type === 'income' ? 'text-[#7C8363]' : 'text-[#9B6B61]'
                              }`}>
                                {t.type === 'income' ? '+' : '-'}{toPersianDigits(t.amount.toLocaleString('fa-IR'))}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-[#8D7F72] bg-[#F9F6EE]/40 rounded-2xl border border-dashed border-[#D6CFC3]">
                    هنوز هیچ تراکنشی برای دسته بندی "{activeCategoryObject.name}" ثبت نشده است.
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#8D7F72] bg-[#FDFBF7] border border-[#E6DFD3] rounded-3xl">
              دسته‌بندی خاصی یافت نشد. لطفاً از دکمه "تعریف دسته جدید" در بالا استفاده کنید.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
