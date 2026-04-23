import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Send, Search, Paperclip, Image, Smile, UserPlus, ShieldBan, Check, CheckCheck, X } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
  lastMessage?: string;
  lastMessageAt?: string;
  unread: number;
  isGroup?: boolean;
  groupId?: string;
}

interface FileAttachItem {
  file: File;
  preview?: string;
  type: 'image' | 'file';
}

interface FileAttachDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (files: FileAttachItem[], comment: string) => void;
  uploading: boolean;
}

const FileAttachDialog = ({ open, onClose, onSend, uploading }: FileAttachDialogProps) => {
  const [files, setFiles] = useState<FileAttachItem[]>([]);
  const [comment, setComment] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const handleFiles = (selected: FileList | null, type: 'image' | 'file') => {
    if (!selected) return;
    const items: FileAttachItem[] = Array.from(selected).map(f => ({
      file: f, type,
      preview: type === 'image' ? URL.createObjectURL(f) : undefined,
    }));
    setFiles(prev => [...prev, ...items]);
  };

  const remove = (idx: number) => {
    setFiles(prev => {
      const item = prev[idx];
      if (item.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSend = () => { onSend(files, comment); setFiles([]); setComment(''); };

  const handleClose = () => { files.forEach(f => f.preview && URL.revokeObjectURL(f.preview)); setFiles([]); setComment(''); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Прикрепить файлы</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => imageRef.current?.click()}><Image className="h-4 w-4 mr-1" /> Фото</Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Paperclip className="h-4 w-4 mr-1" /> Файл</Button>
            <input ref={imageRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files, 'image')} />
            <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files, 'file')} />
          </div>
          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {files.map((f, i) => (
                <div key={i} className="relative group rounded-lg border overflow-hidden bg-muted">
                  {f.preview
                    ? <img src={f.preview} alt="" className="w-full h-20 object-cover" />
                    : <div className="w-full h-20 flex items-center justify-center"><Paperclip className="h-6 w-6 text-muted-foreground" /><span className="text-[10px] truncate px-1">{f.file.name}</span></div>
                  }
                  <button className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 hidden group-hover:block" onClick={() => remove(i)}><X className="h-3 w-3 text-white" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Комментарий (необязательно)</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Добавить комментарий..." rows={2} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleClose}>Отмена</Button>
            <Button className="flex-1" onClick={handleSend} disabled={files.length === 0 || uploading}>
              {uploading ? 'Отправка...' : `Отправить (${files.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine effective cabinet context
  const effectiveCabinet: CabinetContext = cabinetContext || (isClientContext ? 'client' : 'master');

  useEffect(() => { if (user) fetchContacts(); }, [user, effectiveCabinet]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Listen for open-chat-with event
  useEffect(() => {
    const handler = async (e: CustomEvent) => {
      const contactId = e.detail;
      if (!contactId || !user) return;
      const { data: profile } = await supabase.from('profiles').select('id, first_name, last_name, email').eq('id', contactId).maybeSingle();
      if (profile) {
        const contact: ChatContact = { id: profile.id, first_name: profile.first_name, last_name: profile.last_name, email: profile.email, unread: 0 };
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
        if (msg.chat_type === 'support') return;
        const isMine = msg.sender_id === user.id || msg.recipient_id === user.id;
        if (!isMine) return;
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
      .neq('chat_type', 'support')
      .order('created_at', { ascending: false });

    // Collect unique contact IDs from messages
    const contactIds = new Set<string>();
    (msgs || []).forEach(m => {
      if (m.sender_id !== user.id) contactIds.add(m.sender_id);
      if (m.recipient_id !== user.id) contactIds.add(m.recipient_id);
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
        const { data: masterUsers } = await supabase.from('master_profiles').select('user_id').in('id', masterFavIds);
        (masterUsers || []).forEach((m: any) => m.user_id && contactIds.add(m.user_id));
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
    
    // Build role map
    const roleMap = new Map<string, Set<string>>();
    roles.forEach(r => {
      if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, new Set());
      roleMap.get(r.user_id)!.add(r.role);
    });
    
    // Filter contacts by cabinet context
    const isAllowedContact = (contactId: string): boolean => {
      const contactRoles = roleMap.get(contactId) || new Set();
      
      const isMasterOrBusiness = contactRoles.has('master') || contactRoles.has('business_owner') || contactRoles.has('business_manager') || contactRoles.has('network_owner') || contactRoles.has('network_manager');
      const isPlatform = contactRoles.has('platform_admin') || contactRoles.has('super_admin') || contactRoles.has('platform_manager') || contactRoles.has('moderator') || contactRoles.has('support');
      const isClient = contactRoles.has('client');
      
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
        const contactMsgs = msgs.filter(m =>
          (m.sender_id === p.id && m.recipient_id === user.id) ||
          (m.sender_id === user.id && m.recipient_id === p.id)
        );
        const lastMsg = contactMsgs[0];
        const unread = contactMsgs.filter(m => m.sender_id === p.id && m.recipient_id === user.id && !m.is_read).length;
        unreadTotal += unread;
        return {
          id: p.id, first_name: p.first_name, last_name: p.last_name, email: p.email,
          lastMessage: lastMsg?.attachment_url ? '📎 Вложение' : lastMsg?.message,
          lastMessageAt: lastMsg?.created_at,
          unread,
        };
      });
    
    setContacts(contactList.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || '')));
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
      .order('created_at', { ascending: true });
    setMessages(data || []);
    // Mark unread messages from this contact as read
    const unreadIds = (data || []).filter(m => m.sender_id === contact.id && !m.is_read).map(m => m.id);
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

  const sendMessage = async (attachmentUrl?: string, attachmentType?: string, overrideText?: string) => {
    if (!user || !selectedContact) return;
    const text = overrideText ?? newMessage.trim();
    if (!text && !attachmentUrl) return;
    const messageText = text || (attachmentType === 'image' ? '📷 Фото' : '📎 Файл');

    const { data: blocked } = await supabase.from('blacklists').select('id').eq('blocker_id', selectedContact.id).eq('blocked_id', user.id).maybeSingle();
    if (blocked) { toast({ title: 'Чат заблокирован собеседником', variant: 'destructive' }); return; }

    const { error } = await supabase.from('chat_messages').insert({
      sender_id: user.id, recipient_id: selectedContact.id,
      message: messageText,
      chat_type: 'direct',
      cabinet_type_scope: effectiveCabinet,
      attachment_url: attachmentUrl || null,
      attachment_type: attachmentType || null,
    });
    if (!error) { setNewMessage(''); setShowEmoji(false); }
  };

  const handleFileSend = async (files: FileAttachItem[], comment: string) => {
    if (!user || !selectedContact) return;
    setUploadingFile(true);
    setShowFileDialog(false);
    try {
      for (const item of files) {
        if (item.file.size > 20 * 1024 * 1024) continue;
        const ext = item.file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('portfolio').upload(path, item.file);
        if (error) continue;
        const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(path);
        await sendMessage(urlData.publicUrl, item.type, comment || undefined);
      }
    } catch (err: any) {
      toast({ title: 'Ошибка загрузки', description: err.message, variant: 'destructive' });
    } finally { setUploadingFile(false); }
  };

  const handleAddToContacts = async () => {
    if (!user || !selectedContact) return;
    toast({ title: 'Контакт сохранён', description: `${selectedContact.first_name || ''} добавлен в контакты` });
  };

  const handleAddToClients = async () => {
    if (!user || !selectedContact) return;
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
    return c.first_name?.toLowerCase().includes(q) || c.last_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
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
                  <p className="text-[10px] text-muted-foreground">{selectedContact.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {effectiveCabinet === 'client' ? (
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Сохранить контакт" onClick={handleAddToContacts}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                ) : (
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
                      {msg.attachment_url && msg.attachment_type === 'image' && (
                        <img src={msg.attachment_url} alt="" className="rounded-lg max-w-[240px] mb-1 cursor-pointer" onClick={() => window.open(msg.attachment_url, '_blank')} />
                      )}
                      {msg.attachment_url && msg.attachment_type === 'file' && (
                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs underline mb-1">
                          <Paperclip className="h-3 w-3" /> Скачать файл
                        </a>
                      )}
                      {msg.message && !(msg.attachment_url && (msg.message === '📷 Фото' || msg.message === '📎 Файл')) && (
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      )}
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
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowFileDialog(true)}>
                <Paperclip className="h-4 w-4" />
              </Button>
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

      <FileAttachDialog open={showFileDialog} onClose={() => setShowFileDialog(false)} onSend={handleFileSend} uploading={uploadingFile} />
    </div>
  );
};

export default TeachingChats;
