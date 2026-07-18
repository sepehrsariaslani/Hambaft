import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Contact, ContactInteractionLog, ContactRelation, ContactRelationType, ContactRelationDirection, ContactSummary, RelationshipHealth, ContactLink, ContactLinkEntityType, ContactLinkRole, Occasion, Goal, Project, Task } from '../types';
import { 
  User, Users, Phone, Mail, Plus, Trash2, Calendar, MessageCircle, 
  Check, Search, Sparkles, Upload, Heart, Clock, MapPin, Activity, 
  Award, AlertCircle, Filter, Tag, MessageSquare, Briefcase, PlusCircle, X, CheckCircle, Edit2,
  Link2, ChevronDown, GripVertical, ArrowUpDown, Zap, Wifi, WifiOff, TrendingUp, ArrowRight, Target, FileText, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getContactRelations, createContactRelation, updateContactRelation, deleteContactRelation,
  getContactsSummary,
  getContactLinks, createContactLink, updateContactLink, deleteContactLink,
} from '../../app/hambaft-api';

interface ContactsSectionProps {
  contacts: Contact[];
  onAddContact: (contact: Omit<Contact, 'id'>) => void;
  onDeleteContact: (id: string) => void;
  onUpdateContact: (contact: Contact) => void;
  onAddOccasion?: (occ: Omit<Occasion, 'id'>) => void;
  onSelectContact?: (id: string) => void;
  onNavigateEntity?: (entityType: string, entityId: string) => void;
  goals?: Goal[];
  projects?: Project[];
  tasks?: Task[];
  occasions?: Occasion[];
  todayDate: string;
  initialContactId?: string | null;
  initialDetailTab?: 'overview' | 'relations' | 'history' | 'linked';
}

const CATEGORY_LABELS = {
  family: 'خانواده 👨‍👩‍👧',
  friend: 'دوست صمیمی 🤝',
  work: 'همکار / کاری 💼',
  mentor: 'منتور / استاد 🎓',
  partner: 'شریک زندگی ❤️',
  other: 'سایر ارتباطات 🌐'
};

const CLONESESS_LABELS = {
  inner: 'حلقه طلایی (بسیار صمیمی)',
  outer: 'حلقه نقره‌ای (معمولی)',
  acquaintance: 'آشنا / ارتباط موقت'
};

const RELATION_TYPE_LABELS: Record<string, string> = {
  family: '👨‍👩‍👧 خانواده',
  spouse_partner: '❤️ همسر/شریک زندگی',
  friend: '🤝 دوست',
  colleague: '💼 همکار',
  manager: '👔 مدیر',
  mentor: '🎓 منتور',
  client: '🏢 مشتری',
  introduced_by: '🔗 معرفی‌شده توسط',
  custom: '✨ سفارشی',
};

const DIRECTION_LABELS: Record<string, string> = {
  mutual: 'دوطرفه',
  outgoing: 'خروجی',
  incoming: 'ورودی',
};

const HEALTH_LABELS: Record<RelationshipHealth, { label: string; emoji: string; color: string; bg: string }> = {
  healthy: { label: 'سالم', emoji: '💚', color: 'text-emerald-600 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
  needs_attention: { label: 'نیاز به توجه', emoji: '🟡', color: 'text-amber-600 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/20' },
  cold: { label: 'سرد شده', emoji: '🔴', color: 'text-red-500 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-950/20' },
  new: { label: 'جدید', emoji: '🔵', color: 'text-blue-500 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/20' },
};

const SORT_OPTIONS = [
  { value: 'default', label: 'پیش‌فرض' },
  { value: 'strongest_network', label: 'قوی‌ترین شبکه' },
  { value: 'recently_contacted', label: 'آخرین تماس' },
  { value: 'highest_score', label: 'بالاترین امتیاز' },
  { value: 'at_risk', label: 'در معرض خطر' },
] as const;

const DETAIL_TABS = [
  { key: 'overview', label: 'خلاصه', emoji: '📋' },
  { key: 'relations', label: 'افراد مرتبط', emoji: '🔗' },
  { key: 'history', label: 'تاریخچه تعامل', emoji: '💬' },
  { key: 'linked', label: 'آیتم‌های مرتبط', emoji: '📌' },
] as const;

const ENTITY_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  goal: { label: 'هدف', emoji: '🎯' },
  project: { label: 'پروژه', emoji: '📂' },
  task: { label: 'وظیفه', emoji: '✅' },
  occasion: { label: 'مناسبت', emoji: '📅' },
  document: { label: 'سند', emoji: '📄' },
  finance: { label: 'مالی', emoji: '💰' },
};

const LINK_ROLE_LABELS: Record<string, string> = {
  owner: 'مالک',
  collaborator: 'همکار',
  mentor: 'منتور',
  accountability: 'پاسخگو',
  stakeholder: 'ذی‌نفع',
  family: 'خانواده',
  vendor: 'تأمین‌کننده',
  client: 'مشتری',
  introduced_by: 'معرفی‌شده توسط',
  related_person: 'شخص مرتبط',
};

