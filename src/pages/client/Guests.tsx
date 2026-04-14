import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { motion } from 'motion/react';
import {
  UserPlus, Search, CheckCircle2, Clock, XCircle,
  Users, Upload, Trash2, X, Copy, Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type Guest = {
  id: string;
  name: string;
  date_of_birth: string | null;
  contact: string | null;
  status: 'pending' | 'confirmed' | 'declined';
  message: string | null;
  dietary: string | null;
  special_needs: string | null;
  companions: number;
  confirmed_at: string | null;
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#FDFAF6',
  border: '1px solid rgba(184,150,90,0.2)',
  borderRadius: '12px',
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

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AdminGuests() {
  const { id } = useParams(); // event id
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'declined'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGuestDetail, setShowGuestDetail] = useState<Guest | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newGuest, setNewGuest] = useState({
    name: '', date_of_birth: '', contact: '', companions: '0',
  });

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchGuests();
  }, [id]);

  const fetchGuests = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', id)
      .order('name', { ascending: true });
    setGuests(data || []);
    setLoading(false);
  };

  // ── Adicionar convidado ───────────────────────────────────────────────────

  const addGuest = async () => {
    if (!newGuest.name.trim() || !id) return;
    setSaving(true);
    const { data } = await supabase.from('guests').insert({
      event_id: id,
      name: newGuest.name.trim(),
      date_of_birth: newGuest.date_of_birth || null,
      contact: newGuest.contact || null,
      companions: Number(newGuest.companions) || 0,
      status: 'pending',
    }).select().single();
    if (data) setGuests(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewGuest({ name: '', date_of_birth: '', contact: '', companions: '0' });
    setShowAddModal(false);
    setSaving(false);
  };

  // ── Importar Excel ────────────────────────────────────────────────────────

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);

    try {
      // Lê o arquivo como texto CSV ou usa SheetJS via CDN
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const rows = lines.slice(1); // pula cabeçalho

      const toInsert = rows.map(row => {
        const cols = row.split(',').map(c => c.trim().replace(/"/g, ''));
        return {
          event_id: id,
          name: cols[0] || '',
          date_of_birth: cols[1] || null,
          contact: cols[2] || null,
          companions: Number(cols[3]) || 0,
          status: 'pending',
        };
      }).filter(g => g.name);

      if (toInsert.length > 0) {
        await supabase.from('guests').insert(toInsert);
        await fetchGuests();
      }
    } catch (err) {
      console.error('Erro ao importar:', err);
    }

    setUploading(false);
    e.target.value = '';
  };

  // ── Alterar status ────────────────────────────────────────────────────────

  const updateStatus = async (guestId: string, status: Guest['status']) => {
    await supabase.from('guests').update({
      status,
      confirmed_at: status === 'confirmed' ? new Date().toISOString() : null,
    }).eq('id', guestId);
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, status } : g));
    if (showGuestDetail?.id === guestId) setShowGuestDetail(prev => prev ? { ...prev, status } : null);
  };

  // ── Deletar ───────────────────────────────────────────────────────────────

  const deleteGuest = async (guestId: string) => {
    await supabase.from('guests').delete().eq('id', guestId);
    setGuests(prev => prev.filter(g => g.id !== guestId));
    setShowGuestDetail(null);
  };

  // ── Link RSVP ─────────────────────────────────────────────────────────────

  const rsvpLink = `${window.location.origin}/rsvp/${id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(rsvpLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ── Filtros ───────────────────────────────────────────────────────────────

  const filtered = guests.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.contact || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const confirmed = guests.filter(g => g.status === 'confirmed').length;
  const pending = guests.filter(g => g.status === 'pending').length;
  const declined = guests.filter(g => g.status === 'declined').length;
  const totalWithCompanions = guests.reduce((s, g) => s + 1 + g.companions, 0);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5EFE6' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: '32px 40px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', fontWeight: 400, marginBottom: '4px' }}>Convidados</h1>
          <p style={{ fontSize: '13px', opacity: 0.5 }}>Gerencie a lista e acompanhe as confirmações</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Link RSVP */}
          <button onClick={copyLink}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: linkCopied ? 'rgba(34,197,94,0.1)' : 'rgba(184,150,90,0.1)', color: linkCopied ? '#16a34a' : '#B8965A', border: `1px solid ${linkCopied ? 'rgba(34,197,94,0.3)' : 'rgba(184,150,90,0.3)'}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.2s' }}>
            {linkCopied ? <><Check size={14} /> Link copiado!</> : <><Copy size={14} /> Copiar link RSVP</>}
          </button>
          {/* Importar CSV */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(184,150,90,0.08)', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#230606', opacity: 0.7, fontWeight: 500 }}>
            <Upload size={14} />
            {uploading ? 'Importando...' : 'Importar CSV'}
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportExcel} />
          </label>
          {/* Adicionar */}
          <button onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            <UserPlus size={14} /> Adicionar convidado
          </button>
        </div>
      </div>

      {/* MÉTRICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Icon size={15} style={{ color: m.color }} />
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
          <input type="text" placeholder="Buscar por nome ou contato..." value={search} onChange={e => setSearch(e.target.value)}
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
            <p style={{ fontSize: '13px', opacity: 0.4 }}>Nenhum convidado encontrado</p>
          </div>
        ) : filtered.map((guest, i) => {
          const cfg = statusConfig[guest.status];
          const Icon = cfg.icon;
          const initials = guest.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

          return (
            <div key={guest.id}
              onClick={() => setShowGuestDetail(guest)}
              style={{ padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid rgba(184,150,90,0.08)' : 'none', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(184,150,90,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Avatar */}
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(184,150,90,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '13px', color: '#B8965A', fontWeight: 500 }}>{initials}</span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', color: '#230606', marginBottom: '2px' }}>{guest.name}</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {guest.contact && <p style={{ fontSize: '12px', opacity: 0.5 }}>{guest.contact}</p>}
                  {guest.date_of_birth && <p style={{ fontSize: '12px', opacity: 0.5 }}>{new Date(guest.date_of_birth).toLocaleDateString('pt-BR')}</p>}
                  {guest.companions > 0 && <p style={{ fontSize: '12px', opacity: 0.5 }}>+{guest.companions} acomp.</p>}
                </div>
              </div>

              {/* Status */}
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
                <Icon size={11} /> {cfg.label}
              </span>

              {/* Ações rápidas */}
              {guest.status !== 'confirmed' && (
                <button onClick={e => { e.stopPropagation(); updateStatus(guest.id, 'confirmed'); }}
                  style={{ padding: '5px 10px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>
                  Confirmar
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: Adicionar convidado */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(35,6,6,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ ...card, width: '100%', maxWidth: '480px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#5C1A2E', fontWeight: 400 }}>Novo Convidado</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={labelStyle}>Nome completo *</label><input style={inputStyle} placeholder="Nome do convidado" value={newGuest.name} onChange={e => setNewGuest({ ...newGuest, name: e.target.value })} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={labelStyle}>Data de nascimento</label><input type="date" style={inputStyle} value={newGuest.date_of_birth} onChange={e => setNewGuest({ ...newGuest, date_of_birth: e.target.value })} /></div>
                <div><label style={labelStyle}>Acompanhantes</label><input type="number" min="0" style={inputStyle} value={newGuest.companions} onChange={e => setNewGuest({ ...newGuest, companions: e.target.value })} /></div>
              </div>
              <div><label style={labelStyle}>Contato (email ou telefone)</label><input style={inputStyle} placeholder="email@exemplo.com ou (11) 99999-9999" value={newGuest.contact} onChange={e => setNewGuest({ ...newGuest, contact: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', fontSize: '13px', color: '#230606', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={addGuest} disabled={saving || !newGuest.name.trim()} style={{ flex: 1, padding: '11px', background: '#B8965A', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#230606', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: Detalhe do convidado */}
      {showGuestDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(35,6,6,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ ...card, width: '100%', maxWidth: '520px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#5C1A2E', fontWeight: 400 }}>{showGuestDetail.name}</h2>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: statusConfig[showGuestDetail.status].bg, color: statusConfig[showGuestDetail.status].color, marginTop: '4px' }}>
                  {statusConfig[showGuestDetail.status].label}
                </span>
              </div>
              <button onClick={() => setShowGuestDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><X size={18} /></button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {showGuestDetail.contact && (
                  <div><p style={{ ...labelStyle, marginBottom: '2px' }}>Contato</p><p style={{ fontSize: '13px' }}>{showGuestDetail.contact}</p></div>
                )}
                {showGuestDetail.date_of_birth && (
                  <div><p style={{ ...labelStyle, marginBottom: '2px' }}>Nascimento</p><p style={{ fontSize: '13px' }}>{new Date(showGuestDetail.date_of_birth).toLocaleDateString('pt-BR')}</p></div>
                )}
                {showGuestDetail.companions > 0 && (
                  <div><p style={{ ...labelStyle, marginBottom: '2px' }}>Acompanhantes</p><p style={{ fontSize: '13px' }}>{showGuestDetail.companions}</p></div>
                )}
                {showGuestDetail.confirmed_at && (
                  <div><p style={{ ...labelStyle, marginBottom: '2px' }}>Confirmado em</p><p style={{ fontSize: '13px' }}>{new Date(showGuestDetail.confirmed_at).toLocaleDateString('pt-BR')}</p></div>
                )}
              </div>

              {showGuestDetail.dietary && (
                <div style={{ padding: '12px 14px', background: 'rgba(184,150,90,0.06)', borderRadius: '8px' }}>
                  <p style={{ ...labelStyle, marginBottom: '4px' }}>Restrição alimentar</p>
                  <p style={{ fontSize: '13px' }}>{showGuestDetail.dietary}</p>
                </div>
              )}
              {showGuestDetail.special_needs && (
                <div style={{ padding: '12px 14px', background: 'rgba(184,150,90,0.06)', borderRadius: '8px' }}>
                  <p style={{ ...labelStyle, marginBottom: '4px' }}>Necessidade especial</p>
                  <p style={{ fontSize: '13px' }}>{showGuestDetail.special_needs}</p>
                </div>
              )}
              {showGuestDetail.message && (
                <div style={{ padding: '12px 14px', background: 'rgba(184,150,90,0.06)', borderRadius: '8px' }}>
                  <p style={{ ...labelStyle, marginBottom: '4px' }}>Mensagem</p>
                  <p style={{ fontSize: '13px', fontStyle: 'italic' }}>"{showGuestDetail.message}"</p>
                </div>
              )}

              {/* Ações de status */}
              <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(184,150,90,0.15)' }}>
                {showGuestDetail.status !== 'confirmed' && (
                  <button onClick={() => updateStatus(showGuestDetail.id, 'confirmed')}
                    style={{ flex: 1, padding: '9px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                    Confirmar
                  </button>
                )}
                {showGuestDetail.status !== 'declined' && (
                  <button onClick={() => updateStatus(showGuestDetail.id, 'declined')}
                    style={{ flex: 1, padding: '9px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                    Recusar
                  </button>
                )}
                {showGuestDetail.status !== 'pending' && (
                  <button onClick={() => updateStatus(showGuestDetail.id, 'pending')}
                    style={{ flex: 1, padding: '9px', background: 'rgba(184,150,90,0.08)', color: '#B8965A', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                    Pendente
                  </button>
                )}
                <button onClick={() => deleteGuest(showGuestDetail.id)}
                  style={{ padding: '9px 14px', background: 'none', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: 0.5 }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}