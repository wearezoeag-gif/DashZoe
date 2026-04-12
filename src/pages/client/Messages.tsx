import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Send, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Message = {
  id: string;
  sender: 'admin' | 'client';
  sender_name: string;
  text: string;
  created_at: string;
};

export default function ClientMessages() {
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setLoading(false); return; }
      setClientEmail(user.email);

      const { data: evento } = await supabase
        .from('eventos')
        .select('id')
        .eq('cliente_email', user.email)
        .single();

      if (evento) setEventId(evento.id);
      setLoading(false);
    };
    void init();
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchMessages = async (email: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('client_email', email)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => {
    if (!clientEmail) return;
    void fetchMessages(clientEmail);

    const channel = supabase
      .channel(`messages-${clientEmail}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        void fetchMessages(clientEmail);
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [clientEmail]);

  // ── Scroll ────────────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Enviar ────────────────────────────────────────────────────────────────

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !clientEmail || sending) return;

    setSending(true);
    const { error } = await supabase.from('messages').insert({
      client_email: clientEmail,
      event_id: eventId,
      sender: 'client',
      sender_name: 'Cliente',
      text: newMessage.trim(),
    });

    if (!error) {
      setNewMessage('');
      void fetchMessages(clientEmail);
    }
    setSending(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5EFE6' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606', display: 'flex', flexDirection: 'column' }}>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', fontWeight: 400, marginBottom: '4px' }}>Mensagens</h1>
        <p style={{ fontSize: '13px', opacity: 0.5 }}>Fale com a equipe Studio Zoe</p>
      </div>

      <div style={{ flex: 1, background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '500px' }}>

        {/* Mensagens */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.35, padding: '48px 0' }}>
              <MessageCircle size={40} style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '13px' }}>Nenhuma mensagem ainda</p>
              <p style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>Envie uma mensagem para a equipe Studio Zoe</p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isAdmin = msg.sender === 'admin';
            return (
              <motion.div key={msg.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i < 10 ? i * 0.03 : 0 }}
                style={{ display: 'flex', justifyContent: isAdmin ? 'flex-start' : 'flex-end' }}>
                <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {isAdmin && (
                    <p style={{ fontSize: '11px', color: '#5C1A2E', fontWeight: 500, paddingLeft: '4px', opacity: 0.8 }}>Studio Zoe</p>
                  )}
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: isAdmin ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                    background: isAdmin ? '#5C1A2E' : '#B8965A',
                    color: isAdmin ? '#F5EFE6' : '#230606',
                  }}>
                    <p style={{ fontSize: '14px', lineHeight: 1.5 }}>{msg.text}</p>
                    <p style={{ fontSize: '11px', opacity: 0.55, marginTop: '6px', textAlign: 'right' }}>
                      {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} style={{ padding: '16px 24px', borderTop: '1px solid rgba(184,150,90,0.15)', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            style={{ flex: 1, background: '#F5EFE6', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '8px', padding: '11px 16px', fontSize: '14px', color: '#230606', outline: 'none', fontFamily: 'Inter, sans-serif' }}
          />
          <button type="submit" disabled={sending || !newMessage.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 22px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '8px', cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 500, opacity: sending || !newMessage.trim() ? 0.6 : 1, transition: 'opacity 0.2s' }}>
            <Send size={15} /> Enviar
          </button>
        </form>
      </div>
    </div>
  );
}