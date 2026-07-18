import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LifeData } from '../types';
import { 
  Sparkles, 
  Send, 
  HelpCircle, 
  MessageSquare, 
  TrendingUp, 
  Target, 
  Flame, 
  Download, 
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  ChevronRight,
  Clock,
  Archive
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  aiCoachChat, 
  getAiConversations, 
  getAiConversationMessages, 
  deleteAiConversation 
} from '../../app/hambaft-api';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface ConversationSummary {
  name: string;
  title: string;
  ai_type: string;
  status: string;
  started_at: string;
  last_message_at: string;
}

interface AiCoachSectionProps {
  lifeData: LifeData;
  onImportData: (data: LifeData) => void;
}

export default function AiCoachSection({ lifeData, onImportData }: AiCoachSectionProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-init-1',
      role: 'model',
      text: `سلام دوست من! خوشحالم که در مسیر رشد و انضباط فردی در کنارت هستم.

من **«یار»**، مربی توسعه فردی هوشمند شما هستم. من می‌توانم به صورت زنده تمام بخش‌های زندگیتان را تحلیل کنم:
- **امور مالی**: بودجه‌بندی، کاهش هزینه‌ها و هوش مالی
- **عادت‌ها**: حفظ استمرار، تکنیک‌های انگیزش و افزایش زنجیره
- **هدف‌ها**: شکستن اهداف بزرگ به گام‌های کوچک و عملی
- **یادداشت‌ها**: تحلیل حال و هوای روحی شما و ارائه شکرگزاری

یک سوال بپرسید یا یکی از تحلیل‌های آماده زیر را انتخاب کنید تا با هم بررسی کنیم:`,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load conversation list on mount
  const loadConversations = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const resp = await getAiConversations(30);
      const list = (resp as any)?.data?.conversations || [];
      setConversations(list);
    } catch (e) {
      console.error('loadConversations error:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load a past conversation
  const openConversation = useCallback(async (convId: string) => {
    try {
      setIsLoading(true);
      const resp = await getAiConversationMessages(convId);
      const data = (resp as any)?.data;
      if (data?.messages) {
        const loaded: Message[] = data.messages.map((m: any) => ({
          id: m.name || `msg-${Date.now()}-${Math.random()}`,
          role: m.role as 'user' | 'model',
          text: m.content,
          timestamp: m.timestamp || new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        }));
        // Prepend welcome message if conversation has content
        setMessages([
          {
            id: 'm-init-loaded',
            role: 'model',
            text: '🔄 مکالمه قبلی بارگذاری شد. ادامه بدهید:',
            timestamp: loaded[0]?.timestamp || new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
          },
          ...loaded,
        ]);
        setConversationId(convId);
        setShowHistory(false);
      }
    } catch (e) {
      console.error('openConversation error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start a new conversation
  const startNewConversation = useCallback(() => {
    setMessages([
      {
        id: `m-init-${Date.now()}`,
        role: 'model',
        text: `مکالمه جدید شروع شد. چطور می‌توانم کمکتان کنم؟`,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setConversationId(null);
  }, []);

  // Delete a conversation
  const handleDeleteConversation = useCallback(async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('این مکالمه حذف شود؟')) return;
    try {
      await deleteAiConversation(convId);
      setConversations(prev => prev.filter(c => c.name !== convId));
      if (conversationId === convId) {
        startNewConversation();
      }
    } catch (err) {
      console.error('deleteConversation error:', err);
    }
  }, [conversationId, startNewConversation]);

  const sendMessageToApi = async (userPrompt: string) => {
    setIsLoading(true);
    
    // Add user message to UI
    const newUserMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: userPrompt,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };
    
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);

    try {
      // Map message history to CJS style expected by Gemini route
      // exclude first welcome message to keep payload clean
      const chatHistory = updatedMessages
        .slice(1, -1) // All except initial welcoming and the very last user message
        .map(m => ({
          role: m.role,
          text: m.text
        }));

      const payload = await aiCoachChat(userPrompt, chatHistory, lifeData, conversationId);
      const data = payload?.data || payload;

      if (data?.conversation_id) {
        setConversationId(data.conversation_id);
        // Refresh conversation list in background
        loadConversations();
      }

      if (data?.text) {
        const newAiMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'model',
          text: data.text,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, newAiMsg]);
      } else {
        throw new Error('خطای سرور');
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg: Message = {
        id: `msg-err-${Date.now()}`,
        role: 'model',
        text: `⚠️ متاسفم دوست من، ارتباطم با سرور هوش مصنوعی قطع شد. \n\nعلت خطا: ${err.message || 'مشکل در سرور یار'}.\nلطفاً اتصال اینترنت خود را چک کرده و بار دیگر تلاش کنید.`,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const prompt = inputText.trim();
    setInputText('');
    sendMessageToApi(prompt);
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    sendMessageToApi(prompt);
  };

  // Data Export Feature
  const handleExportData = () => {
    const dataStr = JSON.stringify(lifeData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `life-organizer-backup-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Data Import Feature
  const handleImportDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          // Simple validation
          if (parsed.transactions && parsed.habits && parsed.goals) {
            onImportData(parsed);
            alert('پشتیبان با موفقیت بازیابی شد!');
          } else {
            alert('فرمت فایل نامعتبر است. فایل پشتیبان معتبر انتخاب کنید.');
          }
        } catch (err) {
          alert('خطا در خواندن فایل پشتیبان.');
        }
      };
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Top Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar Panel: Actions and Utilities (1 Col) */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Yar Coach Card Info */}
          <div className="bg-[#2D3025] p-6 rounded-2xl border border-[#3D4233] text-white flex flex-col items-center text-center space-y-3.5 shadow-md">
            <div className="w-16 h-16 bg-gradient-to-tr from-[#7C8363] to-[#C8B195] rounded-2xl flex items-center justify-center text-3xl shadow-lg relative border border-[#5A5A40]">
              <span>🌿</span>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-[#7C8363] rounded-full border-2 border-[#2D3025]" title="یار آنلاین است"></div>
            </div>

            <div>
              <h3 className="font-bold text-sm md:text-base font-serif-elegant">یار هوشمند</h3>
              <p className="text-[10px] text-[#C4BBAF] font-semibold">مربی و تحلیل‌گر تخصصی توسعه فردی</p>
            </div>

            <div className="w-full border-t border-[#3D4233] pt-3 flex flex-col gap-2 text-[11px]">
              <div className="flex justify-between text-[#C4BBAF]">
                <span>مدل پردازش:</span>
                <span className="font-bold text-[#E6DFD3] font-mono">Gemini 3.5</span>
              </div>
              <div className="flex justify-between text-[#C4BBAF]">
                <span>دسترسی به داده‌ها:</span>
                <span className="text-[#7C8363] font-bold">فعال (مالی/عادت‌ها)</span>
              </div>
              {conversationId && (
                <div className="flex justify-between text-[#C4BBAF]">
                  <span>شناسه مکالمه:</span>
                  <span className="font-bold text-[#E6DFD3] font-mono text-[9px]">{conversationId.slice(0, 8)}…</span>
                </div>
              )}
            </div>
          </div>

          {/* New Conversation Button */}
          <button
            onClick={startNewConversation}
            className="w-full py-2.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>مکالمه جدید</span>
          </button>

          {/* Conversation History Toggle */}
          <button
            onClick={() => setShowHistory(prev => !prev)}
            className="w-full py-2.5 bg-[#E8ECE0] hover:bg-[#D6CFC3] text-[#2D3025] text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-[#D6CFC3]"
          >
            <Clock className="w-4 h-4" />
            <span>تاریخچه مکالمات</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
          </button>

          {/* Conversation History List */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                  {loadingHistory ? (
                    <div className="text-[10px] text-[#8D7F72] text-center py-4">در حال بارگذاری...</div>
                  ) : conversations.length === 0 ? (
                    <div className="text-[10px] text-[#8D7F72] text-center py-4 bg-[#F9F6EE] rounded-xl border border-dashed border-[#D6CFC3]">
                      هنوز مکالمه‌ای ثبت نشده
                    </div>
                  ) : (
                    conversations.map(conv => (
                      <div
                        key={conv.name}
                        onClick={() => openConversation(conv.name)}
                        className={`group p-2.5 rounded-xl border cursor-pointer transition-all ${
                          conversationId === conv.name
                            ? 'bg-[#7C8363]/10 border-[#7C8363]/30'
                            : 'bg-white border-[#E6DFD3] hover:border-[#7C8363]/40 hover:bg-[#F9F6EE]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-[#2D3025] truncate">{conv.title}</p>
                            <p className="text-[8px] text-[#8D7F72] mt-0.5">{formatDate(conv.last_message_at)}</p>
                          </div>
                          <button
                            onClick={(e) => handleDeleteConversation(conv.name, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[#D6CFC3] hover:text-red-500 rounded transition-all shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Backup & Recovery Utilities */}
          <div className="bg-[#FDFBF7] p-5 rounded-2xl shadow-sm border border-[#E6DFD3] space-y-4">
            <h4 className="text-xs font-bold text-[#2D3025] flex items-center gap-1.5 border-b border-[#E6DFD3]/40 pb-2 font-serif-elegant">
              <RefreshCw className="w-4 h-4 text-[#7C8363]" />
              <span>پشتیبان‌گیری از اطلاعات</span>
            </h4>
            
            <p className="text-[10px] text-[#8D7F72] leading-relaxed">
              تمام داده‌ها در حافظه مرورگر شما ذخیره شده‌اند. برای جلوگیری از فقدان اطلاعات، یک فایل پشتیبان دانلود کنید.
            </p>

            <div className="space-y-2">
              {/* Export */}
              <button
                onClick={handleExportData}
                className="w-full py-2 bg-[#E8ECE0] hover:bg-[#7C8363] hover:text-white text-[#7C8363] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-[#DDE2D5]"
              >
                <Download className="w-4 h-4" />
                <span>دانلود پشتیبان (JSON)</span>
              </button>

              {/* Import */}
              <label className="w-full py-2 bg-[#FDFBF7] hover:bg-[#E6DFD3] text-[#3D3D3D] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all border border-[#D6CFC3] border-dashed cursor-pointer">
                <Upload className="w-4 h-4 text-[#8D7F72]" />
                <span>بازیابی فایل پشتیبان</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportDataChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

        </div>

        {/* Chat Component Main (3 Cols) */}
        <div className="lg:col-span-3 bg-[#FDFBF7] rounded-2xl shadow-sm border border-[#E6DFD3] h-[600px] flex flex-col justify-between overflow-hidden">
          
          {/* Chat Header */}
          <div className="bg-[#F9F6EE] px-6 py-4 border-b border-[#E6DFD3]/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#7C8363] animate-pulse" />
              <div className="text-right">
                <h3 className="font-bold text-[#2D3025] text-sm font-serif-elegant">مشاوره هوشمند با یار مربی</h3>
                <p className="text-[10px] text-[#8D7F72] font-semibold">
                  یار به تمام تراکنش‌های مالی، اهداف و رکوردهای شما دسترسی دارد
                  {conversationId && <span className="text-[#7C8363]"> • مکالمه ذخیره‌شده</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FDFBF7]/30">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-xs border ${
                    isUser 
                      ? 'bg-[#9B6B61] border-[#8C5D53] text-white rounded-tr-none' 
                      : 'bg-[#F9F6EE]/80 border-[#E6DFD3] text-[#3D3D3D] rounded-tl-none'
                  }`}>
                    {/* Render message body */}
                    <div className="markdown-body text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                      {isUser ? (
                        <p className="font-semibold">{msg.text}</p>
                      ) : (
                        <Markdown>{msg.text}</Markdown>
                      )}
                    </div>
                    
                    <div className={`text-[9px] mt-2 font-medium text-left font-mono ${isUser ? 'text-[#F4E9E4]' : 'text-[#8D7F72]'}`}>
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#E6DFD3] rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex items-center gap-3">
                  <div className="flex space-x-1.5 space-x-reverse">
                    <div className="w-2 h-2 bg-[#7C8363] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#7C8363] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-[#7C8363] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-xs font-semibold text-[#8D7F72]">یار در حال بررسی مکتوبات، مخارج و عادات شماست...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Selector (Rendered conditionally above input) */}
          <div className="px-6 py-2 border-t border-[#E6DFD3]/40 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2 bg-[#F9F6EE]/40">
            <button
              onClick={() => handleQuickPrompt('وضعیت کل زندگی من چطور است؟ تحلیل کن.')}
              disabled={isLoading}
              className="px-3.5 py-1.5 bg-white hover:bg-[#E8ECE0] border border-[#E6DFD3] hover:border-[#7C8363] rounded-full text-[11px] font-bold text-[#2D3025] transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#7C8363]" />
              <span>تحلیل همه‌جانبه زندگی من</span>
            </button>
            <button
              onClick={() => handleQuickPrompt('وضعیت مخارج من چطور است؟ برای صرفه‌جویی راهکار بده.')}
              disabled={isLoading}
              className="px-3.5 py-1.5 bg-white hover:bg-[#E8ECE0] border border-[#E6DFD3] hover:border-[#7C8363] rounded-full text-[11px] font-bold text-[#7C8363] transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>تحلیل مخارج و هوش مالی</span>
            </button>
            <button
              onClick={() => handleQuickPrompt('چگونه می‌توانم عادت‌های روزانه‌ام را با استمرار بهتری حفظ کنم؟')}
              disabled={isLoading}
              className="px-3.5 py-1.5 bg-white hover:bg-[#F9F1D8] border border-[#E6DFD3] hover:border-[#9B6B61] rounded-full text-[11px] font-bold text-[#9B6B61] transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>تقویت استمرار در عادت‌ها</span>
            </button>
            <button
              onClick={() => handleQuickPrompt('برای اهدافی که دارم، گام‌های عملی بعدی چیست؟')}
              disabled={isLoading}
              className="px-3.5 py-1.5 bg-white hover:bg-[#F4E9E4] border border-[#E6DFD3] hover:border-[#9B6B61] rounded-full text-[11px] font-bold text-[#5A5A40] transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
            >
              <Target className="w-3.5 h-3.5 text-[#9B6B61]" />
              <span>برنامه‌ریزی و خرد کردن اهداف</span>
            </button>
          </div>

          {/* Form Input Message */}
          <form onSubmit={handleCustomSubmit} className="bg-[#F9F6EE] p-4 border-t border-[#E6DFD3]/40 flex gap-2 items-center">
            <input
              type="text"
              placeholder="خطاب به یار بنویسید (مثال: امروز نگران مخارجم بودم، چه توصیه‌ای داری؟)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl border border-[#D6CFC3] text-xs md:text-sm font-semibold focus:outline-none focus:border-[#7C8363] bg-white text-[#3D3D3D]"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-3 bg-[#7C8363] hover:bg-[#5A5A40] disabled:bg-[#D6CFC3] disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </form>

        </div>

      </div>

    </div>
  );
}
