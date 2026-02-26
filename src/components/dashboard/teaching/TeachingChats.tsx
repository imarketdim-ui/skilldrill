import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Search, Paperclip, Image } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ChatContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  unread: number;
}

const TeachingChats = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (user) fetchContacts(); }, [user]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`teaching-chat-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, (payload) => {
        const msg = payload.new as any;
        const isMine = msg.sender_id === user.id || msg.recipient_id === user.id;
        if (!isMine) return;

        if (selectedContact && (
          (msg.sender_id === selectedContact.id && msg.recipient_id === user.id) ||
          (msg.sender_id === user.id && msg.recipient_id === selectedContact.id)
        )) {
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.sender_id === selectedContact.id) {
            supabase.from('chat_messages').update({ is_read: true }).eq('id', msg.id);
          }
        }

        fetchContacts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedContact]);

  const fetchContacts = async () => {
    if (!user) return;
    setLoading(true);
    const { data: msgs } = await supabase.from('chat_messages').select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!msgs || msgs.length === 0) {
      const { data: bookings } = await supabase.from('lesson_bookings')
        .select('student_id, lessons!inner(teacher_id)').eq('lessons.teacher_id', user.id);
      if (bookings) {
        const ids = [...new Set(bookings.map(b => b.student_id))];
        if (ids.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, email').in('id', ids);
          setContacts((profiles || []).map(p => ({ id: p.id, first_name: p.first_name, last_name: p.last_name, email: p.email, unread: 0 })));
        }
      }
      setLoading(false);
      return;
    }

    const contactIds = new Set<string>();
    msgs.forEach(m => { if (m.sender_id !== user.id) contactIds.add(m.sender_id); if (m.recipient_id !== user.id) contactIds.add(m.recipient_id); });
    const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, email').in('id', Array.from(contactIds));

    const contactList: ChatContact[] = (profiles || []).map(p => {
      const contactMsgs = msgs.filter(m => (m.sender_id === p.id && m.recipient_id === user.id) || (m.sender_id === user.id && m.recipient_id === p.id));
      const lastMsg = contactMsgs[0];
      return {
        id: p.id, first_name: p.first_name, last_name: p.last_name, email: p.email,
        lastMessage: lastMsg?.message, lastMessageAt: lastMsg?.created_at,
        unread: contactMsgs.filter(m => m.recipient_id === user.id && !m.is_read).length,
      };
    });
    setContacts(contactList.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || '')));
    setLoading(false);
  };

  const openChat = async (contact: ChatContact) => {
    setSelectedContact(contact);
    if (!user) return;
    const { data } = await supabase.from('chat_messages').select('*')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${contact.id}),and(sender_id.eq.${contact.id},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    await supabase.from('chat_messages').update({ is_read: true }).eq('sender_id', contact.id).eq('recipient_id', user.id).eq('is_read', false);
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, unread: 0 } : c));
  };

  const sendMessage = async () => {
    if (!user || !selectedContact || !newMessage.trim()) return;

    const { data: blocked } = await supabase.from('blacklists').select('id').eq('blocker_id', selectedContact.id).eq('blocked_id', user.id).maybeSingle();
    if (blocked) return;

    const { error } = await supabase.from('chat_messages').insert({
      sender_id: user.id, recipient_id: selectedContact.id, message: newMessage.trim(), chat_type: 'direct',
    });

    if (!error) {
      setNewMessage('');
      openChat(selectedContact);
      fetchContacts();
    }
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
    if (diffDays < 7) return `${diffDays} дня назад`;
    return format(d, 'd MMM', { locale: ru });
  };

  const filteredContacts = contacts.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.first_name?.toLowerCase().includes(q) || c.last_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] gap-0 rounded-lg border overflow-hidden bg-card">
      {/* Contact List */}
      <div className={`w-full md:w-80 border-r flex flex-col shrink-0 ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b">
          <h3 className="text-lg font-bold mb-3">Чаты</h3>
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
              <p className="text-sm text-muted-foreground">Нет контактов</p>
            </div>
          ) : (
            filteredContacts.map(contact => (
              <div
                key={contact.id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 border-b transition-colors ${selectedContact?.id === contact.id ? 'bg-muted' : ''}`}
                onClick={() => openChat(contact)}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(contact.first_name, contact.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">
                      {contact.first_name || ''} {contact.last_name || contact.email || ''}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">{getTimeLabel(contact.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">{contact.lastMessage || 'Начните диалог'}</p>
                    {contact.unread > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shrink-0 ml-2">
                        {contact.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Messages Panel */}
      <div className={`flex-1 flex flex-col min-w-0 ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
        {!selectedContact ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Выберите чат</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center gap-3">
              <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSelectedContact(null)}>←</Button>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials(selectedContact.first_name, selectedContact.last_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{selectedContact.first_name} {selectedContact.last_name}</p>
                <p className="text-xs text-emerald-600">В сети</p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.sender_id === user?.id
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted rounded-bl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                      <div className={`flex items-center gap-1 mt-1 ${msg.sender_id === user?.id ? 'justify-end' : ''}`}>
                        <p className={`text-[10px] ${msg.sender_id === user?.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </p>
                        {msg.sender_id === user?.id && <span className="text-[10px] text-primary-foreground/60">✓</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t flex items-center gap-2">
              <Button size="icon" variant="ghost" className="text-muted-foreground shrink-0"><Paperclip className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="text-muted-foreground shrink-0"><Image className="h-4 w-4" /></Button>
              <Input
                value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Написать сообщение..." className="flex-1"
              />
              <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim()} className="shrink-0">
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
