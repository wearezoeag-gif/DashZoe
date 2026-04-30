import React, { useEffect, useRef, useState } from 'react';
import { Bell, MessageCircle, FileText, Image, DollarSign, Users, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router';

type NotifType = 'message' | 'contract' | 'document' | 'moodboard' | 'payment' | 'guest' | 'receipt';

type Notification = {
  id: string;
  type: NotifType;
  title: string;
  body: string | null;
  event_id: string | null;
  read: boolean;
  created_at: string;
  recipient: string;
};

const typeConfig: Record<NotifType, { icon: React.ElementType; color: string; bg: string; label: string; route: (recipient: string, eventId?: string | null) => string }> = {
  message:   { icon: MessageCircle, color: '#5C1A2E', bg: 'rgba(92,26,46,0.1)',   label: 'Mensagem',    route: (r) => r === 'admin' ? '/admin/eventos' : '/cliente/mensagens' },
  contract:  { icon: FileText,      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Contrato',    route: (r) => r === 'admin' ? '/admin/eventos' : '/cliente/contratos' },
  document:  { icon: FileText,      color: '#ca8a04', bg: 'rgba(234,179,8,0.1)',  label: 'Documento',   route: (r) => r === 'admin' ? '/admin/eventos' : '/cliente/arquivos' },
  moodboard: { icon: Image,         color: '#9333ea', bg: 'rgba(168,85,247,0.1)', label: 'Moodboard',   route: (r, id) => r === 'admin' ? '/admin/eventos' : `/cliente/moodboard/${id ?? ''}` },
  payment:   { icon: DollarSign,    color: '#16a34a', bg: 'rgba(34,197,94,0.1)',  label: 'Pagamento',   route: (r) => r === 'admin' ? '/admin/financeiro' : '/cliente/financeiro' },
  guest:     { icon: Users,         color: '#B8965A', bg: 'rgba(184,150,90,0.1)', label: 'Convidado',   route: (r) => r === 'admin' ? '/admin/eventos' : '/cliente/convidados' },
  receipt:   { icon: DollarSign,    color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', label: 'Comprovante', route: (r) => r === 'admin' ? '/admin/financeiro' : '/cliente/financeiro' },
};

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface Props {
  recipient: string;
}

export default function NotificationBell({ recipient }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unread = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient', recipient)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifications((data || []) as Notification[]);
  };

  useEffect(() => {
    void fetchNotifications();
    const channel = supabase
      .channel(`notif-${recipient}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => { void fetchNotifications(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [recipient]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('recipient', recipient).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotifClick = async (n: Notification) => {
    await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    setOpen(false);
    const cfg = typeConfig[n.type] || typeConfig.message;
    navigate(cfg.route(recipient, n.event_id));
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '36px', height: '36px', borderRadius: '8px',
          background: open ? 'rgba(184,150,90,0.15)' : 'rgba(184,150,90,0.08)',
          border: '1px solid rgba(184,150,90,0.2)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'background 0.2s',
        }}
      >
        <Bell size={16} style={{ color: '#B8965A' }} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            width: '18px', height: '18px', borderRadius: '50%',
            background: '#dc2626', color: '#fff',
            fontSize: '10px', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '44px', right: 0,
          width: '360px', maxHeight: '480px',
          background: '#FDFAF6',
          border: '1px solid rgba(184,150,90,0.2)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(35,6,6,0.12)',
          zIndex: 100,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>
                Notificações
              </h3>
              {unread > 0 && (
                <span style={{ fontSize: '11px', background: '#dc2626', color: '#fff', borderRadius: '20px', padding: '1px 7px', fontWeight: 500 }}>
                  {unread} nova{unread > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#B8965A' }}>
                <Check size={12} /> Marcar todas como lidas
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <Bell size={32} style={{ margin: '0 auto 12px', color: '#230606', opacity: 0.15 }} />
                <p style={{ fontSize: '13px', color: '#230606', opacity: 0.4 }}>Nenhuma notificação</p>
              </div>
            ) : notifications.map(n => {
              const cfg = typeConfig[n.type] || typeConfig.message;
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid rgba(184,150,90,0.08)',
                    display: 'flex', gap: '12px', alignItems: 'flex-start',
                    cursor: 'pointer',
                    background: n.read ? 'transparent' : 'rgba(184,150,90,0.04)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(184,150,90,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(184,150,90,0.04)')}
                >
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={15} style={{ color: cfg.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '3px' }}>
                      <p style={{ fontSize: '13px', color: '#230606', fontWeight: n.read ? 400 : 500, lineHeight: 1.3 }}>
                        {n.title}
                      </p>
                      <span style={{ fontSize: '11px', color: '#230606', opacity: 0.35, flexShrink: 0 }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    {n.body && (
                      <p style={{ fontSize: '12px', color: '#230606', opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.body}
                      </p>
                    )}
                    <span style={{ fontSize: '10px', color: cfg.color, marginTop: '4px', display: 'inline-block', background: cfg.bg, padding: '1px 6px', borderRadius: '20px' }}>
                      {cfg.label}
                    </span>
                  </div>
                  {!n.read && (
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#dc2626', flexShrink: 0, marginTop: '4px' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}