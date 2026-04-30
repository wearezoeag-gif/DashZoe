import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, XCircle, Users, Search, UserPlus, Upload, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useIsMobile } from '../../hooks/useIsMobile';

type Guest = {
  id: string;
  name: string;
  status: 'pending' | 'confirmed' | 'declined';
  companions: number;
  dietary: string | null;
  special_needs: string | null;
  confirmed_at: string | null;
};

const card: React.CSSProperties = {
  background: '#FDFAF6',
  border: '1px solid rgba(184,150,90,0.2)',
  borderRadius: '10px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#F5EFE6',
  border: '1px solid rgba(184,150,90,0.25)',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '13px',
  color: '#230606',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: '#230606',
  opacity: 0.5,
  marginBottom: '6px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

const statusConfig = {
  confirmed: { label: 'Confirmado', bg: 'rgba(34,197,94,0.1)',  color: '#16a34a', icon: CheckCircle2 },
  pending:   { label: 'Pendente',   bg: 'rgba(184,150,90,0.1)', color: '#B8965A', icon: Clock },
  declined:  { label: 'Recusado',   bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', icon: XCircle },
};

export default function ClientGuests() {
  const isMobile = useIsMobile();
  const [eventId, setEventId] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'declined'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: '', companions: '0', dietary: '' });

  useEffect(() => {
    const fetchGuests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setLoading(false); return; }

      const { data: evento } = await supabase
        .from('eventos')
        .select('id')
        .eq('cliente_email', user.email)
        .single();

      if (!evento) { setLoading(false); return; }

      setEventId(evento.id);

      const { data } = await supabase
        .from('guests')
        .select('id, name, status, companions, dietary, special_needs, confirmed_at')
        .eq('event_id', evento.id)
        .order('name', { ascending: true });

      setGuests(data || []);
      setLoading(false);
    };

    void fetchGuests();
  }, []);

  // ── Adicionar convidado ──────────────────────────────────────────────────

  const addGuest = async () => {
    if (!newGuest.name.trim() || !eventId) return;
    setSaving(true);
    const { data } = await supabase.from('guests').insert({
      event_id: eventId,
      name: newGuest.name.trim(),
      companions: Number(newGuest.companions) || 0,
      dietary: newGuest.dietary || null,
      status: 'pending',
    }).select().single();
    if (data) setGuests(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewGuest({ name: '', companions: '0', dietary: '' });
    setShowAddModal(false);
    setSaving(false);
  };

  // ── Importar CSV ──────────────────────────────────────────────────────────

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;
    setUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const rows = lines.slice(1);
      const toInsert = rows.map(row => {
        const cols = row.split(',').map(c => c.trim().replace(/"/g, ''));
        return {
          event_id: eventId,
          name: cols[0] || '',
          companions: Number(cols[1]) || 0,
          dietary: cols[2] || null,
          status: 'pending' as const,
        };
      }).filter(g => g.name);
      if (toInsert.length > 0) {
        await supabase.from('guests').insert(toInsert);
        const { data } = await supabase.from('guests').select('*').eq('event_id', eventId).order('name');
        setGuests(data || []);
      }
    } catch (err) {
      console.error('Erro ao importar:', err);
    }
    setUploading(false);
    e.target.value = '';
  };

  // ── Excluir convidado ─────────────────────────────────────────────────────

  const deleteGuest = async (guestId: string) => {
    await supabase.from('guests').delete().eq('id', guestId);
    setGuests(prev => prev.filter(g => g.id !== guestId));
  };

  // ── Filtros ───────────────────────────────────────────────────────────────

  const confirmed = guests.filter(g => g.status === 'confirmed').length;
  const pending = guests.filter(g => g.status === 'pending').length;
  const declined = guests.filter(g => g.status === 'declined').length;
  const totalWithCompanions = guests.reduce((s, g) => s + 1 + g.companions, 0);

  const filtered = guests.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5EFE6' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', fontWeight: 400, marginBottom: '4px' }}>Convidados</h1>
          <p style={{ fontSize: '13px', opacity: 0.5 }}>Gerencie a lista do seu evento</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(184,150,90,0.08)', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#230606', opacity: 0.7 }}>
            <Upload size={14} />
            {uploading ? 'Importando...' : 'Importar CSV'}
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
          </label>
          <button onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            <UserPlus size={14} /> Adicionar
          </button>
        </div>
      </div>

      {/* MÉTRICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total (+ acomp.)', value: totalWithCompanions, icon: Users, color: '#230606' },
          { label: 'Confirmados', value: confirmed, icon: CheckCircle2, color: '#16a34a' },
          { label: 'Pendentes', value: pending, icon: Clock, color: '#B8965A' },
          { label: 'Recusados', value: declined, icon: XCircle, color: '#dc2626' },
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              style={{ ...card, padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Icon size={14} style={{ color: m.color }} />
                <p style={{ fontSize: '12px', opacity: 0.5 }}>{m.label}</p>
              </div>
              <p style={{ fontSize: '28px', fontFamily: 'Playfair Display, serif', fontWeight: 400, color: m.color }}>{m.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* BUSCA E FILTROS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', padding: '8px 14px', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ color: '#230606', opacity: 0.4 }} />
          <input type="text" placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#230606', width: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'confirmed', 'pending', 'declined'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: '1px solid rgba(184,150,90,0.25)', background: statusFilter === s ? '#B8965A' : 'transparent', color: '#230606', opacity: statusFilter === s ? 1 : 0.6 }}>
              {{ all: 'Todos', confirmed: 'Confirmados', pending: 'Pendentes', declined: 'Recusados' }[s]}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>Lista de Convidados</h2>
          <p style={{ fontSize: '12px', opacity: 0.4 }}>{filtered.length} convidado{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
            <p style={{ fontSize: '13px', opacity: 0.4 }}>
              {guests.length === 0 ? 'Nenhum convidado ainda — adicione o primeiro!' : 'Nenhum convidado encontrado'}
            </p>
          </div>
        ) : filtered.map((guest, i) => {
          const cfg = statusConfig[guest.status];
          const Icon = cfg.icon;
          const initials = guest.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

          return (
            <div key={guest.id}
              style={{ padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid rgba(184,150,90,0.08)' : 'none', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(184,150,90,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '13px', color: '#B8965A', fontWeight: 500 }}>{initials}</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', color: '#230606', marginBottom: '2px' }}>{guest.name}</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {guest.companions > 0 && <p style={{ fontSize: '12px', opacity: 0.5 }}>+{guest.companions} acompanhante{guest.companions > 1 ? 's' : ''}</p>}
                  {guest.dietary && <p style={{ fontSize: '12px', opacity: 0.5 }}>{guest.dietary}</p>}
                </div>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
                <Icon size={11} /> {cfg.label}
              </span>
              <button onClick={() => deleteGuest(guest.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, color: '#dc2626', padding: '4px', flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}>
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* MODAL ADICIONAR */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(35,6,6,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ ...card, width: '100%', maxWidth: '440px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#5C1A2E', fontWeight: 400 }}>Novo Convidado</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Nome completo *</label>
                <input style={inputStyle} placeholder="Nome do convidado" value={newGuest.name} onChange={e => setNewGuest({ ...newGuest, name: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && addGuest()} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Acompanhantes</label>
                  <input type="number" min="0" style={inputStyle} value={newGuest.companions} onChange={e => setNewGuest({ ...newGuest, companions: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Restrição alimentar</label>
                  <input style={inputStyle} placeholder="Opcional" value={newGuest.dietary} onChange={e => setNewGuest({ ...newGuest, dietary: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', fontSize: '13px', color: '#230606', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={addGuest} disabled={saving || !newGuest.name.trim()}
                  style={{ flex: 1, padding: '11px', background: '#B8965A', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#230606', fontWeight: 500, cursor: 'pointer', opacity: saving || !newGuest.name.trim() ? 0.6 : 1 }}>
                  {saving ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}