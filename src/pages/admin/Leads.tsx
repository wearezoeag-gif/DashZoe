import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Search, Phone, Mail, ArrowRight, Users, TrendingUp, Clock, CheckCircle2, X, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useIsMobile } from '../../hooks/useIsMobile';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lead = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  tipo_evento: string | null;
  data_evento: string | null;
  convidados: number | null;
  orcamento: string | null;
  origem: string | null;
  status: string;
  notas: string | null;
  created_at: string;
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

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

const statusColors: Record<string, { bg: string; color: string }> = {
  'Primeiro Contato': { bg: 'rgba(168,85,247,0.1)',  color: '#9333ea' },
  'Negociação':       { bg: 'rgba(184,150,90,0.12)', color: '#B8965A' },
  'Proposta Enviada': { bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6' },
  'Sem Resposta':     { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626' },
  'Convertido':       { bg: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
  'Perdido':          { bg: 'rgba(107,114,128,0.1)', color: '#6b7280' },
};

const statuses = ['Todos', 'Primeiro Contato', 'Negociação', 'Proposta Enviada', 'Sem Resposta', 'Convertido', 'Perdido'];
const origens = ['Instagram', 'Site', 'Indicação', 'Google', 'WhatsApp', 'LinkedIn', 'Outro'];
const tiposEvento = ['Casamento', 'Aniversário', 'Corporativo', 'Formatura', 'Bodas', 'Debutante', 'Outro'];

const emptyForm = {
  nome: '', email: '', telefone: '', tipo_evento: '',
  data_evento: '', convidados: '', orcamento: '',
  origem: '', status: 'Primeiro Contato', notas: '',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AdminLeads() {
  const isMobile = useIsMobile();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => { void fetchLeads(); }, []);

  // ── Salvar lead ───────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return; }
    setError('');
    setSaving(true);

    if (selectedLead) {
      // Editar
      await supabase.from('leads').update({
        nome: form.nome,
        email: form.email || null,
        telefone: form.telefone || null,
        tipo_evento: form.tipo_evento || null,
        data_evento: form.data_evento || null,
        convidados: form.convidados ? Number(form.convidados) : null,
        orcamento: form.orcamento || null,
        origem: form.origem || null,
        status: form.status,
        notas: form.notas || null,
      }).eq('id', selectedLead.id);
    } else {
      // Novo
      await supabase.from('leads').insert({
        nome: form.nome,
        email: form.email || null,
        telefone: form.telefone || null,
        tipo_evento: form.tipo_evento || null,
        data_evento: form.data_evento || null,
        convidados: form.convidados ? Number(form.convidados) : null,
        orcamento: form.orcamento || null,
        origem: form.origem || null,
        status: form.status,
        notas: form.notas || null,
      });
    }

    setSaving(false);
    closeModal();
    void fetchLeads();
  };

  // ── Deletar ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    await supabase.from('leads').delete().eq('id', id);
    setLeads(prev => prev.filter(l => l.id !== id));
    closeModal();
  };

  // ── Atualizar status rápido ────────────────────────────────────────────────

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('leads').update({ status }).eq('id', id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    if (selectedLead?.id === id) setSelectedLead(prev => prev ? { ...prev, status } : null);
  };

  // ── Modal ─────────────────────────────────────────────────────────────────

  const openNew = () => {
    setSelectedLead(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setForm({
      nome: lead.nome,
      email: lead.email || '',
      telefone: lead.telefone || '',
      tipo_evento: lead.tipo_evento || '',
      data_evento: lead.data_evento || '',
      convidados: lead.convidados?.toString() || '',
      orcamento: lead.orcamento || '',
      origem: lead.origem || '',
      status: lead.status,
      notas: lead.notas || '',
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLead(null);
    setForm(emptyForm);
    setError('');
  };

  // ── Filtros ───────────────────────────────────────────────────────────────

  const filtered = leads.filter(l =>
    (l.nome.toLowerCase().includes(search.toLowerCase()) ||
     (l.email || '').toLowerCase().includes(search.toLowerCase()) ||
     (l.tipo_evento || '').toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === 'Todos' || l.status === statusFilter)
  );

  // ── Métricas ──────────────────────────────────────────────────────────────

  const metricas = [
    { label: 'Total de Leads', value: leads.length, icon: Users },
    { label: 'Em Negociação', value: leads.filter(l => l.status === 'Negociação').length, icon: TrendingUp },
    { label: 'Convertidos', value: leads.filter(l => l.status === 'Convertido').length, icon: CheckCircle2 },
    { label: 'Sem Resposta', value: leads.filter(l => l.status === 'Sem Resposta').length, icon: Clock },
  ];

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', marginBottom: '4px', fontWeight: 400 }}>Leads</h1>
          <p style={{ fontSize: '13px', color: '#230606', opacity: 0.5 }}>Gestão de oportunidades e novos clientes</p>
        </div>
        <button onClick={openNew}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
          <Plus size={15} /> Novo Lead
        </button>
      </div>

      {/* MÉTRICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {metricas.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div key={m.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              style={{ ...card, padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={15} style={{ color: '#B8965A' }} />
                </div>
                <p style={{ fontSize: '12px', color: '#230606', opacity: 0.5 }}>{m.label}</p>
              </div>
              <p style={{ fontSize: '28px', color: '#B8965A', fontFamily: 'Playfair Display, serif', fontWeight: 400 }}>{m.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* BUSCA E FILTROS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '6px', padding: '8px 14px', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ color: '#230606', opacity: 0.4 }} />
          <input type="text" placeholder="Buscar por nome, email ou evento..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#230606', width: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', flexShrink: 0 }}>
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: '1px solid rgba(184,150,90,0.25)', background: statusFilter === s ? '#B8965A' : 'transparent', color: '#230606', opacity: statusFilter === s ? 1 : 0.6 }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', opacity: 0.4, fontSize: '13px' }}>Carregando leads...</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...card, padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', opacity: 0.4 }}>
              {leads.length === 0 ? 'Nenhum lead cadastrado ainda' : 'Nenhum lead encontrado com esses filtros'}
            </p>
          </div>
        ) : filtered.map((lead, i) => (
          <motion.div key={lead.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            style={{ ...card, padding: '20px', cursor: 'pointer' }}
            onClick={() => openEdit(lead)}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(184,150,90,0.4)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(184,150,90,0.2)')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '15px', color: '#230606', fontWeight: 400 }}>{lead.nome}</h3>
                  <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: statusColors[lead.status]?.bg, color: statusColors[lead.status]?.color }}>
                    {lead.status}
                  </span>
                  {lead.origem && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(184,150,90,0.08)', color: '#230606', opacity: 0.6 }}>
                      {lead.origem}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {lead.email && <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', opacity: 0.55 }}><Mail size={12} />{lead.email}</span>}
                  {lead.telefone && <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', opacity: 0.55 }}><Phone size={12} />{lead.telefone}</span>}
                  {lead.tipo_evento && <span style={{ fontSize: '12px', opacity: 0.55 }}>Evento: {lead.tipo_evento}</span>}
                  {lead.data_evento && <span style={{ fontSize: '12px', opacity: 0.55 }}>Data: {new Date(lead.data_evento).toLocaleDateString('pt-BR')}</span>}
                  {lead.convidados && <span style={{ fontSize: '12px', opacity: 0.55 }}>{lead.convidados} convidados</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {lead.orcamento && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', opacity: 0.4, marginBottom: '2px' }}>Orçamento</p>
                    <p style={{ fontSize: '13px', color: '#B8965A', fontWeight: 500 }}>{lead.orcamento}</p>
                  </div>
                )}
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', opacity: 0.4, marginBottom: '2px' }}>Cadastrado</p>
                  <p style={{ fontSize: '12px', opacity: 0.6 }}>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <ArrowRight size={14} style={{ opacity: 0.3 }} />
              </div>
            </div>
            {lead.notas && (
              <p style={{ fontSize: '12px', color: '#230606', opacity: 0.5, marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(184,150,90,0.1)', fontStyle: 'italic' }}>
                {lead.notas}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* MODAL: Novo / Editar Lead */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(35,6,6,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ ...card, width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Header modal */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#FDFAF6', zIndex: 1 }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#5C1A2E', fontWeight: 400 }}>
                {selectedLead ? 'Editar Lead' : 'Novo Lead'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, color: '#230606' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Nome */}
              <div>
                <label style={labelStyle}>Nome completo *</label>
                <input style={inputStyle} placeholder="Nome do lead" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
              </div>

              {/* Email + Telefone */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" style={inputStyle} placeholder="email@exemplo.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Telefone</label>
                  <input style={inputStyle} placeholder="(11) 99999-9999" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
                </div>
              </div>

              {/* Tipo de evento + Data */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Tipo de Evento</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.tipo_evento} onChange={e => setForm({ ...form, tipo_evento: e.target.value })}>
                    <option value="">Selecione...</option>
                    {tiposEvento.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Data do Evento</label>
                  <input type="date" style={inputStyle} value={form.data_evento} onChange={e => setForm({ ...form, data_evento: e.target.value })} />
                </div>
              </div>

              {/* Convidados + Orçamento */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Nº de Convidados</label>
                  <input type="number" style={inputStyle} placeholder="0" value={form.convidados} onChange={e => setForm({ ...form, convidados: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Orçamento</label>
                  <input style={inputStyle} placeholder="Ex: R$ 50–80k" value={form.orcamento} onChange={e => setForm({ ...form, orcamento: e.target.value })} />
                </div>
              </div>

              {/* Origem + Status */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Origem</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })}>
                    <option value="">Selecione...</option>
                    {origens.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {statuses.filter(s => s !== 'Todos').map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label style={labelStyle}>Notas internas</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '80px', resize: 'none' } as React.CSSProperties}
                  placeholder="Observações sobre o lead..."
                  value={form.notas}
                  onChange={e => setForm({ ...form, notas: e.target.value })}
                />
              </div>

              {error && <p style={{ fontSize: '12px', color: '#dc2626', textAlign: 'center' }}>{error}</p>}

              {/* Botões */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                {selectedLead && (
                  <button type="button" onClick={() => handleDelete(selectedLead.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '11px 16px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <Trash2 size={14} /> Excluir
                  </button>
                )}
                <button type="button" onClick={closeModal}
                  style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', fontSize: '13px', color: '#230606', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, padding: '11px', background: '#B8965A', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#230606', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Salvando...' : selectedLead ? 'Salvar alterações' : 'Cadastrar Lead'}
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}