import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Search, Smile, UserPlus, ShieldBan, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { isSelfInteraction, syncBidirectionalContacts } from '@/lib/contactSync';
import MediaUploader from '@/components/chat/MediaUploader';
import VoiceRecorder from '@/components/chat/VoiceRecorder';
import ChatAttachmentContent from '@/components/chat/ChatAttachmentContent';

// Extended emoji list with categories
const EMOJI_LIST = [
  '😀','😂','🥰','😎','😊','😅','🥳','😍','🤔','😭','😤','🤗','😇','🥺','😏','😒','😈','🤩','🫡','😶',
  '👍','👎','👏','🙏','💪','🤝','✌️','🫶','👋','🤜','👆','🖕','🤞','🫰','💅','🤟','🤙','👌','🤌','🫸',
  '❤️','🔥','✨','🎉','💯','⭐','🌟','💥','💫','🎊','🎈','🎁','🏆','🥇','💎','🌈','🍀','🦋','🌸','🌺',
  '😺','🐶','🦊','🐱','🐭','🐸','🦁','🐯','🐺','🦝','🐻','🐼','🦄','🐲','🦅','🦉','🦋','🐝','🦀','🐬',
  '🍕','🍔','🍟','🌮','🍣','🍜','🍩','🍰','🎂','🍦','🥤','🍺','☕','🍵','🥂','🍾','🍷','🫖','🥐','🍇',
  '🚀','🚗','✈️','🚂','⚽','🏀','🎮','🎵','🎸','🎤','📱','💻','📷','🎬','📚','🔑','💡','🌍','🏠','🎨',
];

interface ChatContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  targetCabinet?: CabinetContext | null;
  lastMessage?: string;
  lastMessageAt?: string;
  unread: number;
  isGroup?: boolean;
  groupId?: string;
}

export type CabinetContext = 'client' | 'master' | 'business' | 'platform';

interface Props {
  isClientContext?: boolean;
  cabinetContext?: CabinetContext;
  onUnreadChange?: (count: number) => void;
}