export default function ContactsSection({
  contacts = [],
  onAddContact,
  onDeleteContact,
  onUpdateContact,
  onAddOccasion,
  onSelectContact,
  onNavigateEntity,
  goals = [],
  projects = [],
  tasks = [],
  occasions = [],
  todayDate,
  initialContactId,
  initialDetailTab,
}: ContactsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCloseness, setSelectedCloseness] = useState<string>('all');
  const [selectedRelationType, setSelectedRelationType] = useState<string>('all');
  const [selectedHealth, setSelectedHealth] = useState<string>('all');
  const [selectedRelationFilter, setSelectedRelationFilter] = useState<string>('all'); // all/has_relations/no_relations/needs_follow_up
  const [sortBy, setSortBy] = useState<string>('default');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'relations' | 'history' | 'linked'>('overview');

  // External navigation: when initialContactId changes, select that contact
  useEffect(() => {
    if (initialContactId) {
      const exists = contacts.some(c => c.id === initialContactId);
      if (exists) {
        setSelectedContactId(initialContactId);
        setActiveDetailTab(initialDetailTab || 'overview');
      } else {
        // Invalid id — clear selection, show list
        setSelectedContactId(null);
      }
    }
  }, [initialContactId, contacts, initialDetailTab]);

  // Contact-entity links state
  const [contactLinks, setContactLinks] = useState<ContactLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkEntityType, setLinkEntityType] = useState<ContactLinkEntityType>('goal');
  const [linkEntityId, setLinkEntityId] = useState('');
  const [linkRole, setLinkRole] = useState<ContactLinkRole>('related_person');
  const [linkContextNote, setLinkContextNote] = useState('');
  const [editLinkName, setEditLinkName] = useState<string | null>(null);
  const [deleteLinkConfirm, setDeleteLinkConfirm] = useState<string | null>(null);

  // Contact summaries from backend (relation counts + health)
  const [contactSummaries, setContactSummaries] = useState<Record<string, ContactSummary>>({});
  const [summariesLoaded, setSummariesLoaded] = useState(false);

  // Modal forms states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [interactionModalOpen, setInteractionModalOpen] = useState(false);

  // Contact Form State (shared between Add and Edit)
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Contact['category']>('friend');
  const [closenessTier, setClosenessTier] = useState<Contact['closenessTier']>('inner');
  const [birthday, setBirthday] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [traitsString, setTraitsString] = useState('');
  const [strengths, setStrengths] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [notes, setNotes] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined);

  // Contact Relations State
  const [contactRelations, setContactRelations] = useState<ContactRelation[]>([]);
  const [loadingRelations, setLoadingRelations] = useState(false);
  const [relationModalOpen, setRelationModalOpen] = useState(false);
  const [editRelationName, setEditRelationName] = useState<string | null>(null);
  const [relTargetContact, setRelTargetContact] = useState<string>('');
  const [relType, setRelType] = useState<ContactRelationType>('friend');
  const [relDirectionality, setRelDirectionality] = useState<ContactRelationDirection>('mutual');
  const [relStrength, setRelStrength] = useState(50);
  const [relSinceDate, setRelSinceDate] = useState('');
  const [relNotes, setRelNotes] = useState('');
  const [deleteRelationConfirm, setDeleteRelationConfirm] = useState<string | null>(null);

  // Fetch relations for the active contact
  const fetchRelations = useCallback(async (contactId: string) => {
    setLoadingRelations(true);
    try {
      const resp = await getContactRelations(contactId);
      const raw = resp?.data?.relations || [];
      const mapped: ContactRelation[] = raw.map((r: any) => ({
        name: r.name,
        fromContact: r.from_contact,
        toContact: r.to_contact,
        relationType: r.relation_type,
        directionality: r.directionality,
        directionLabel: r.direction_label,
        otherContactId: r.other_contact_id,
        otherContactName: r.other_contact_name,
        otherContactPhoto: r.other_contact_photo,
        otherContactCategory: r.other_contact_category,
        strengthScore: r.strength_score || 0,
        sinceDate: r.since_date,
        notes: r.notes || '',
        sortOrder: r.sort_order || 0,
      }));
      setContactRelations(mapped);
    } catch {
      setContactRelations([]);
    } finally {
      setLoadingRelations(false);
    }
  }, []);

  // Fetch relations when active contact changes
  useEffect(() => {
    if (selectedContactId) {
      fetchRelations(selectedContactId);
    } else {
      setContactRelations([]);
    }
  }, [selectedContactId, fetchRelations]);

  // Fetch contact summaries (relation counts + health)
  const fetchSummaries = useCallback(async () => {
    try {
      const resp = await getContactsSummary();
      const raw = resp?.data?.contacts || [];
      const map: Record<string, ContactSummary> = {};
      for (const c of raw) {
        map[c.name] = {
          name: c.name,
          fullName: c.full_name || c.name,
          contactCategory: c.contact_category || 'other',
          closenessTier: c.closeness_tier || 'acquaintance',
          lastInteractionDate: c.last_interaction_date || undefined,
          relationshipScore: c.relationship_score || 0,
          photoUrl: c.photo_url || undefined,
          relationCount: c.relation_count || 0,
          relationTypes: c.relation_types || {},
          health: c.health || 'new',
        };
      }
      setContactSummaries(map);
      setSummariesLoaded(true);
    } catch {
      setContactSummaries({});
    }
  }, []);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries, contacts.length]);

  // Fetch entity links for active contact
  const fetchLinks = useCallback(async (contactId: string) => {
    setLoadingLinks(true);
    try {
      const resp = await getContactLinks({ contactId });
      const raw = resp?.data?.links || [];
      const mapped: ContactLink[] = raw.map((l: any) => ({
        name: l.name,
        contact: l.contact,
        contactName: l.contact_name,
        contactPhoto: l.contact_photo,
        entityType: l.entity_type,
        entity: l.entity,
        entityTitle: l.entity_title,
        role: l.role,
        contextNote: l.context_note || '',
        status: l.status,
        sortOrder: l.sort_order || 0,
      }));
      setContactLinks(mapped);
    } catch {
      setContactLinks([]);
    } finally {
      setLoadingLinks(false);
    }
  }, []);

  useEffect(() => {
    if (selectedContactId) {
      fetchLinks(selectedContactId);
    } else {
      setContactLinks([]);
    }
  }, [selectedContactId, fetchLinks]);

  const activeContact = contacts.find(c => c.id === selectedContactId) || null;

  const handleOpenEditModal = () => {
    if (!activeContact) return;
    setName(activeContact.name);
    setCategory(activeContact.category);
    setClosenessTier(activeContact.closenessTier);
    setBirthday(activeContact.birthday || '');
    setPhone(activeContact.phone || '');
    setEmail(activeContact.email || '');
    setTraitsString(activeContact.traits ? activeContact.traits.join('، ') : '');
    setStrengths(activeContact.strengths || '');
    setHobbies(activeContact.hobbies || '');
    setNotes(activeContact.notes || '');
    setPhotoBase64(activeContact.photoUrl);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setName('');
    setCategory('friend');
    setClosenessTier('inner');
    setBirthday('');
    setPhone('');
    setEmail('');
    setTraitsString('');
    setStrengths('');
    setHobbies('');
    setNotes('');
    setPhotoBase64(undefined);
    setEditModalOpen(false);
  };

  const handleCloseAddModal = () => {
    setName('');
    setCategory('friend');
    setClosenessTier('inner');
    setBirthday('');
    setPhone('');
    setEmail('');
    setTraitsString('');
    setStrengths('');
    setHobbies('');
    setNotes('');
    setPhotoBase64(undefined);
    setAddModalOpen(false);
  };

  // New Interaction Form State
  const [intType, setIntType] = useState<'call' | 'meeting' | 'chat' | 'other'>('call');
  const [intDate, setIntDate] = useState(todayDate);
  const [intDuration, setIntDuration] = useState('');
  const [intNotes, setIntNotes] = useState('');
  const [intLocation, setIntLocation] = useState('');

  const getPersianNumber = (num: number | string) => {
    const id = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/[0-9]/g, w => id[parseInt(w, 10)]);
  };

  // Upkeep score calculation based on last interaction date
  const calculateUpkeepScore = (contact: Contact): number => {
    if (!contact.lastInteractionDate) return 20; // default very low score if never met
    
    const lastDate = new Date(contact.lastInteractionDate);
    const currDate = new Date(todayDate);
    const diffTime = Math.abs(currDate.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Target threshold based on circle closeness
    let thresholdDays = 14; // inner circle: expect contact every 2 weeks
    if (contact.closenessTier === 'outer') thresholdDays = 45; // outer circle: every 1.5 months
    if (contact.closenessTier === 'acquaintance') thresholdDays = 90; // acquaintance: every 3 months

    if (diffDays <= thresholdDays) {
      return 100;
    } else {
      // penalty of 1.5% score per day overdue
      const overdue = diffDays - thresholdDays;
      return Math.max(10, 100 - Math.round(overdue * 1.5));
    }
  };

  // Convert uploaded photo to Base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Relation handlers
  const handleOpenRelationModal = (existing?: ContactRelation) => {
    if (existing) {
      setEditRelationName(existing.name);
      setRelTargetContact(existing.otherContactId);
      setRelType(existing.relationType);
      setRelDirectionality(existing.directionality);
      setRelStrength(existing.strengthScore);
      setRelSinceDate(existing.sinceDate || '');
      setRelNotes(existing.notes);
    } else {
      setEditRelationName(null);
      setRelTargetContact('');
      setRelType('friend');
      setRelDirectionality('mutual');
      setRelStrength(50);
      setRelSinceDate('');
      setRelNotes('');
    }
    setRelationModalOpen(true);
  };

  const handleSaveRelation = async () => {
    if (!activeContact || !relTargetContact) return;
    try {
      if (editRelationName) {
        await updateContactRelation(editRelationName, {
          relation_type: relType,
          directionality: relDirectionality,
          strength_score: relStrength,
          since_date: relSinceDate || undefined,
          notes: relNotes,
        });
      } else {
        await createContactRelation({
          from_contact: activeContact.id,
          to_contact: relTargetContact,
          relation_type: relType,
          directionality: relDirectionality,
          strength_score: relStrength,
          since_date: relSinceDate || undefined,
          notes: relNotes,
        });
      }
      await fetchRelations(activeContact.id);
      setRelationModalOpen(false);
    } catch (err) {
      console.error('[hambaft] save relation failed', err);
    }
  };

  const handleDeleteRelation = async (relationName: string) => {
    if (!activeContact) return;
    try {
      await deleteContactRelation(relationName);
      await fetchRelations(activeContact.id);
    } catch (err) {
      console.error('[hambaft] delete relation failed', err);
    }
    setDeleteRelationConfirm(null);
  };

  // Contact link handlers
  const handleOpenLinkModal = (existing?: ContactLink) => {
    if (existing) {
      setEditLinkName(existing.name);
      setLinkEntityType(existing.entityType);
      setLinkEntityId(existing.entity);
      setLinkRole(existing.role);
      setLinkContextNote(existing.contextNote);
    } else {
      setEditLinkName(null);
      setLinkEntityType('goal');
      setLinkEntityId('');
      setLinkRole('related_person');
      setLinkContextNote('');
    }
    setLinkModalOpen(true);
  };

  const handleSaveLink = async () => {
    if (!activeContact || !linkEntityId) return;
    try {
      if (editLinkName) {
        await updateContactLink(editLinkName, {
          role: linkRole,
          context_note: linkContextNote,
        });
      } else {
        await createContactLink({
          contact: activeContact.id,
          entity_type: linkEntityType,
          entity: linkEntityId,
          role: linkRole,
          context_note: linkContextNote,
        });
      }
      await fetchLinks(activeContact.id);
      setLinkModalOpen(false);
    } catch (err) {
      console.error('[hambaft] save link failed', err);
    }
  };

  const handleDeleteLink = async (linkName: string) => {
    if (!activeContact) return;
    try {
      await deleteContactLink(linkName);
      await fetchLinks(activeContact.id);
    } catch (err) {
      console.error('[hambaft] delete link failed', err);
    }
    setDeleteLinkConfirm(null);
  };

  // Quick action: mark as reached today
  const handleMarkReachedToday = () => {
    if (!activeContact) return;
    onUpdateContact({
      ...activeContact,
      lastInteractionDate: todayDate,
      lastInteractionType: 'chat',
    });
  };

  // Quick action: create follow-up occasion
  const handleCreateFollowUp = () => {
    if (!activeContact || !onAddOccasion) return;
    const followUpDate = new Date(todayDate);
    followUpDate.setDate(followUpDate.getDate() + 7); // 7 days from now
    onAddOccasion({
      title: `پیگیری با ${activeContact.name}`,
      type: 'reminder',
      date: followUpDate.toISOString().slice(0, 10),
      person: activeContact.name,
      recurrenceType: 'once',
      reminderDaysBefore: 1,
      notes: `پیگیری ارتباط با ${activeContact.name}`,
    });
  };

  // Upkeep status for a contact
  const getUpkeepStatus = useCallback((contact: Contact): { status: 'reached' | 'due_soon' | 'overdue'; label: string } => {
    if (!contact.lastInteractionDate) return { status: 'overdue', label: 'بدون تعامل' };
    const lastDate = new Date(contact.lastInteractionDate);
    const currDate = new Date(todayDate);
    const diffDays = Math.ceil(Math.abs(currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    const threshold = contact.closenessTier === 'inner' ? 14 : contact.closenessTier === 'outer' ? 45 : 90;
    if (diffDays <= threshold * 0.5) return { status: 'reached', label: 'اخیراً تماس گرفته‌شده' };
    if (diffDays <= threshold) return { status: 'due_soon', label: 'به‌زودی نیاز به پیگیری' };
    return { status: 'overdue', label: 'سررسید پیگیری' };
  }, [todayDate]);

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const traits = traitsString
      .split('،')
      .join(',')
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const newContact: Omit<Contact, 'id'> = {
      name: name.trim(),
      category,
      closenessTier,
      birthday: birthday || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      traits,
      strengths: strengths.trim() || undefined,
      hobbies: hobbies.trim() || undefined,
      notes: notes.trim() || undefined,
      photoUrl: photoBase64,
      interactionLogs: [],
      relationshipScore: 20
    };

    onAddContact(newContact);

    // If birthday is provided, automatically add to the Occasions Section / reminders!
    if (birthday && onAddOccasion) {
      onAddOccasion({
        title: `🎂 تولد: ${name.trim()}`,
        type: 'birthday',
        date: birthday,
        recurrenceType: 'yearly',
        reminderDaysBefore: 3,
        notes: `یادآوری تولد ${name.trim()} از دفتر ارتباطات CRM. برای تبریک، تماس بگیرید.`
      });
    }

    // Reset fields
    handleCloseAddModal();
  };

  const handleUpdateContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContact || !name.trim()) return;

    const traits = traitsString
      .split('،')
      .join(',')
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const updatedContact: Contact = {
      ...activeContact,
      name: name.trim(),
      category,
      closenessTier,
      birthday: birthday || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      traits,
      strengths: strengths.trim() || undefined,
      hobbies: hobbies.trim() || undefined,
      notes: notes.trim() || undefined,
      photoUrl: photoBase64,
    };

    // Recalculate Relationship Score right away based on existing interactionLogs
    updatedContact.relationshipScore = calculateUpkeepScore(updatedContact);

    onUpdateContact(updatedContact);
    handleCloseEditModal();
  };

  const handleAddInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId) return;

    const matchedContact = contacts.find(c => c.id === selectedContactId);
    if (!matchedContact) return;

    const newLog: ContactInteractionLog = {
      id: `intl-${Date.now()}`,
      date: intDate,
      type: intType,
      durationMinutes: intDuration ? parseInt(intDuration, 10) : undefined,
      notes: intNotes.trim() || undefined,
      location: intLocation.trim() || undefined
    };

    const updatedLogs = [...(matchedContact.interactionLogs || []), newLog];
    
    // Sort logs descending by date
    const sortedLogs = updatedLogs.sort((a, b) => b.date.localeCompare(a.date));
    const latestLog = sortedLogs[0];

    const updatedContact: Contact = {
      ...matchedContact,
      interactionLogs: sortedLogs,
      lastInteractionDate: latestLog.date,
      lastInteractionType: latestLog.type,
    };

    // Recalculate Upkeep Score right away
    updatedContact.relationshipScore = calculateUpkeepScore(updatedContact);

    onUpdateContact(updatedContact);

    // Reset interaction fields
    setIntNotes('');
    setIntDuration('');
    setIntLocation('');
    setInteractionModalOpen(false);
  };

  // Compute derived health on frontend (mirrors backend logic for when summaries not yet loaded)
  const computeHealthLocal = useCallback((contact: Contact): RelationshipHealth => {
    const summary = contactSummaries[contact.id];
    if (summary?.health) return summary.health;

    if (!contact.lastInteractionDate) {
      return 'new';
    }
    const lastDate = new Date(contact.lastInteractionDate);
    const currDate = new Date(todayDate);
    const diffDays = Math.ceil(Math.abs(currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    const threshold = contact.closenessTier === 'inner' ? 14 : contact.closenessTier === 'outer' ? 45 : 90;
    if (diffDays <= threshold) return 'healthy';
    if (diffDays <= threshold * 2) return 'needs_attention';
    return 'cold';
  }, [contactSummaries, todayDate]);

  // Enriched contacts with relation count, health, and sort
  const enrichedContacts = useMemo(() => {
    return contacts.map(c => ({
      ...c,
      relationCount: contactSummaries[c.id]?.relationCount ?? (c.relations?.length ?? 0),
      health: computeHealthLocal(c),
      summary: contactSummaries[c.id],
    }));
  }, [contacts, contactSummaries, computeHealthLocal]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    let result = enrichedContacts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (c.phone && c.phone.includes(searchQuery)) ||
                            (c.traits && c.traits.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
      const matchesCloseness = selectedCloseness === 'all' || c.closenessTier === selectedCloseness;
      const matchesHealth = selectedHealth === 'all' || c.health === selectedHealth;

      // Relation type filter
      let matchesRelationType = true;
      if (selectedRelationType !== 'all') {
        const rt = contactSummaries[c.id]?.relationTypes || {};
        matchesRelationType = !!rt[selectedRelationType];
      }

      // Relation status filter
      let matchesRelationFilter = true;
      if (selectedRelationFilter === 'has_relations') {
        matchesRelationFilter = c.relationCount > 0;
      } else if (selectedRelationFilter === 'no_relations') {
        matchesRelationFilter = c.relationCount === 0;
      } else if (selectedRelationFilter === 'needs_follow_up') {
        matchesRelationFilter = c.health === 'needs_attention' || c.health === 'cold';
      }

      return matchesSearch && matchesCategory && matchesCloseness && matchesHealth && matchesRelationType && matchesRelationFilter;
    });

    // Sort
    if (sortBy === 'strongest_network') {
      result.sort((a, b) => b.relationCount - a.relationCount);
    } else if (sortBy === 'recently_contacted') {
      result.sort((a, b) => {
        const aDate = a.lastInteractionDate || '';
        const bDate = b.lastInteractionDate || '';
        return bDate.localeCompare(aDate);
      });
    } else if (sortBy === 'highest_score') {
      result.sort((a, b) => (b.relationshipScore || 0) - (a.relationshipScore || 0));
    } else if (sortBy === 'at_risk') {
      const healthOrder: Record<RelationshipHealth, number> = { cold: 0, needs_attention: 1, new: 2, healthy: 3 };
      result.sort((a, b) => (healthOrder[a.health] ?? 9) - (healthOrder[b.health] ?? 9));
    }

    return result;
  }, [enrichedContacts, searchQuery, selectedCategory, selectedCloseness, selectedHealth, selectedRelationType, selectedRelationFilter, sortBy, contactSummaries]);

  // Summary strip data
  const summaryData = useMemo(() => {
    const total = enrichedContacts.length;
    const connected = enrichedContacts.filter(c => c.relationCount > 0).length;
    const isolated = enrichedContacts.filter(c => c.relationCount === 0).length;
    const innerCircle = enrichedContacts.filter(c => c.closenessTier === 'inner').length;
    const atRisk = enrichedContacts.filter(c => c.health === 'cold' || c.health === 'needs_attention').length;
    const healthy = enrichedContacts.filter(c => c.health === 'healthy').length;
    const newContacts = enrichedContacts.filter(c => c.health === 'new').length;
    return { total, connected, isolated, innerCircle, atRisk, healthy, newContacts };
  }, [enrichedContacts]);

  // Birthday Countdown calculator helper
  const getBirthdayCountdown = (bdayStr?: string): { daysLeft: number, age: number } | null => {
    if (!bdayStr) return null;
    try {
      const parts = bdayStr.split('-');
      if (parts.length !== 3) return null;
      const bYear = parseInt(parts[0]);
      const bMonth = parseInt(parts[1]) - 1;
      const bDay = parseInt(parts[2]);

      const today = new Date(todayDate);
      const birthDate = new Date(bYear, bMonth, bDay);
      
      let nextBday = new Date(today.getFullYear(), bMonth, bDay);
      if (nextBday < today) {
        nextBday.setFullYear(today.getFullYear() + 1);
      }

      const diffTime = Math.abs(nextBday.getTime() - today.getTime());
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const age = today.getFullYear() - bYear;

      return { daysLeft, age };
    } catch (e) {
      return null;
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-500/10 text-rose-600">👥</span>
            <span>مدیریت ارتباطات و حلقه صمیمیت (CRM شخصی)</span>
          </h2>
          <p className="text-xs text-[#8D7F72] dark:text-[#9D978B] mt-1">پایش توازن در تعاملات اجتماعی، نگهداری رابطه با عزیزان و منتورها</p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="py-2.5 px-4 bg-[#E26645] hover:bg-[#C94B2A] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>افزودن مخاطب جدید</span>
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-xl p-2.5 text-center">
          <span className="text-lg font-black text-[#2D3025] dark:text-[#E8ECE0] block">{getPersianNumber(summaryData.total)}</span>
          <span className="text-[8px] font-black text-[#8D7F72] dark:text-[#9D978B] block">کل مخاطبین</span>
        </div>
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-xl p-2.5 text-center">
          <span className="text-lg font-black text-[#7C8363] dark:text-[#9ECE9A] block">{getPersianNumber(summaryData.connected)}</span>
          <span className="text-[8px] font-black text-[#8D7F72] dark:text-[#9D978B] block">متصل</span>
        </div>
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-xl p-2.5 text-center">
          <span className="text-lg font-black text-amber-600 dark:text-amber-300 block">{getPersianNumber(summaryData.isolated)}</span>
          <span className="text-[8px] font-black text-[#8D7F72] dark:text-[#9D978B] block">منزوی</span>
        </div>
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-xl p-2.5 text-center">
          <span className="text-lg font-black text-[#9B6B61] block">{getPersianNumber(summaryData.innerCircle)}</span>
          <span className="text-[8px] font-black text-[#8D7F72] dark:text-[#9D978B] block">حلقه طلایی</span>
        </div>
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-xl p-2.5 text-center">
          <span className="text-lg font-black text-red-500 dark:text-red-300 block">{getPersianNumber(summaryData.atRisk)}</span>
          <span className="text-[8px] font-black text-[#8D7F72] dark:text-[#9D978B] block">در خطر</span>
        </div>
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-xl p-2.5 text-center">
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-300 block">{getPersianNumber(summaryData.healthy)}</span>
          <span className="text-[8px] font-black text-[#8D7F72] dark:text-[#9D978B] block">سالم</span>
        </div>
      </div>

      {/* Grid: Left column list, Right column detail view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: FILTER & LIST */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Filter Toolbar Card */}
          <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-2xl p-4 shadow-xs space-y-3 transition-colors">
            {/* Search */}
            <div className="relative">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در نام، شماره یا مهارت‌ها..."
                className="w-full text-xs font-extrabold pr-9 pl-3 py-2 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] focus:outline-none focus:ring-1 focus:ring-rose-500/50"
              />
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-[#8D7F72]" />
            </div>

            {/* Quick dropdown filters */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">دسته‌بندی</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-[10px] font-black p-2 rounded-lg border border-[#E6DFD3] dark:border-[#3D4133]/40 bg-white dark:bg-[#20241A]"
                >
                  <option value="all">همه دسته‌ها</option>
                  <option value="family">خانواده</option>
                  <option value="friend">دوستان صمیمی</option>
                  <option value="work">همکاران</option>
                  <option value="mentor">منتورها</option>
                  <option value="partner">شریک زندگی</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">سطح صمیمیت</label>
                <select
                  value={selectedCloseness}
                  onChange={(e) => setSelectedCloseness(e.target.value)}
                  className="w-full text-[10px] font-black p-2 rounded-lg border border-[#E6DFD3] dark:border-[#3D4133]/40 bg-white dark:bg-[#20241A]"
                >
                  <option value="all">همه حلقه‌ها</option>
                  <option value="inner">حلقه طلایی</option>
                  <option value="outer">حلقه نقره‌ای</option>
                  <option value="acquaintance">آشنایان</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">سلامت رابطه</label>
                <select
                  value={selectedHealth}
                  onChange={(e) => setSelectedHealth(e.target.value)}
                  className="w-full text-[10px] font-black p-2 rounded-lg border border-[#E6DFD3] dark:border-[#3D4133]/40 bg-white dark:bg-[#20241A]"
                >
                  <option value="all">همه</option>
                  <option value="healthy">💚 سالم</option>
                  <option value="needs_attention">🟡 نیاز به توجه</option>
                  <option value="cold">🔴 سرد شده</option>
                  <option value="new">🔵 جدید</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">وضعیت ارتباط</label>
                <select
                  value={selectedRelationFilter}
                  onChange={(e) => setSelectedRelationFilter(e.target.value)}
                  className="w-full text-[10px] font-black p-2 rounded-lg border border-[#E6DFD3] dark:border-[#3D4133]/40 bg-white dark:bg-[#20241A]"
                >
                  <option value="all">همه</option>
                  <option value="has_relations">🔗 دارای ارتباط</option>
                  <option value="no_relations">📵 بدون ارتباط</option>
                  <option value="needs_follow_up">⏰ نیاز به پیگیری</option>
                </select>
              </div>
            </div>

            {/* Secondary filter row: relation type + sort */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">نوع رابطه</label>
                <select
                  value={selectedRelationType}
                  onChange={(e) => setSelectedRelationType(e.target.value)}
                  className="w-full text-[10px] font-black p-2 rounded-lg border border-[#E6DFD3] dark:border-[#3D4133]/40 bg-white dark:bg-[#20241A]"
                >
                  <option value="all">همه انواع</option>
                  {Object.entries(RELATION_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1 flex items-center gap-1"><ArrowUpDown className="w-2.5 h-2.5" /> مرتب‌سازی</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full text-[10px] font-black p-2 rounded-lg border border-[#E6DFD3] dark:border-[#3D4133]/40 bg-white dark:bg-[#20241A]"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Cards List */}
          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {filteredContacts.length > 0 ? (
              filteredContacts.map(contact => {
                const score = calculateUpkeepScore(contact);
                const isSelected = selectedContactId === contact.id;
                const health = contact.health;
                const healthInfo = HEALTH_LABELS[health];
                const relCount = contact.relationCount;
                const upkeep = getUpkeepStatus(contact);
                
                return (
                  <div
                    key={contact.id}
                    onClick={() => { setSelectedContactId(contact.id); setActiveDetailTab('overview'); }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                      isSelected 
                        ? 'bg-rose-500/5 border-rose-500/50 shadow-md scale-[1.01]' 
                        : 'bg-[#FDFBF7] dark:bg-[#1B1D16] border-[#E6DFD3] dark:border-[#3D4133]/20 hover:border-rose-400/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-[#E6DFD3]/60 dark:border-[#3D4133]/20 overflow-hidden shrink-0 flex items-center justify-center">
                          {contact.photoUrl ? (
                            <img src={contact.photoUrl} alt={contact.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">👤</span>
                          )}
                        </div>
                        {/* Relation count badge */}
                        {relCount > 0 && (
                          <span className="absolute -top-1 -left-1 text-[7px] font-black bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] rounded-full w-4 h-4 flex items-center justify-center">{relCount}</span>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0]">{contact.name}</h4>
                          <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md ${
                            contact.closenessTier === 'inner' ? 'bg-[#F9F1D8] text-[#5A5A40] dark:bg-[#201D13]' :
                            contact.closenessTier === 'outer' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800' :
                            'bg-blue-50 text-blue-700 dark:bg-blue-950/20'
                          }`}>
                            {contact.closenessTier === 'inner' ? '🥇' : contact.closenessTier === 'outer' ? '🥈' : '🥉'}
                          </span>
                          <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-md ${healthInfo.bg} ${healthInfo.color}`}>
                            {healthInfo.emoji}
                          </span>
                        </div>
                        <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold block mt-0.5">
                          {CATEGORY_LABELS[contact.category]}
                        </span>
                        
                        {contact.lastInteractionDate ? (
                          <span className={`text-[8px] font-semibold block mt-0.5 flex items-center gap-1 ${upkeep.status === 'overdue' ? 'text-red-500' : upkeep.status === 'due_soon' ? 'text-amber-600' : 'text-[#8D7F72] dark:text-[#9D978B]'}`}>
                            <Clock className="w-2.5 h-2.5" />
                            {upkeep.status === 'reached' ? '✓ اخیراً تماس' : upkeep.status === 'due_soon' ? '⏰ پیگیری نزدیک' : '⚠ سررسید'}
                          </span>
                        ) : (
                          <span className="text-[8px] text-rose-500 font-bold block mt-0.5">بدون گفتگو!</span>
                        )}
                      </div>
                    </div>

                    {/* Score Upkeep Circle */}
                    <div className="text-center" title="شاخص نگهداری رابطه">
                      <span className={`text-xs font-mono font-black px-2 py-1 rounded-lg block ${
                        score > 80 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' :
                        score > 50 ? 'bg-[#F9F1D8] text-[#9B6B61] dark:bg-[#201D13]' :
                        'bg-rose-50 text-rose-600 dark:bg-rose-950/20'
                      }`}>
                        {getPersianNumber(score)}٪
                      </span>
                      <span className="text-[7px] text-[#8D7F72] dark:text-[#9D978B] font-black mt-0.5 block">پایداری</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3]/80 rounded-[20px] p-8 text-center text-xs text-[#8D7F72]">
                مخاطبی با این فیلتر یافت نشد.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CONTACT DETAILS PORTRAIT */}
        <div className="lg:col-span-7">
          {activeContact ? (
            <motion.div
              key={activeContact.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-[28px] p-6 shadow-sm space-y-6 text-right"
            >
              {/* Profile Card Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-[#E6DFD3]/60 dark:border-[#3D4133]/20">
                <div className="flex items-center gap-4">
                  {/* Photo Large */}
                  <div className="w-16 h-16 rounded-[20px] bg-slate-100 dark:bg-slate-800 border border-[#E6DFD3]/60 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                    {activeContact.photoUrl ? (
                      <img src={activeContact.photoUrl} alt={activeContact.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">👤</span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-black text-[#2D3025] dark:text-[#E8ECE0]">{activeContact.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className="text-[9px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md border border-rose-200">
                        {CATEGORY_LABELS[activeContact.category]}
                      </span>
                      <span className="text-[9px] font-black bg-[#F9F1D8] text-[#5A5A40] px-2 py-0.5 rounded-md border border-[#EBE3C8]">
                        {CLONESESS_LABELS[activeContact.closenessTier]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Interactive Upkeep Actions */}
                <div className="flex gap-2 w-full sm:w-auto items-center flex-wrap">
                  <button
                    onClick={() => setInteractionModalOpen(true)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-[10px] font-black rounded-xl cursor-pointer shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>ثبت گفتگو</span>
                  </button>

                  <button
                    onClick={handleMarkReachedToday}
                    className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-black rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors border border-emerald-200/30 dark:border-emerald-800/30"
                    title="علامت‌گذاری به عنوان تماس‌گرفته‌شده امروز"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">تماس امروز</span>
                  </button>

                  {onAddOccasion && (
                    <button
                      onClick={handleCreateFollowUp}
                      className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] font-black rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors border border-amber-200/30 dark:border-amber-800/30"
                      title="ایجاد یادآور پیگیری"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">پیگیری</span>
                    </button>
                  )}

                  <button
                    onClick={() => { setActiveDetailTab('relations'); handleOpenRelationModal(); }}
                    className="px-3 py-2 bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A] text-[10px] font-black rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors border border-[#7C8363]/20 dark:border-[#9ECE9A]/20"
                    title="افزودن رابطه جدید"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">رابطه</span>
                  </button>

                  <button
                    onClick={handleOpenEditModal}
                    className="p-2 rounded-xl bg-[#F9F1D8]0/10 hover:bg-[#F9F1D8]0/20 text-[#9B6B61] border border-transparent hover:border-[#EBE3C8]/30 cursor-pointer transition-colors"
                    title="ویرایش مشخصات مخاطب"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteContact(activeContact.id)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-transparent hover:border-rose-300/30 cursor-pointer transition-colors"
                    title="حذف مخاطب"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Health & Upkeep Status Bar */}
              {(() => {
                const health = computeHealthLocal(activeContact);
                const hInfo = HEALTH_LABELS[health];
                const upkeep = getUpkeepStatus(activeContact);
                const summary = contactSummaries[activeContact.id];
                const relCount = summary?.relationCount ?? (activeContact.relations?.length ?? 0);
                return (
                  <div className="flex flex-wrap gap-2 items-center p-3 rounded-2xl bg-white dark:bg-[#20241A] border border-[#E6DFD3]/40 dark:border-[#3D4133]/20">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${hInfo.bg} ${hInfo.color}`}>{hInfo.emoji} {hInfo.label}</span>
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${
                      upkeep.status === 'reached' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300' :
                      upkeep.status === 'due_soon' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300' :
                      'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-300'
                    }`}>{upkeep.label}</span>
                    {relCount > 0 && (
                      <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A]">🔗 {getPersianNumber(relCount)} رابطه</span>
                    )}
                    <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-[#F9F1D8] text-[#9B6B61] dark:bg-[#201D13]">💪 {getPersianNumber(calculateUpkeepScore(activeContact))}٪ پایداری</span>
                  </div>
                );
              })()}

              {/* Detail Tabs */}
              <div className="flex gap-1 border-b border-[#E6DFD3]/60 dark:border-[#3D4133]/20 pb-0">
                {DETAIL_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveDetailTab(tab.key as 'overview' | 'relations' | 'history')}
                    className={`px-3 py-2 text-[10px] font-black rounded-t-lg cursor-pointer transition-colors ${
                      activeDetailTab === tab.key
                        ? 'bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A] border-b-2 border-[#7C8363] dark:border-[#9ECE9A]'
                        : 'text-[#8D7F72] dark:text-[#9D978B] hover:text-[#2D3025] dark:hover:text-[#E8ECE0]'
                    }`}
                  >
                    {tab.emoji} {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content: Overview */}
              {activeDetailTab === 'overview' && (
              <>
              {/* Personal details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                
                {/* Birthday Info Card */}
                {activeContact.birthday && (
                  <div className="p-3.5 rounded-2xl bg-[#F9F1D8]0/5 dark:bg-[#F9F1D8]0/10 border border-[#EBE3C8]/50 dark:border-[#3D3929]">
                    <div className="flex justify-between items-center text-[#9B6B61]">
                      <span className="font-black flex items-center gap-1.5">
                        <span>🎂</span> تاریخ تولد و تقویم مناسبت
                      </span>
                      <span className="font-mono font-black bg-[#F9F1D8] px-2 py-0.5 rounded-md text-[10px]">
                        {getPersianNumber(activeContact.birthday)}
                      </span>
                    </div>
                    {(() => {
                      const countdown = getBirthdayCountdown(activeContact.birthday);
                      if (!countdown) return null;
                      return (
                        <div className="mt-2.5 text-[10px] text-[#8D7F72] dark:text-[#C7B59F] leading-relaxed">
                          مخاطب شما در حال حاضر <span className="font-extrabold text-[#9B6B61]">{getPersianNumber(countdown.age)} سال</span> دارد و <span className="font-extrabold text-[#2D3025] dark:text-[#E8ECE0]">{getPersianNumber(countdown.daysLeft)} روز</span> تا تولد بعدی او باقی مانده است.
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Closeness upkeep timer */}
                <div className="p-3.5 rounded-2xl bg-[#E8ECE0]/50 dark:bg-[#20241A]/20 border border-[#DDE2D5] dark:border-[#3D4133]/15">
                  <span className="font-black text-[#7C8363] flex items-center gap-1.5 mb-1.5">
                    <Heart className="w-3.5 h-3.5 text-[#E26645]" /> شاخص بقای رابطه
                  </span>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                    <div style={{ width: `${calculateUpkeepScore(activeContact)}%` }} className="bg-[#7C8363] h-full" />
                  </div>
                  <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold leading-relaxed block">
                    نمره پایداری: {getPersianNumber(calculateUpkeepScore(activeContact))}٪. 
                    {activeContact.lastInteractionDate ? ' بر مبنای آخرین گفتگو در ۲ هفته گذشته.' : ' لطفاً همین حالا تماس بگیرید.'}
                  </span>
                </div>

                {/* Contacts details card */}
                <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 md:col-span-2">
                  <span className="font-black text-[#2D3025] dark:text-[#E8ECE0] block mb-1">📞 اطلاعات دسترسی مخاطب</span>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 flex items-center gap-2 bg-white dark:bg-[#20241A] p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[10px] font-black">{activeContact.phone ? getPersianNumber(activeContact.phone) : 'ثبت نشده'}</span>
                    </div>

                    <div className="flex-1 flex items-center gap-2 bg-white dark:bg-[#20241A] p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[10px] font-bold truncate">{activeContact.email || 'ثبت نشده'}</span>
                    </div>
                  </div>
                </div>

                {/* traits / characteristics */}
                <div className="p-4 rounded-2xl bg-rose-50/20 dark:bg-[#2D3025]/10 border border-rose-100 dark:border-[#3D4133]/20 md:col-span-2 space-y-3">
                  <span className="font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> ویژگی‌های شخصیتی، قوت‌ها و علایق
                  </span>

                  {/* tags list */}
                  {activeContact.traits && activeContact.traits.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {activeContact.traits.map((trait, idx) => (
                        <span key={idx} className="bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold px-2 py-0.5 rounded-md text-[9px] border border-rose-200/50">
                          #{trait}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* strengths & hobbies */}
                  <div className="space-y-1.5 text-[10px] text-[#8D7F72] dark:text-[#9D978B]">
                    {activeContact.strengths && (
                      <div>
                        <span className="font-black text-[#2D3025] dark:text-[#E8ECE0]">نقطه قوت:</span> {activeContact.strengths}
                      </div>
                    )}
                    {activeContact.hobbies && (
                      <div>
                        <span className="font-black text-[#2D3025] dark:text-[#E8ECE0]">تفریحات و علایق:</span> {activeContact.hobbies}
                      </div>
                    )}
                    {activeContact.notes && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-[#20241A] border border-rose-100 dark:border-[#3D4133]/15 mt-2 text-[#3D3D3D] dark:text-[#C7B59F] leading-relaxed">
                        <span className="font-black block text-[9px] text-rose-500 mb-1">✍️ بیوگرافی و یادداشت کلیدی:</span>
                        {activeContact.notes}
                      </div>
                    )}
                  </div>
                </div>

              </div>
              </> )}

              {/* Tab Content: Related People */}
              {activeDetailTab === 'relations' && (
              <div className="space-y-4">
                {(() => {
                  const summary = contactSummaries[activeContact.id];
                  const relCount = summary?.relationCount ?? (activeContact.relations?.length ?? 0);
                  const relTypes = summary?.relationTypes ?? {};
                  return (
                    <>
                      {/* Relation statistics */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[9px] font-black text-[#2D3025] dark:text-[#E8ECE0]">📊 آمار ارتباطات:</span>
                        <span className="text-[8px] font-bold px-2 py-1 rounded-lg bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A]">{getPersianNumber(relCount)} رابطه</span>
                        {Object.entries(relTypes).map(([type, count]) => (
                          <span key={type} className="text-[8px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-[#20241A] border border-[#E6DFD3]/40 dark:border-[#3D4133]/20 text-[#8D7F72] dark:text-[#9D978B]">
                            {RELATION_TYPE_LABELS[type] || type}: {getPersianNumber(count)}
                          </span>
                        ))}
                      </div>

                      {/* Grouped relations by type */}
                      {contactRelations.length > 0 && (
                        <div className="space-y-3">
                          {Object.entries(
                            contactRelations.reduce((acc, rel) => {
                              const key = rel.relationType;
                              if (!acc[key]) acc[key] = [];
                              acc[key].push(rel);
                              return acc;
                            }, {} as Record<string, ContactRelation[]>)
                          ).map(([type, rels]) => (
                            <div key={type}>
                              <h5 className="text-[10px] font-black text-[#7C8363] dark:text-[#9ECE9A] mb-2 flex items-center gap-1">
                                {RELATION_TYPE_LABELS[type] || type}
                                <span className="text-[8px] bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 px-1.5 py-0.5 rounded-full">{getPersianNumber(rels.length)}</span>
                              </h5>
                              <div className="space-y-2">
                                {rels.map(rel => (
                                  <div key={rel.name} className="group flex items-center gap-3 p-2.5 bg-white dark:bg-[#20241A] border border-[#E6DFD3]/40 dark:border-[#3D4133]/20 rounded-xl text-right transition-all hover:shadow-sm">
                                    <button
                                      onClick={() => { setSelectedContactId(rel.otherContactId); if (onSelectContact) onSelectContact(rel.otherContactId); }}
                                      className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-[#E6DFD3]/40 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:opacity-80"
                                    >
                                      {rel.otherContactPhoto ? <img src={rel.otherContactPhoto} alt="" className="w-full h-full object-cover" /> : <span className="text-sm">👤</span>}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <button
                                        onClick={() => { setSelectedContactId(rel.otherContactId); if (onSelectContact) onSelectContact(rel.otherContactId); }}
                                        className="text-[10px] font-black text-[#2D3025] dark:text-[#E8ECE0] block truncate text-right hover:text-[#7C8363] dark:hover:text-[#9ECE9A] cursor-pointer"
                                      >
                                        {rel.otherContactName}
                                      </button>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-md ${
                                          rel.directionLabel === 'mutual' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' :
                                          rel.directionLabel === 'outgoing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' :
                                          'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                                        }`}>
                                          {DIRECTION_LABELS[rel.directionLabel] || rel.directionLabel}
                                        </span>
                                        {rel.strengthScore > 0 && <span className="text-[7px] text-[#8D7F72]">💪 {rel.strengthScore}</span>}
                                      </div>
                                      {rel.notes && <p className="text-[8px] text-[#8D7F72] mt-0.5 truncate">{rel.notes}</p>}
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleOpenRelationModal(rel)} className="p-1 rounded text-[#8D7F72] hover:text-[#7C8363] cursor-pointer"><Edit2 className="w-3 h-3" /></button>
                                      <button onClick={() => setDeleteRelationConfirm(rel.name)} className="p-1 rounded text-[#8D7F72] hover:text-red-400 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {contactRelations.length === 0 && !loadingRelations && (
                        <div className="text-center py-5 text-[10px] text-[#8D7F72] dark:text-[#9D978B] border border-[#E6DFD3]/40 dark:border-[#3D4133]/20 rounded-2xl bg-white dark:bg-[#20241A] p-4">
                          هنوز ارتباطی ثبت نشده. با افزودن رابطه، شبکه ارتباطات خود را بسازید.
                        </div>
                      )}

                      <button
                        onClick={() => handleOpenRelationModal()}
                        className="w-full py-2.5 bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A] text-[10px] font-black rounded-xl cursor-pointer hover:bg-[#7C8363]/20 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        افزودن رابطه جدید
                      </button>
                    </>
                  );
                })()}
              </div>
              )}

              {/* Tab Content: Interaction History */}
              {activeDetailTab === 'history' && (
              <div className="space-y-4">
                <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#E26645]" />
                  <span>تاریخچه ملاقات‌ها، تماس‌ها و کارهای بیرون صمیمی</span>
                </h4>

                <div className="space-y-3">
                  {activeContact.interactionLogs && activeContact.interactionLogs.length > 0 ? (
                    activeContact.interactionLogs.map((log) => (
                      <div key={log.id} className="p-3.5 bg-white dark:bg-[#20241A] border border-[#E6DFD3]/40 dark:border-[#3D4133]/20 rounded-2xl text-right relative overflow-hidden">
                        
                        <div className="flex justify-between items-center text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B] mb-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#E26645]" />
                            {getPersianNumber(log.date)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md font-black text-[9px] ${
                            log.type === 'meeting' ? 'bg-[#F9F1D8] text-[#5A5A40] dark:bg-[#201D13]' :
                            log.type === 'call' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20' :
                            log.type === 'chat' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/20' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-800'
                          }`}>
                            {log.type === 'meeting' ? '👥 ملاقات حضوری' : log.type === 'call' ? '📞 تماس تلفنی' : log.type === 'chat' ? '💬 چت آنلاین' : '🌐 سایر'}
                          </span>
                        </div>

                        {log.notes && (
                          <p className="text-[10px] text-[#3D3D3D] dark:text-[#E8ECE0] leading-relaxed mt-1">
                            {log.notes}
                          </p>
                        )}

                        <div className="flex gap-4 mt-2 pt-2 border-t border-slate-50 dark:border-slate-800 text-[8px] font-bold text-[#8D7F72] dark:text-[#9D978B]">
                          {log.durationMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-rose-400" />
                              مدت: {getPersianNumber(log.durationMinutes)} دقیقه
                            </span>
                          )}
                          {log.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-slate-400" />
                              مکان: {log.location}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-[#8D7F72] border border-[#E6DFD3]/40 dark:border-[#3D4133]/20 rounded-2xl bg-white dark:bg-[#20241A] text-right p-4">
                      هیچ سابقه‌ای ثبت نشده است. با ثبت اولین گفتگو، نمودار پایداری رابطه را رشد دهید.
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Tab Content: Linked Items */}
              {activeDetailTab === 'linked' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[#7C8363] dark:text-[#9ECE9A]" />
                    <span>آیتم‌های مرتبط در سیستم</span>
                    {contactLinks.length > 0 && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A]">{contactLinks.length}</span>
                    )}
                  </h4>
                  <button
                    onClick={() => handleOpenLinkModal()}
                    className="px-2.5 py-1.5 bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A] text-[9px] font-black rounded-lg cursor-pointer hover:bg-[#7C8363]/20 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    افزودن پیوند
                  </button>
                </div>

                {loadingLinks ? (
                  <div className="flex items-center justify-center py-6 gap-2">
                    <div className="w-4 h-4 border-2 border-[#7C8363]/30 border-t-[#7C8363] rounded-full animate-spin" />
                    <span className="text-[10px] text-[#8D7F72]">در حال بارگذاری...</span>
                  </div>
                ) : contactLinks.length > 0 ? (
                  // Group by entity type
                  Object.entries(
                    contactLinks.reduce((acc, link) => {
                      if (!acc[link.entityType]) acc[link.entityType] = [];
                      acc[link.entityType].push(link);
                      return acc;
                    }, {} as Record<string, ContactLink[]>)
                  ).map(([etype, links]) => {
                    const elabel = ENTITY_TYPE_LABELS[etype] || { label: etype, emoji: '📎' };
                    return (
                      <div key={etype}>
                        <h5 className="text-[10px] font-black text-[#7C8363] dark:text-[#9ECE9A] mb-2 flex items-center gap-1">
                          {elabel.emoji} {elabel.label}
                          <span className="text-[8px] bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 px-1.5 py-0.5 rounded-full">{links.length}</span>
                        </h5>
                        <div className="space-y-2">
                          {links.map(link => (
                            <div key={link.name} className="group flex items-center gap-3 p-2.5 bg-white dark:bg-[#20241A] border border-[#E6DFD3]/40 dark:border-[#3D4133]/20 rounded-xl text-right transition-all hover:shadow-sm">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-[#E6DFD3]/40 shrink-0 flex items-center justify-center text-sm">
                                {elabel.emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <button
                                  onClick={() => { if (onNavigateEntity) onNavigateEntity(link.entityType, link.entity); }}
                                  className="text-[10px] font-black text-[#2D3025] dark:text-[#E8ECE0] block truncate text-right hover:text-[#7C8363] dark:hover:text-[#9ECE9A] cursor-pointer"
                                >
                                  {link.entityTitle}
                                </button>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-md bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A]">
                                    {LINK_ROLE_LABELS[link.role] || link.role}
                                  </span>
                                  {link.contextNote && (
                                    <span className="text-[7px] text-[#8D7F72] truncate">{link.contextNote}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenLinkModal(link)} className="p-1 rounded text-[#8D7F72] hover:text-[#7C8363] cursor-pointer"><Edit2 className="w-3 h-3" /></button>
                                <button onClick={() => setDeleteLinkConfirm(link.name)} className="p-1 rounded text-[#8D7F72] hover:text-red-400 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-5 text-[10px] text-[#8D7F72] border border-[#E6DFD3]/40 dark:border-[#3D4133]/20 rounded-2xl bg-white dark:bg-[#20241A] p-4">
                    هنوز آیتمی پیوند نشده. اهداف، پروژه‌ها و وظایف مرتبط را به این مخاطب پیوند دهید.
                  </div>
                )}
              </div>
              )}

              {/* Insights mini-section at bottom of any tab */}
              {(() => {
                const summary = contactSummaries[activeContact.id];
                const relCount = summary?.relationCount ?? 0;
                // Find connectors and isolated contacts from summaries
                const connectors = Object.values(contactSummaries).filter(s => s.relationCount >= 3).sort((a, b) => b.relationCount - a.relationCount).slice(0, 5);
                const isolatedContacts = enrichedContacts.filter(c => c.relationCount === 0 && c.health !== 'new').slice(0, 5);
                const needsAttention = enrichedContacts.filter(c => c.health === 'needs_attention' || c.health === 'cold').slice(0, 5);
                return (
                  <div className="space-y-3 pt-4 border-t border-dashed border-[#E6DFD3]/80 dark:border-[#3D4133]/20">
                    <h4 className="text-[10px] font-black text-[#7C8363] dark:text-[#9ECE9A] flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>دستاوردهای شبکه ارتباطات</span>
                    </h4>

                    {connectors.length > 0 && (
                      <div className="p-3 rounded-xl bg-white dark:bg-[#20241A] border border-[#E6DFD3]/40 dark:border-[#3D4133]/20">
                        <span className="text-[9px] font-black text-[#7C8363] dark:text-[#9ECE9A] block mb-1.5">🌐 مراکز ارتباطی قوی (بیشترین رابطه)</span>
                        <div className="flex flex-wrap gap-1.5">
                          {connectors.map(s => (
                            <button key={s.name} onClick={() => { setSelectedContactId(s.name); setActiveDetailTab('relations'); }}
                              className="text-[8px] font-bold px-2 py-1 rounded-lg bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A] cursor-pointer hover:opacity-80 flex items-center gap-1">
                              {s.fullName} <span className="text-[7px]">({getPersianNumber(s.relationCount)})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {isolatedContacts.length > 0 && (
                      <div className="p-3 rounded-xl bg-white dark:bg-[#20241A] border border-[#E6DFD3]/40 dark:border-[#3D4133]/20">
                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-300 block mb-1.5">📵 مخاطبین منزوی (بدون ارتباط ثبت‌شده)</span>
                        <div className="flex flex-wrap gap-1.5">
                          {isolatedContacts.map(c => (
                            <button key={c.id} onClick={() => { setSelectedContactId(c.id); setActiveDetailTab('relations'); }}
                              className="text-[8px] font-bold px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 cursor-pointer hover:opacity-80">
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {needsAttention.length > 0 && (
                      <div className="p-3 rounded-xl bg-white dark:bg-[#20241A] border border-[#E6DFD3]/40 dark:border-[#3D4133]/20">
                        <span className="text-[9px] font-black text-red-500 dark:text-red-300 block mb-1.5">⚠️ نیاز به پیگیری فوری</span>
                        <div className="flex flex-wrap gap-1.5">
                          {needsAttention.map(c => (
                            <button key={c.id} onClick={() => setSelectedContactId(c.id)}
                              className="text-[8px] font-bold px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-300 cursor-pointer hover:opacity-80 flex items-center gap-1">
                              {c.name} {c.health === 'cold' ? '🔴' : '🟡'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          ) : (
            <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-[28px] p-12 text-center text-xs text-[#8D7F72] transition-colors flex flex-col items-center justify-center h-full min-h-[350px]">
              <span className="text-4xl block mb-2 select-none">🗂️</span>
              <span className="font-black text-sm text-[#2D3025] dark:text-[#E8ECE0] block mb-1">انتخاب مخاطب برای نمایش جزئیات</span>
              <span>یک مخاطب را از لیست سمت راست لمس کنید تا مشخصات صمیمیت و گفتگوها نمایش داده شود.</span>
            </div>
          )}
        </div>

      </div>

      {/* MODAL 1: ADD CONTACT */}
      <AnimatePresence>
        {addModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] rounded-[24px] p-6 max-w-lg w-full text-right"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2">
                  <span>➕</span> افزودن مخاطب به دفتر صمیمیت CRM
                </h3>
                <button onClick={handleCloseAddModal} className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer">
                  <X className="w-4 h-4 text-[#8D7F72]" />
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                {/* Name */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">نام و نام خانوادگی مخاطب *</label>
                  <input 
                    type="text" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: مریم کریمی"
                    className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                  />
                </div>

                {/* Grid category and closeness */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">دسته ارتباطی *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full text-xs font-black p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]"
                    >
                      <option value="family">خانواده</option>
                      <option value="friend">دوست صمیمی</option>
                      <option value="work">همکار / کاری</option>
                      <option value="mentor">منتور / راهنما</option>
                      <option value="partner">شریک زندگی</option>
                      <option value="other">سایر</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">حلقه صمیمیت *</label>
                    <select
                      value={closenessTier}
                      onChange={(e) => setClosenessTier(e.target.value as any)}
                      className="w-full text-xs font-black p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]"
                    >
                      <option value="inner">حلقه طلایی (بسیار صمیمی - ۲ هفته گفتگو)</option>
                      <option value="outer">حلقه نقره‌ای (معمولی - ۱.۵ ماه گفتگو)</option>
                      <option value="acquaintance">آشنایان (۳ ماه گفتگو)</option>
                    </select>
                  </div>
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">تصویر یا عکس مخاطب</label>
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-[#E6DFD3]/40 dark:border-slate-800">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-[#E6DFD3]/60 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {photoBase64 ? (
                        <img src={photoBase64} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">👤</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          id="photo-file"
                          className="hidden"
                        />
                        <label 
                          htmlFor="photo-file"
                          className="py-1.5 px-3 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-[10px] font-black rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          <span>انتخاب عکس</span>
                        </label>
                        {photoBase64 && (
                          <button
                            type="button"
                            onClick={() => setPhotoBase64(undefined)}
                            className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                          >
                            حذف عکس
                          </button>
                        )}
                      </div>
                      <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">عکس پرتره یا آواتار مخاطب</p>
                    </div>
                  </div>
                </div>

                {/* Contact birthday */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">تاریخ تولد (اختیاری - به تقویم مناسبت‌ها افزوده می‌شود)</label>
                  <input 
                    type="date" 
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                  />
                  <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] mt-1 font-semibold">
                    💡 تاریخ تولد به صورت خودکار به عنوان یادآوری سالانه با هشدار از ۳ روز قبل در تقویم مناسبت‌ها ثبت می‌شود.
                  </p>
                </div>

                {/* Contact phone and email */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">شماره تماس (اختیاری)</label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] text-left font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">ایمیل (اختیاری)</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@mail.com"
                      className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] text-left font-mono"
                    />
                  </div>
                </div>

                {/* Traits and stregths */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">ویژگی‌های اخلاقی و خصوصیات مخاطب (با کاما جدا کنید)</label>
                  <input 
                    type="text" 
                    value={traitsString}
                    onChange={(e) => setTraitsString(e.target.value)}
                    placeholder="مثال: صبور، اهل کافه، برنامه‌نویس، شوخ طبع"
                    className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">نقاط قوت مخاطب (اختیاری)</label>
                    <input 
                      type="text" 
                      value={strengths}
                      onChange={(e) => setStrengths(e.target.value)}
                      placeholder="مثال: شنونده عالی، مشاوره هوشمند"
                      className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">تفریحات مشترک یا علایق</label>
                    <input 
                      type="text" 
                      value={hobbies}
                      onChange={(e) => setHobbies(e.target.value)}
                      placeholder="مثال: کوهنوردی، فیلم، سینما"
                      className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]"
                    />
                  </div>
                </div>

                {/* notes */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">یادداشت‌های کلیدی و ارتباطی</label>
                  <textarea 
                    rows={2} 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="جایی که اولین بار با او آشنا شدید یا مسائل مهم ارتباطی..."
                    className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] resize-none"
                  />
                </div>

                {/* buttons */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>ذخیره مخاطب در حلقه صمیمیت</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1.5: EDIT CONTACT */}
      <AnimatePresence>
        {editModalOpen && activeContact && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] rounded-[24px] p-6 max-w-lg w-full text-right"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2">
                  <span>📝</span> ویرایش مشخصات مخاطب: {activeContact.name}
                </h3>
                <button onClick={handleCloseEditModal} className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer">
                  <X className="w-4 h-4 text-[#8D7F72]" />
                </button>
              </div>

              <form onSubmit={handleUpdateContactSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                {/* Name */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">نام و نام خانوادگی مخاطب *</label>
                  <input 
                    type="text" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: مریم کریمی"
                    className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                  />
                </div>

                {/* Grid category and closeness */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">دسته ارتباطی *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full text-xs font-black p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]"
                    >
                      <option value="family">خانواده</option>
                      <option value="friend">دوست صمیمی</option>
                      <option value="work">همکار / کاری</option>
                      <option value="mentor">منتور / راهنما</option>
                      <option value="partner">شریک زندگی</option>
                      <option value="other">سایر</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">حلقه صمیمیت *</label>
                    <select
                      value={closenessTier}
                      onChange={(e) => setClosenessTier(e.target.value as any)}
                      className="w-full text-xs font-black p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]"
                    >
                      <option value="inner">حلقه طلایی (بسیار صمیمی - ۲ هفته گفتگو)</option>
                      <option value="outer">حلقه نقره‌ای (معمولی - ۱.۵ ماه گفتگو)</option>
                      <option value="acquaintance">آشنایان (۳ ماه گفتگو)</option>
                    </select>
                  </div>
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">تصویر یا عکس مخاطب</label>
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-[#E6DFD3]/40 dark:border-slate-800">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-[#E6DFD3]/60 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {photoBase64 ? (
                        <img src={photoBase64} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">👤</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          id="photo-file-edit"
                          className="hidden"
                        />
                        <label 
                          htmlFor="photo-file-edit"
                          className="py-1.5 px-3 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-[10px] font-black rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          <span>انتخاب عکس</span>
                        </label>
                        {photoBase64 && (
                          <button
                            type="button"
                            onClick={() => setPhotoBase64(undefined)}
                            className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                          >
                            حذف عکس
                          </button>
                        )}
                      </div>
                      <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">عکس پرتره یا آواتار مخاطب</p>
                    </div>
                  </div>
                </div>

                {/* Contact birthday */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">تاریخ تولد (اختیاری)</label>
                  <input 
                    type="date" 
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                  />
                  <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] mt-1 font-semibold">
                    💡 تغییر تاریخ تولد به صورت خودکار تقویم مناسبت‌ها را بروزرسانی خواهد کرد.
                  </p>
                </div>

                {/* Contact phone and email */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">شماره تماس (اختیاری)</label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] text-left font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">ایمیل (اختیاری)</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@mail.com"
                      className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] text-left font-mono"
                    />
                  </div>
                </div>

                {/* Traits and strengths */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">ویژگی‌های اخلاقی و خصوصیات مخاطب (با کاما جدا کنید)</label>
                  <input 
                    type="text" 
                    value={traitsString}
                    onChange={(e) => setTraitsString(e.target.value)}
                    placeholder="مثال: صبور، اهل کافه، برنامه‌نویس، شوخ طبع"
                    className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">نقاط قوت مخاطب (اختیاری)</label>
                    <input 
                      type="text" 
                      value={strengths}
                      onChange={(e) => setStrengths(e.target.value)}
                      placeholder="مثال: شنونده عالی، مشاوره هوشمند"
                      className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">تفریحات مشترک یا علایق</label>
                    <input 
                      type="text" 
                      value={hobbies}
                      onChange={(e) => setHobbies(e.target.value)}
                      placeholder="مثال: کوهنوردی، فیلم، سینما"
                      className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]"
                    />
                  </div>
                </div>

                {/* notes */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">یادداشت‌های کلیدی و ارتباطی</label>
                  <textarea 
                    rows={2} 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="جایی که اولین بار با او آشنا شدید یا مسائل مهم ارتباطی..."
                    className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] resize-none"
                  />
                </div>

                {/* buttons */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#F9F1D8]0 hover:bg-[#9B6B61] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>ذخیره تغییرات مخاطب</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD INTERACTION LOG */}
      <AnimatePresence>
        {interactionModalOpen && activeContact && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] rounded-[24px] p-6 max-w-md w-full text-right"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2">
                  <span>📝</span> ثبت گزارش گفتگو با {activeContact.name}
                </h3>
                <button onClick={() => setInteractionModalOpen(false)} className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">
                  <X className="w-4 h-4 text-[#8D7F72]" />
                </button>
              </div>

              <form onSubmit={handleAddInteraction} className="space-y-4">
                {/* Interaction Type dropdown */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">نوع تعامل</label>
                    <select
                      value={intType}
                      onChange={(e) => setIntType(e.target.value as any)}
                      className="w-full text-xs font-black p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]"
                    >
                      <option value="call">📞 تماس تلفنی</option>
                      <option value="meeting">👥 ملاقات حضوری</option>
                      <option value="chat">💬 چت آنلاین</option>
                      <option value="other">🌐 سایر موارد</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">تاریخ گفتگو</label>
                    <input 
                      type="date" 
                      required
                      value={intDate}
                      onChange={(e) => setIntDate(e.target.value)}
                      className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]"
                    />
                  </div>
                </div>

                {/* Duration and location */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">مدت گفتگو (دقیقه)</label>
                    <input 
                      type="number" 
                      value={intDuration}
                      onChange={(e) => setIntDuration(e.target.value)}
                      placeholder="مثال: ۱۵"
                      className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">مکان ملاقات (اختیاری)</label>
                    <input 
                      type="text" 
                      value={intLocation}
                      onChange={(e) => setIntLocation(e.target.value)}
                      placeholder="مثال: کافه راش"
                      className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">خلاصه گفتگو و مسائل کلیدی مطرح‌شده</label>
                  <textarea 
                    rows={3} 
                    required
                    value={intNotes}
                    onChange={(e) => setIntNotes(e.target.value)}
                    placeholder="در این گفتگو چه مسائلی مطرح شد؟ چه تصمیماتی گرفته شد؟"
                    className="w-full text-xs font-extrabold p-3.5 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] resize-none focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>ذخیره گفتگو و ارتقای پایداری رابطه</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD/EDIT RELATION */}
      <AnimatePresence>
        {relationModalOpen && activeContact && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/50 rounded-[24px] p-6 max-w-md w-full text-right"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[#7C8363] dark:text-[#9ECE9A]" />
                  {editRelationName ? 'ویرایش رابطه' : 'افزودن رابطه'}
                </h3>
                <button onClick={() => setRelationModalOpen(false)} className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer">
                  <X className="w-4 h-4 text-[#8D7F72]" />
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                {/* Target Contact */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">مخاطب مقصد *</label>
                  <select
                    value={relTargetContact}
                    onChange={(e) => setRelTargetContact(e.target.value)}
                    disabled={!!editRelationName}
                    className="w-full text-xs font-black p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] disabled:opacity-50"
                  >
                    <option value="">انتخاب کنید...</option>
                    {contacts.filter(c => c.id !== activeContact.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Relation Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">نوع رابطه *</label>
                    <select
                      value={relType}
                      onChange={(e) => setRelType(e.target.value as ContactRelationType)}
                      className="w-full text-xs font-black p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]"
                    >
                      {Object.entries(RELATION_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">جهت رابطه *</label>
                    <select
                      value={relDirectionality}
                      onChange={(e) => setRelDirectionality(e.target.value as ContactRelationDirection)}
                      className="w-full text-xs font-black p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]"
                    >
                      <option value="mutual">دوطرفه (متقابل)</option>
                      <option value="directed">یک‌طرفه (جهت‌دار)</option>
                    </select>
                  </div>
                </div>

                {/* Strength */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">شدت رابطه: {relStrength}</label>
                  <input type="range" min={0} max={100} value={relStrength} onChange={e => setRelStrength(Number(e.target.value))}
                    className="w-full accent-[#7C8363] dark:accent-[#9ECE9A]" />
                  <div className="flex justify-between text-[7px] text-[#9D978B] mt-0.5"><span>ضعیف</span><span>متوسط</span><span>قوی</span></div>
                </div>

                {/* Since Date */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">تاریخ شروع (اختیاری)</label>
                  <input type="date" value={relSinceDate} onChange={e => setRelSinceDate(e.target.value)}
                    className="w-full text-xs font-black p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]" />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">یادداشت (اختیاری)</label>
                  <textarea rows={2} value={relNotes} onChange={e => setRelNotes(e.target.value)}
                    placeholder="توضیحات رابطه..."
                    className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] resize-none focus:outline-none" />
                </div>

                {/* Submit */}
                <button
                  onClick={handleSaveRelation}
                  disabled={!relTargetContact}
                  className="w-full py-3 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] text-xs font-black rounded-xl shadow-md cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {editRelationName ? 'ذخیره تغییرات' : 'ثبت رابطه'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE RELATION CONFIRM */}
      <AnimatePresence>
        {deleteRelationConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDeleteRelationConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1B1D16] rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60">
              <h3 className="text-[12px] font-black text-[#2D3025] dark:text-[#E8ECE0] mb-2">حذف رابطه</h3>
              <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] mb-3">مطمئنی؟ این رابطه حذف می‌شه.</p>
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setDeleteRelationConfirm(null)} className="px-3 py-1.5 text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B] cursor-pointer">انصراف</button>
                <button onClick={() => handleDeleteRelation(deleteRelationConfirm)} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-[10px] font-bold cursor-pointer">حذف</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTACT LINK MODAL */}
      <AnimatePresence>
        {linkModalOpen && activeContact && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/50 rounded-[24px] p-6 max-w-md w-full text-right"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[#7C8363]" />
                  {editLinkName ? 'ویرایش پیوند' : 'افزودن پیوند'}
                </h3>
                <button onClick={() => setLinkModalOpen(false)} className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer">
                  <X className="w-4 h-4 text-[#8D7F72]" />
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                {/* Entity Type */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">نوع آیتم *</label>
                  <select
                    value={linkEntityType}
                    onChange={(e) => { setLinkEntityType(e.target.value as ContactLinkEntityType); setLinkEntityId(''); }}
                    disabled={!!editLinkName}
                    className="w-full text-xs font-black p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] disabled:opacity-50"
                  >
                    {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                </div>

                {/* Entity Selection */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">انتخاب آیتم *</label>
                  <select
                    value={linkEntityId}
                    onChange={(e) => setLinkEntityId(e.target.value)}
                    disabled={!!editLinkName}
                    className="w-full text-xs font-black p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] disabled:opacity-50"
                  >
                    <option value="">انتخاب کنید...</option>
                    {linkEntityType === 'goal' && goals.map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                    {linkEntityType === 'project' && projects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                    {linkEntityType === 'task' && tasks.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                    {linkEntityType === 'occasion' && occasions.map(o => (
                      <option key={o.id} value={o.id}>{o.title}</option>
                    ))}
                  </select>
                </div>

                {/* Role */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">نقش در این آیتم *</label>
                  <select
                    value={linkRole}
                    onChange={(e) => setLinkRole(e.target.value as ContactLinkRole)}
                    className="w-full text-xs font-black p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]"
                  >
                    {Object.entries(LINK_ROLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Context Note */}
                <div>
                  <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">توضیح زمینه (اختیاری)</label>
                  <textarea rows={2} value={linkContextNote} onChange={e => setLinkContextNote(e.target.value)}
                    placeholder="مثلاً: منتور در مسیر یادگیری..."
                    className="w-full text-xs font-extrabold p-3 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] resize-none focus:outline-none" />
                </div>

                {/* Submit */}
                <button
                  onClick={handleSaveLink}
                  disabled={!linkEntityId}
                  className="w-full py-3 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] text-xs font-black rounded-xl shadow-md cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {editLinkName ? 'ذخیره تغییرات' : 'ثبت پیوند'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE LINK CONFIRM */}
      <AnimatePresence>
        {deleteLinkConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDeleteLinkConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1B1D16] rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60">
              <h3 className="text-[12px] font-black text-[#2D3025] dark:text-[#E8ECE0] mb-2">حذف پیوند</h3>
              <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] mb-3">مطمئنی؟ این پیوند حذف می‌شه.</p>
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setDeleteLinkConfirm(null)} className="px-3 py-1.5 text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B] cursor-pointer">انصراف</button>
                <button onClick={() => handleDeleteLink(deleteLinkConfirm)} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-[10px] font-bold cursor-pointer">حذف</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
