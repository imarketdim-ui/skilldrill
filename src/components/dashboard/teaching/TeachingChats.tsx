import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchContacts();
  }, [user]);

  const fetchContacts = async () => {
    if (!user) return;
    setLoading(true);

    // Get all chat messages involving this user
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!msgs || msgs.length === 0) {
      // Fallback: get students from bookings
      const { data: bookings } = await supabase
        .from('lesson_bookings')
        .select('student_id, lessons!inner(teacher_id)')
        .eq('lessons.teacher_id', user.id);

      if (bookings) {
        const studentIds = [...new Set(bookings.map(b => b.student_id))];
        if (studentIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', studentIds);
          
          setContacts((profiles || []).map(p => ({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.email,
            unread: 0,
          })));
        }
      }
      setLoading(false);
      return;
    }

    // Build contact list from messages
    const contactIds = new Set<string>();
    msgs.forEach(m => {
      if (m.sender_id !== user.id) contactIds.add(m.sender_id);
      if (m.recipient_id !== user.id) contactIds.add(m.recipient_id);
    });

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', Array.from(contactIds));

    const contactList: ChatContact[] = (profiles || []).map(p => {
      const contactMsgs = msgs.filter(m =>
        (m.sender_id === p.id && m.recipient_id === user.id) ||
        (m.sender_id === user.id && m.recipient_id === p.id)
      );
      const lastMsg = contactMsgs[0];
      const unread = contactMsgs.filter(m => m.recipient_id === user.id && !m.is_read).length;

      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        lastMessage: lastMsg?.message,
        lastMessageAt: lastMsg?.created_at,
        unread,
      };
    });

    setContacts(contactList.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    }));
    setLoading(false);
  };

  const openChat = async (contact: ChatContact) => {
    setSelectedContact(contact);
    if (!user) return;

    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${contact.id}),and(sender_id.eq.${contact.id},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    setMessages(data || []);

    // Mark as read
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('sender_id', contact.id)
      .eq('recipient_id', user.id)
      .eq('is_read', false);
  };

  const sendMessage = async () => {
    if (!user || !selectedContact || !newMessage.trim()) return;

    const { error } = await supabase.from('chat_messages').insert({
      sender_id: user.id,
      recipient_id: selectedContact.id,
      message: newMessage.trim(),
      chat_type: 'direct',
    });

    if (!error) {
      setNewMessage('');
      openChat(selectedContact);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Чаты</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[500px]">
        {/* Contact List */}
        <Card className="md:col-span-1">
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
              ) : contacts.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">Нет контактов</p>
                </div>
              ) : (
                contacts.map(contact => (
                  <div
                    key={contact.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 border-b ${selectedContact?.id === contact.id ? 'bg-muted' : ''}`}
                    onClick={() => openChat(contact)}
                  >
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {contact.first_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {contact.first_name || ''} {contact.last_name || contact.email || ''}
                      </p>
                      {contact.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
                      )}
                    </div>
                    {contact.unread > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {contact.unread}
                      </span>
                    )}
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="md:col-span-2">
          <CardContent className="p-0 flex flex-col h-[500px]">
            {!selectedContact ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>Выберите чат</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-3 border-b flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedContact.first_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{selectedContact.first_name} {selectedContact.last_name}</p>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-3 rounded-lg text-sm ${
                          msg.sender_id === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          <p>{msg.message}</p>
                          <p className={`text-[10px] mt-1 ${msg.sender_id === user?.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            {format(new Date(msg.created_at), 'HH:mm', { locale: ru })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-3 border-t flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Сообщение..."
                    className="flex-1"
                  />
                  <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeachingChats;