const TeachingChats = ({ isClientContext = false, cabinetContext, onUnreadChange }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine effective cabinet context
  const effectiveCabinet: CabinetContext = cabinetContext || (isClientContext ? 'client' : 'master');

  const getConversationScope = (contact?: ChatContact | null, messageList?: any[]): CabinetContext | null => {
    const scopedMessage = [...(messageList || [])]
      .reverse()
      .find((msg) => msg.chat_type === 'direct' && ['client', 'master', 'business'].includes(msg.cabinet_type_scope || ''));

    if (scopedMessage?.cabinet_type_scope) {
      return scopedMessage.cabinet_type_scope as CabinetContext;
    }

    if (effectiveCabinet === 'master' || effectiveCabinet === 'business') {
      return effectiveCabinet;
    }

    if (effectiveCabinet === 'client') {
      return contact?.targetCabinet || null;
    }

    return null;
  };

  useEffect(() => { if (user) fetchContacts(); }, [user, effectiveCabinet]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Listen for open-chat-with event
  useEffect(() => {
    const handler = async (e: CustomEvent) => {
      const detail = e.detail;
      const contactId = typeof detail === 'string' ? detail : detail?.contactId;
      const targetCabinet = typeof detail === 'string' ? null : detail?.targetCabinet || null;
      if (!contactId || !user || isSelfInteraction(user.id, contactId)) return;
      const { data: profile } = await supabase.from('profiles').select('id, first_name, last_name, email').eq('id', contactId).maybeSingle();
      if (profile) {
        const contact: ChatContact = {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          targetCabinet,
          unread: 0,
        };
        setContacts((prev) => prev.some((item) => item.id === contact.id) ? prev : [contact, ...prev]);
        openChat(contact);
      }
    };
    window.addEventListener('open-chat-with', handler as EventListener);
    return () => window.removeEventListener('open-chat-with', handler as EventListener);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`teaching-chat-${user.id}-${effectiveCabinet}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const msg = payload.new as any;
        if (msg.chat_type !== 'direct') return;
        const isMine = msg.sender_id === user.id || msg.recipient_id === user.id;
        if (!isMine) return;
        if (effectiveCabinet !== 'client' && msg.cabinet_type_scope && msg.cabinet_type_scope !== effectiveCabinet) return;
        if (selectedContact && (
          (msg.sender_id === selectedContact.id && msg.recipient_id === user.id) ||
          (msg.sender_id === user.id && msg.recipient_id === selectedContact.id)
        )) {
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.sender_id === selectedContact.id) {
            supabase.from('chat_messages').update({ is_read: true, is_delivered: true }).eq('id', msg.id);
          }
        }
        fetchContacts();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, (payload) => {
        const updated = payload.new as any;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedContact, effectiveCabinet]);

  const fetchContacts = async () => {
    if (!user) return;
    setLoading(true);
    
    // Fetch all direct messages
    const { data: msgs } = await supabase.from('chat_messages').select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .eq('chat_type', 'direct')
      .order('created_at', { ascending: false });

    // Collect unique contact IDs from messages
    const contactIds = new Set<string>();
    (msgs || []).forEach(m => {
      if (m.sender_id !== user.id) contactIds.add(m.sender_id);
      if (m.recipient_id !== user.id) contactIds.add(m.recipient_id);
    });

    const { data: savedContacts } = await supabase
      .from('favorites')
      .select('target_id')
      .eq('user_id', user.id)
      .eq('favorite_type', 'contact');

    (savedContacts || []).forEach((item: any) => {
      if (item.target_id && item.target_id !== user.id) contactIds.add(item.target_id);
    });

    // For client cabinet — also include favorites + booking history
    if (effectiveCabinet === 'client') {
      const [favRes, bookRes, lessonRes] = await Promise.all([
        supabase.from('favorites').select('target_id, favorite_type').eq('user_id', user.id).in('favorite_type', ['master', 'business']),
        supabase.from('bookings').select('executor_id').eq('client_id', user.id),
        supabase.from('lesson_bookings').select('lesson_id, lessons(teacher_id)').eq('student_id', user.id),
      ]);

      // Resolve business favorites → owner_id
      const businessIds = (favRes.data || []).filter((f: any) => f.favorite_type === 'business').map((f: any) => f.target_id);
      const masterFavIds = (favRes.data || []).filter((f: any) => f.favorite_type === 'master').map((f: any) => f.target_id);

      if (businessIds.length > 0) {
        const { data: bizOwners } = await supabase.from('business_locations').select('owner_id').in('id', businessIds);
        (bizOwners || []).forEach((b: any) => b.owner_id && contactIds.add(b.owner_id));
      }
      if (masterFavIds.length > 0) {
        const [{ data: masterById }, { data: masterByUserId }] = await Promise.all([
          supabase.from('master_profiles').select('id, user_id').in('id', masterFavIds),
          supabase.from('master_profiles').select('id, user_id').in('user_id', masterFavIds),
        ]);
        [...(masterById || []), ...(masterByUserId || [])].forEach((m: any) => m.user_id && contactIds.add(m.user_id));
      }
      (bookRes.data || []).forEach((b: any) => b.executor_id && contactIds.add(b.executor_id));
      (lessonRes.data || []).forEach((l: any) => l.lessons?.teacher_id && contactIds.add(l.lessons.teacher_id));
    }

    contactIds.delete(user.id);
    
    const contactIdArr = Array.from(contactIds);
    if (contactIdArr.length === 0) {
      setContacts([]);
      setTotalUnread(0);
      onUnreadChange?.(0);
      setLoading(false);
      return;
    }

    // Fetch profiles AND roles for cabinet-based filtering
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, email').in('id', contactIdArr),
      supabase.from('user_roles').select('user_id, role, is_active').in('user_id', contactIdArr).eq('is_active', true),
    ]);
    
    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const allMsgs = msgs || [];
    
    // Build role map
    const roleMap = new Map<string, Set<string>>();
    roles.forEach(r => {
      if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, new Set());
      roleMap.get(r.user_id)!.add(r.role);
    });
    
    const relevantMsgs = allMsgs.filter((msg) => {
      if (msg.chat_type !== 'direct') return false;
      if (effectiveCabinet === 'client') return true;
      return msg.cabinet_type_scope === effectiveCabinet;
    });

    // Filter contacts by cabinet context
    const isAllowedContact = (contactId: string): boolean => {
      const contactRoles = roleMap.get(contactId) || new Set();
      const hasMessageHistory = relevantMsgs.some((m) =>
        (m.sender_id === contactId && m.recipient_id === user.id) ||
        (m.sender_id === user.id && m.recipient_id === contactId),
      );
      const isSavedContact = (savedContacts || []).some((item: any) => item.target_id === contactId);
      
      const isMasterOrBusiness = contactRoles.has('master') || contactRoles.has('business_owner') || contactRoles.has('business_manager') || contactRoles.has('network_owner') || contactRoles.has('network_manager');
      const isPlatform = contactRoles.has('platform_admin') || contactRoles.has('super_admin') || contactRoles.has('platform_manager') || contactRoles.has('moderator') || contactRoles.has('support');
      const isClient = contactRoles.has('client');
      
      if (hasMessageHistory || isSavedContact) return true;

      switch (effectiveCabinet) {
        case 'client':
          // Clients see masters, business staff, and platform admins
          return isMasterOrBusiness || isPlatform;
        case 'master':
        case 'business':
          // Business/Master see clients and platform admins
          return isClient || isPlatform;
        case 'platform':
          // Platform sees clients and business users
          return isClient || isMasterOrBusiness;
        default:
          return true;
      }
    };

    let unreadTotal = 0;
    const contactList: ChatContact[] = profiles
      .filter(p => isAllowedContact(p.id))
      .map(p => {
        const contactMsgs = relevantMsgs.filter(m =>
          (m.sender_id === p.id && m.recipient_id === user.id) ||
          (m.sender_id === user.id && m.recipient_id === p.id)
        );
        const lastMsg = contactMsgs[0];
        const unread = contactMsgs.filter(m => m.sender_id === p.id && m.recipient_id === user.id && !m.is_read).length;
        const contactRoles = roleMap.get(p.id) || new Set<string>();
        const inferredTargetCabinet =
          getConversationScope(undefined, contactMsgs) ||
          (effectiveCabinet === 'client'
            ? ((contactRoles.has('master') && !contactRoles.has('business_owner') && !contactRoles.has('business_manager') && !contactRoles.has('network_owner') && !contactRoles.has('network_manager'))
                ? 'master'
                : (contactRoles.has('business_owner') || contactRoles.has('business_manager') || contactRoles.has('network_owner') || contactRoles.has('network_manager'))
                  ? 'business'
                  : null)
            : 'client');
        const lastMessageLabel =
          lastMsg?.audio_url
            ? '🎤 Голосовое'
            : lastMsg?.media_urls?.length
              ? '📎 Вложение'
              : lastMsg?.attachment_url
                ? '📎 Вложение'
                : lastMsg?.message;
        unreadTotal += unread;
        return {
          id: p.id, first_name: p.first_name, last_name: p.last_name, email: p.email,
          targetCabinet: inferredTargetCabinet,
          lastMessage: lastMessageLabel,
          lastMessageAt: lastMsg?.created_at,
          unread,
        };
      });
    
    // Sort: contacts with messages first (by recency), then contacts without messages (alphabetically)
    setContacts(contactList.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) return b.lastMessageAt.localeCompare(a.lastMessageAt);
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return `${a.first_name || ''} ${a.last_name || ''}`.localeCompare(`${b.first_name || ''} ${b.last_name || ''}`);
    }));
    setTotalUnread(unreadTotal);
    onUnreadChange?.(unreadTotal);
    setLoading(false);
  };

  const openChat = async (contact: ChatContact) => {
    setSelectedContact(contact);
    setShowEmoji(false);
    if (!user) return;
    const { data } = await supabase.from('chat_messages').select('*')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${contact.id}),and(sender_id.eq.${contact.id},recipient_id.eq.${user.id})`)
      .eq('chat_type', 'direct')
      .order('created_at', { ascending: true });
    const scopedData = (data || []).filter((msg: any) => {
      if (effectiveCabinet === 'client') {
        return !contact.targetCabinet || !msg.cabinet_type_scope || msg.cabinet_type_scope === contact.targetCabinet;
      }
      return msg.cabinet_type_scope === effectiveCabinet;
    });
    setMessages(scopedData);
    // Mark unread messages from this contact as read
    const unreadIds = scopedData.filter((m: any) => m.sender_id === contact.id && !m.is_read).map((m: any) => m.id);
    if (unreadIds.length > 0) {
      await supabase.from('chat_messages').update({ is_read: true, is_delivered: true })
        .in('id', unreadIds);
    }
    // Update local unread count immediately
    setContacts(prev => {
      const updated = prev.map(c => c.id === contact.id ? { ...c, unread: 0 } : c);
      const newTotal = updated.reduce((sum, c) => sum + c.unread, 0);
      setTotalUnread(newTotal);
      onUnreadChange?.(newTotal);
      return updated;
    });
  };

  const sendMessage = async (overrides?: { audio_url?: string; media_urls?: string[]; message_type?: string }) => {
    if (!user || !selectedContact) return;
    if (isSelfInteraction(user.id, selectedContact.id)) {
      toast({ title: 'Нельзя писать самому себе', variant: 'destructive' });
      return;
    }
    const text = newMessage.trim();
    if (!text && !overrides?.audio_url && !overrides?.media_urls?.length) return;
    const messageText = text || (overrides?.audio_url ? '🎤 Голосовое' : '📎 Вложение');

    const { data: blocked } = await supabase.from('blacklists').select('id').eq('blocker_id', selectedContact.id).eq('blocked_id', user.id).maybeSingle();
    if (blocked) { toast({ title: 'Чат заблокирован собеседником', variant: 'destructive' }); return; }

    const conversationScope = getConversationScope(selectedContact, messages);
    const { error } = await supabase.from('chat_messages').insert({
      sender_id: user.id, recipient_id: selectedContact.id,
      message: messageText,
      chat_type: 'direct',
      cabinet_type_scope: conversationScope,
      message_type: overrides?.message_type || (overrides?.audio_url ? 'audio' : overrides?.media_urls?.length ? 'media' : 'text'),
      audio_url: overrides?.audio_url || null,
      media_urls: overrides?.media_urls || null,
      attachment_url: overrides?.media_urls?.length === 1 ? overrides.media_urls[0] : null,
      attachment_type: overrides?.media_urls?.length === 1 ? 'file' : null,
    });
    if (error) {
      toast({ title: 'Не удалось отправить сообщение', description: error.message, variant: 'destructive' });
      return;
    }

    await syncBidirectionalContacts(user.id, selectedContact.id);
    await supabase.functions.invoke('send-push-notification', {
      body: {
        user_ids: [selectedContact.id],
        title: effectiveCabinet === 'client' ? 'Новое сообщение клиенту' : 'Новое сообщение от бизнеса',
        body: messageText,
        url: `/dashboard?section=${effectiveCabinet === 'client' ? 'communication' : 'messages'}&tab=chats&contact=${user.id}`,
        tag: 'direct-chat',
      },
    }).catch(() => null);
    setNewMessage('');
    setShowEmoji(false);
    await fetchContacts();
  };

  const handleAddToContacts = async () => {
    if (!user || !selectedContact) return;
    await syncBidirectionalContacts(user.id, selectedContact.id);

    toast({ title: 'Контакт сохранён', description: `${selectedContact.first_name || ''} добавлен в контакты` });
    await fetchContacts();
  };

  const handleAddToClients = async () => {
    if (!user || !selectedContact) return;
    if (isSelfInteraction(user.id, selectedContact.id)) {
      toast({ title: 'Нельзя добавить себя в клиенты', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('client_tags').insert({
      client_id: selectedContact.id, tagger_id: user.id, tag: 'new', note: 'Добавлен из чата',
    });
    if (error && error.code !== '23505') {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Добавлен в клиенты', description: `${selectedContact.first_name || ''} добавлен со статусом «Новый»` });
    }
  };

  const handleBlockInChat = async () => {
    if (!user || !selectedContact) return;
    if (isSelfInteraction(user.id, selectedContact.id)) {
      toast({ title: 'Нельзя заблокировать самого себя', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('blacklists').insert({
      blocker_id: user.id, blocked_id: selectedContact.id, reason: 'Заблокирован в чате',
    });
    if (error) toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Собеседник заблокирован' }); setSelectedContact(null); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const getInitials = (first?: string | null, last?: string | null) =>
    `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase() || '?';

  const getTimeLabel = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return format(d, 'HH:mm');
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дн.`;
    return format(d, 'd MMM', { locale: ru });
  };

  const getMessageStatus = (msg: any) => {
    if (msg.sender_id !== user?.id) return null;
    if (msg.is_read) return <CheckCheck className="h-3 w-3 text-primary" />;
    if (msg.is_delivered) return <CheckCheck className="h-3 w-3 text-primary-foreground/60" />;
    return <Check className="h-3 w-3 text-primary-foreground/60" />;
  };

  const filteredContacts = contacts.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.first_name?.toLowerCase().includes(q) || c.last_name?.toLowerCase().includes(q);
  });

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] gap-0 rounded-lg border overflow-hidden bg-card">
      {/* Contact List */}
      <div className={`flex flex-col border-r shrink-0 transition-all ${selectedContact ? 'hidden md:flex md:w-72' : 'w-full md:w-72'}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              Чаты
              {totalUnread > 0 && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">{totalUnread}</span>
              )}
            </h3>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Поиск..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Загрузка...</p>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Нет диалогов</p>
            </div>
          ) : filteredContacts.map(contact => (
            <div
              key={contact.id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 border-b ${selectedContact?.id === contact.id ? 'bg-muted' : ''}`}
              onClick={() => openChat(contact)}
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(contact.first_name, contact.last_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm truncate">{contact.first_name} {contact.last_name}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{getTimeLabel(contact.lastMessageAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate">{contact.lastMessage || 'Нет сообщений'}</p>
                  {contact.unread > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0 ml-2">
                      {contact.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
        {!selectedContact ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Выберите диалог</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b flex items-center justify-between bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSelectedContact(null)}>←</Button>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(selectedContact.first_name, selectedContact.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{selectedContact.first_name} {selectedContact.last_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedContact.targetCabinet === 'business'
                      ? 'Организация в SkillSpot'
                      : selectedContact.targetCabinet === 'master'
                        ? 'Мастер в SkillSpot'
                        : selectedContact.targetCabinet === 'client'
                          ? 'Клиент в SkillSpot'
                          : 'Контакт в SkillSpot'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" title="Сохранить контакт" onClick={handleAddToContacts}>
                  <UserPlus className="h-4 w-4" />
                </Button>
                {effectiveCabinet !== 'client' && (
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Добавить в клиенты" onClick={handleAddToClients}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Заблокировать" onClick={handleBlockInChat}>
                  <ShieldBan className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      msg.sender_id === user?.id
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted rounded-bl-sm'
                    }`}>
                      <ChatAttachmentContent message={msg} />
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <span className={`text-[10px] ${msg.sender_id === user?.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                        {getMessageStatus(msg)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t flex items-end gap-2 bg-card/80">
              {user && <MediaUploader userId={user.id} onUploaded={(urls) => sendMessage({ media_urls: urls })} />}
              {user && <VoiceRecorder userId={user.id} onUploaded={(url) => sendMessage({ audio_url: url })} />}
              <div className="flex-1 relative">
                <Input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Сообщение..."
                  className="pr-10"
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowEmoji(!showEmoji)}
                >
                  <Smile className="h-4 w-4" />
                </button>
                {showEmoji && (
                  <div className="absolute bottom-full right-0 mb-2 p-2 bg-card rounded-lg border shadow-lg grid grid-cols-10 gap-1 max-h-48 overflow-y-auto w-[320px] z-50">
                    {EMOJI_LIST.map(e => (
                      <button key={e} className="text-lg hover:bg-muted rounded p-0.5" onClick={() => { setNewMessage(prev => prev + e); setShowEmoji(false); }}>
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => sendMessage()} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TeachingChats;
