import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Search, ArrowRight, Calendar, MapPin, Users, X, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useNavigate } from 'react-router';

type Evento = {
  id: string;
  nome: string;
  cliente_nome: string;
  cliente_email: string;
  data: string;
  local: string;
  cidade: string;
  convidados: number;
  orcamento: number;
  status: string;
  tipo: string;
};

const statusColors: Record<string, { bg: string; color: string }> = {
  'Em Execução':      { bg: 'rgba(184,150,90,0.12)', color: '#B8965A' },
  'Planejamento':     { bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6' },
  'Contratado':       { bg: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
  'Proposta Enviada': { bg: 'rgba(234,179,8,0.1)',   color: '#ca8a04' },
  'Negociação':       { bg: 'rgba(168,85,247,0.1)',  color: '#9333ea' },
  'Entrega':          { bg: 'rgba(14,165,233,0.1)',  color: '#0ea5e9' },
  'Concluído':        { bg: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
};

const card = { background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '10px' };
const statuses = ['Todos', 'Em Execução', 'Planejamento', 'Contratado', 'Proposta Enviada', 'Negociação'];

// Status que indicam evento ativo vs encerrado
const ACTIVE_STATUSES = ['Negociação', 'Proposta Enviada', 'Contratado', 'Planejamento', 'Em Execução', 'Entrega'];
const CLOSED_STATUSES = ['Concluído'];

const emptyForm = {
  nome: '', tipo: '', data: '', local: '', cidade: '',
  convidados: '', orcamento: '', status: 'Negociação',
  cliente_nome: '', cliente_email: '',
};

export default function AdminEvents() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showEncerrados, setShowEncerrados] = useState(false);

  const fetchEventos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .order('data', { ascending: true });
    if (!error && data) setEventos(data);
    setLoading(false);
  };

  useEffect(() => { fetchEventos(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const { error } = await supabase.from('eventos').insert([{
      nome: form.nome,
      tipo: form.tipo,
      data: form.data,
      local: form.local,
      cidade: form.cidade,
      convidados: Number(form.convidados),
      orcamento: Number(form.orcamento),
      status: form.status,
      cliente_nome: form.cliente_nome,
      cliente_email: form.cliente_email,
    }]);

    setSaving(false);
    if (error) { setError('Erro ao salvar. Tente novamente.'); return; }
    setShowModal(false);
    setForm(emptyForm);
    fetchEventos();
  };

  // Separar ativos e encerrados
  const ativos = eventos.filter(e => ACTIVE_STATUSES.includes(e.status));
  const encerrados = eventos.filter(e => CLOSED_STATUSES.includes(e.status));

  const filteredAtivos = ativos.filter(e =>
    (e.nome.toLowerCase().includes(search.toLowerCase()) ||
     e.cliente_nome.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === 'Todos' || e.status === statusFilter)
  );

  const filteredEncerrados = encerrados.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.cliente_nome.toLowerCase().includes(search.toLowerCase())
  );

  const formatData = (data: string) =>
    new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatOrcamento = (value: number) =>
    `R$ ${value.toLocaleString('pt-BR')}`;

  const EventCard = ({ event, i, encerrado = false }: { event: Evento; i: number; encerrado?: boolean }) => (
    <motion.div key={event.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
      style={{ ...card, padding: '20px', opacity: encerrado ? 0.75 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '15px', color: '#230606', fontWeight: 400 }}>{event.nome}</h3>
            <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: statusColors[event.status]?.bg, color: statusColors[event.status]?.color }}>
              {event.status}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#230606', opacity: 0.55 }}>
              <Calendar size={12} />{formatData(event.data)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#230606', opacity: 0.55 }}>
              <MapPin size={12} />{event.local} — {event.cidade}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#230606', opacity: 0.55 }}>
              <Users size={12} />{event.convidados} convidados
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: '#230606', opacity: 0.45, marginBottom: '2px' }}>Cliente</p>
            <p style={{ fontSize: '13px', color: '#230606' }}>{event.cliente_nome}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: '#230606', opacity: 0.45, marginBottom: '2px' }}>Orçamento</p>
            <p style={{ fontSize: '13px', color: '#B8965A' }}>{formatOrcamento(event.orcamento)}</p>
          </div>
          <button onClick={() => navigate(`/admin/eventos/${event.id}`)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#230606', opacity: 0.5 }}>
            Ver <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', marginBottom: '4px', fontWeight: 400 }}>Eventos</h1>
          <p style={{ fontSize: '13px', color: '#230606', opacity: 0.5 }}>Gerenciamento completo de todos os eventos</p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
          <Plus size={15} /> Novo Evento
        </button>
      </div>

      {/* MÉTRICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Ativos', value: ativos.length },
          { label: 'Em Execução', value: ativos.filter(e => e.status === 'Em Execução').length },
          { label: 'Planejamento', value: ativos.filter(e => e.status === 'Planejamento').length },
          { label: 'Encerrados', value: encerrados.length },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ ...card, padding: '18px' }}>
            <p style={{ fontSize: '12px', color: '#230606', opacity: 0.5, marginBottom: '6px' }}>{c.label}</p>
            <p style={{ fontSize: '28px', color: '#B8965A', fontFamily: 'Playfair Display, serif', fontWeight: 400 }}>{c.value}</p>
          </motion.div>
        ))}
      </div>

      {/* FILTROS */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', marginBottom: '20px', alignItems: isMobile ? 'stretch' : 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '6px', padding: '8px 14px', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ color: '#230606', opacity: 0.4 }} />
          <input type="text" placeholder="Buscar evento ou cliente..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#230606', width: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: '1px solid rgba(184,150,90,0.25)', background: statusFilter === s ? '#B8965A' : 'transparent', color: '#230606', opacity: statusFilter === s ? 1 : 0.6 }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* EVENTOS ATIVOS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', opacity: 0.4, fontSize: '13px' }}>Carregando eventos...</div>
        ) : filteredAtivos.length === 0 ? (
          <div style={{ ...card, padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#230606', opacity: 0.5 }}>Nenhum evento encontrado</p>
          </div>
        ) : filteredAtivos.map((event, i) => (
          <EventCard key={event.id} event={event} i={i} />
        ))}
      </div>

      {/* EVENTOS ENCERRADOS */}
      {(encerrados.length > 0 || filteredEncerrados.length > 0) && (
        <div>
          {/* Toggle */}
          <button
            onClick={() => setShowEncerrados(!showEncerrados)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '16px', padding: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} style={{ color: '#16a34a', opacity: 0.7 }} />
              <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', color: '#5C1A2E', fontWeight: 400 }}>
                Eventos Encerrados
              </span>
              <span style={{ fontSize: '12px', color: '#230606', opacity: 0.4, background: 'rgba(184,150,90,0.1)', padding: '2px 8px', borderRadius: '20px' }}>
                {encerrados.length}
              </span>
            </div>
            {showEncerrados
              ? <ChevronUp size={16} style={{ color: '#230606', opacity: 0.4 }} />
              : <ChevronDown size={16} style={{ color: '#230606', opacity: 0.4 }} />
            }
          </button>

          {showEncerrados && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredEncerrados.length === 0 ? (
                <div style={{ ...card, padding: isMobile ? '16px' : '32px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', opacity: 0.4 }}>Nenhum evento encerrado encontrado</p>
                </div>
              ) : filteredEncerrados.map((event, i) => (
                <EventCard key={event.id} event={event} i={i} encerrado />
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL NOVO EVENTO */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(35,6,6,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ ...card, width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(184,150,90,0.2)' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#5C1A2E', fontWeight: 400 }}>Novo Evento</h2>
              <button onClick={() => { setShowModal(false); setForm(emptyForm); setError(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#230606', opacity: 0.4 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Nome do Evento', key: 'nome', placeholder: 'Ex: Casamento Maria & João', required: true },
                { label: 'Tipo', key: 'tipo', placeholder: 'Ex: Casamento, Aniversário, Corporativo' },
                { label: 'Nome do Cliente', key: 'cliente_nome', placeholder: 'Nome completo', required: true },
                { label: 'Email do Cliente', key: 'cliente_email', placeholder: 'cliente@email.com' },
                { label: 'Local', key: 'local', placeholder: 'Ex: Villa Jardim' },
                { label: 'Cidade', key: 'cidade', placeholder: 'Ex: São Paulo' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#230606', opacity: 0.6, marginBottom: '6px' }}>{f.label}</label>
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    required={f.required}
                    style={{ width: '100%', background: '#F5EFE6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#230606', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#230606', opacity: 0.6, marginBottom: '6px' }}>Data</label>
                  <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} required
                    style={{ width: '100%', background: '#F5EFE6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#230606', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#230606', opacity: 0.6, marginBottom: '6px' }}>Convidados</label>
                  <input type="number" placeholder="0" value={form.convidados} onChange={e => setForm({ ...form, convidados: e.target.value })}
                    style={{ width: '100%', background: '#F5EFE6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#230606', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#230606', opacity: 0.6, marginBottom: '6px' }}>Orçamento (R$)</label>
                  <input type="number" placeholder="0" value={form.orcamento} onChange={e => setForm({ ...form, orcamento: e.target.value })}
                    style={{ width: '100%', background: '#F5EFE6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#230606', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#230606', opacity: 0.6, marginBottom: '6px' }}>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ width: '100%', background: '#F5EFE6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#230606', outline: 'none', boxSizing: 'border-box' }}>
                    {['Negociação', 'Proposta Enviada', 'Contratado', 'Planejamento', 'Em Execução', 'Entrega', 'Concluído'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <p style={{ fontSize: '12px', color: '#dc2626', textAlign: 'center' }}>{error}</p>}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => { setShowModal(false); setForm(emptyForm); setError(''); }}
                  style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', fontSize: '13px', color: '#230606', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, padding: '12px', background: '#B8965A', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#230606', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Salvando...' : 'Criar Evento'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}