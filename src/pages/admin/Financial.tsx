import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useIsMobile } from '../../hooks/useIsMobile';

type Despesa = {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  recorrente: boolean;
  notas: string | null;
};

type EventoReceita = {
  id: string;
  nome: string;
  data: string;
  totalSetores: number;
  receitaStudio: number;
  status: string;
};

const card: React.CSSProperties = { background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '10px' };
const inputStyle: React.CSSProperties = { width: '100%', background: '#F5EFE6', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#230606', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', color: '#230606', opacity: 0.5, marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' };
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CATEGORIAS = ['Salários', 'Ferramentas', 'Escritório', 'Marketing', 'Impostos', 'Freelancers', 'Outros'];
const emptyForm = { descricao: '', categoria: 'Outros', valor: '', data: new Date().toISOString().split('T')[0], recorrente: false, notas: '' };

export default function AdminFinancial() {
  const isMobile = useIsMobile();
  const [loading, setLoading]       = useState(true);
  const [despesas, setDespesas]     = useState<Despesa[]>([]);
  const [eventos, setEventos]       = useState<EventoReceita[]>([]);
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [periodoMes, setPeriodoMes] = useState(new Date().getMonth());
  const [periodoAno, setPeriodoAno] = useState(new Date().getFullYear());
  const [anoView, setAnoView]       = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchAll = async () => {
      const { data: despesasData } = await supabase.from('despesas').select('*').order('data', { ascending: false });
      const { data: eventosData } = await supabase.from('eventos').select('id, nome, data, status, budget, receita_studio, tipo_evento_comercial').order('data', { ascending: false });

      if (eventosData && eventosData.length > 0) {
        const ids = eventosData.map((e: any) => e.id);
        const { data: sectorsData } = await supabase.from('event_sectors').select('event_id, value').in('event_id', ids);
        const eventosComReceita: EventoReceita[] = eventosData.map((e: any) => {
          const totalSetores = (sectorsData || []).filter((s: any) => s.event_id === e.id).reduce((sum: number, s: any) => sum + (Number(s.value) || 0), 0);
          // Usa receita_studio manual se preenchida, senão usa 10% dos setores como fallback
          const receitaStudio = Number(e.receita_studio) || totalSetores * 0.1;
          return { id: e.id, nome: e.nome, data: e.data, status: e.status, totalSetores, receitaStudio };
        });
        setEventos(eventosComReceita);
      }

      setDespesas(despesasData || []);
      setLoading(false);
    };
    void fetchAll();
  }, []);

  // Filtros
  const despesasMes = despesas.filter(d => { const dt = new Date(d.data); return dt.getMonth() === periodoMes && dt.getFullYear() === periodoAno; });
  const receitaMes = eventos.filter(e => { const dt = new Date(e.data); return dt.getMonth() === periodoMes && dt.getFullYear() === periodoAno; }).reduce((s, e) => s + e.receitaStudio, 0);
  const totalDespesasMes = despesasMes.reduce((s, d) => s + Number(d.valor), 0);
  const lucroMes = receitaMes - totalDespesasMes;

  // Mês anterior
  const mA = periodoMes === 0 ? 11 : periodoMes - 1;
  const aA = periodoMes === 0 ? periodoAno - 1 : periodoAno;
  const receitaAnterior = eventos.filter(e => { const dt = new Date(e.data); return dt.getMonth() === mA && dt.getFullYear() === aA; }).reduce((s, e) => s + e.receitaStudio, 0);
  const varReceita = receitaAnterior > 0 ? Math.round(((receitaMes - receitaAnterior) / receitaAnterior) * 100) : null;

  // Anual
  const dadosAnuais = MESES.map((_, m) => {
    const rec = eventos.filter(e => { const dt = new Date(e.data); return dt.getMonth() === m && dt.getFullYear() === anoView; }).reduce((s, e) => s + e.receitaStudio, 0);
    const desp = despesas.filter(d => { const dt = new Date(d.data); return dt.getMonth() === m && dt.getFullYear() === anoView; }).reduce((s, d) => s + Number(d.valor), 0);
    return { receita: rec, despesas: desp, lucro: rec - desp };
  });
  const maxAnual = Math.max(...dadosAnuais.map(d => Math.max(d.receita, d.despesas)), 1);
  const receitaAnual = dadosAnuais.reduce((s, d) => s + d.receita, 0);
  const despesaAnual = dadosAnuais.reduce((s, d) => s + d.despesas, 0);
  const lucroAnual = receitaAnual - despesaAnual;

  // Categorias
  const categoriasMes = CATEGORIAS.map(cat => ({ cat, valor: despesasMes.filter(d => d.categoria === cat).reduce((s, d) => s + Number(d.valor), 0) })).filter(c => c.valor > 0).sort((a, b) => b.valor - a.valor);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('despesas').insert({ descricao: form.descricao, categoria: form.categoria, valor: Number(form.valor), data: form.data, recorrente: form.recorrente, notas: form.notas || null });
    const { data } = await supabase.from('despesas').select('*').order('data', { ascending: false });
    setDespesas(data || []);
    setSaving(false);
    setShowModal(false);
    setForm(emptyForm);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('despesas').delete().eq('id', id);
    setDespesas(prev => prev.filter(d => d.id !== id));
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5EFE6' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', marginBottom: '4px', fontWeight: 400 }}>Financeiro</h1>
          <p style={{ fontSize: '13px', opacity: 0.5 }}>Visão financeira da Studio Zoe</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', padding: '8px 12px' }}>
            <select value={periodoMes} onChange={e => setPeriodoMes(Number(e.target.value))} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#230606', cursor: 'pointer' }}>
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={periodoAno} onChange={e => setPeriodoAno(Number(e.target.value))} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#230606', cursor: 'pointer' }}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            <Plus size={14} /> Nova Despesa
          </button>
        </div>
      </div>

      {/* MÉTRICAS DO MÊS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Receita Studio Zoe', value: fmt(receitaMes), sub: varReceita !== null ? `${varReceita >= 0 ? '+' : ''}${varReceita}% vs mês anterior` : 'sem comparativo', icon: DollarSign, color: '#B8965A' },
          { label: 'Despesas do Mês', value: fmt(totalDespesasMes), sub: `${despesasMes.length} lançamento${despesasMes.length !== 1 ? 's' : ''}`, icon: TrendingDown, color: totalDespesasMes > 0 ? '#dc2626' : '#230606' },
          { label: 'Lucro Líquido', value: fmt(lucroMes), sub: `Margem ${receitaMes > 0 ? Math.round((lucroMes / receitaMes) * 100) : 0}%`, icon: TrendingUp, color: lucroMes >= 0 ? '#16a34a' : '#dc2626' },
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} style={{ ...card, padding: '22px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <Icon size={17} style={{ color: '#B8965A' }} />
              </div>
              <p style={{ fontSize: '28px', fontFamily: 'Playfair Display, serif', fontWeight: 400, color: m.color, marginBottom: '4px' }}>{m.value}</p>
              <p style={{ fontSize: '12px', opacity: 0.5, marginBottom: '2px' }}>{m.label}</p>
              <p style={{ fontSize: '11px', opacity: 0.4 }}>{m.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* GRÁFICO ANUAL + CATEGORIAS */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>

        {/* Gráfico anual */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={card}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(184,150,90,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>Visão Anual</h2>
            <select value={anoView} onChange={e => setAnoView(Number(e.target.value))} style={{ background: 'transparent', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', color: '#230606', outline: 'none', cursor: 'pointer' }}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '24px', padding: '12px 20px', borderBottom: '1px solid rgba(184,150,90,0.08)' }}>
            <div><p style={{ fontSize: '10px', opacity: 0.4, marginBottom: '2px' }}>Receita {anoView}</p><p style={{ fontSize: '15px', fontFamily: 'Playfair Display, serif', color: '#B8965A' }}>{fmt(receitaAnual)}</p></div>
            <div><p style={{ fontSize: '10px', opacity: 0.4, marginBottom: '2px' }}>Despesas {anoView}</p><p style={{ fontSize: '15px', fontFamily: 'Playfair Display, serif', color: '#dc2626' }}>{fmt(despesaAnual)}</p></div>
            <div><p style={{ fontSize: '10px', opacity: 0.4, marginBottom: '2px' }}>Lucro {anoView}</p><p style={{ fontSize: '15px', fontFamily: 'Playfair Display, serif', color: lucroAnual >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(lucroAnual)}</p></div>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '140px' }}>
              {dadosAnuais.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '4px' }}>
                  <div style={{ width: '100%', height: '120px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '2px' }}>
                    {d.receita > 0 && <div title={`Receita: ${fmt(d.receita)}`} style={{ width: '45%', height: `${Math.max((d.receita / maxAnual) * 100, 2)}%`, background: '#B8965A', borderRadius: '3px 3px 0 0', opacity: 0.85 }} />}
                    {d.despesas > 0 && <div title={`Despesas: ${fmt(d.despesas)}`} style={{ width: '45%', height: `${Math.max((d.despesas / maxAnual) * 100, 2)}%`, background: '#dc2626', borderRadius: '3px 3px 0 0', opacity: 0.6 }} />}
                  </div>
                  <p style={{ fontSize: '9px', opacity: 0.4 }}>{MESES[i]}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', justifyContent: 'center' }}>
              <span style={{ fontSize: '10px', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#B8965A', display: 'inline-block' }} /> Receita</span>
              <span style={{ fontSize: '10px', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#dc2626', display: 'inline-block' }} /> Despesas</span>
            </div>
          </div>
        </motion.div>

        {/* Categorias */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={card}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(184,150,90,0.12)' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>Por Categoria</h2>
            <p style={{ fontSize: '11px', opacity: 0.4, marginTop: '2px' }}>{MESES[periodoMes]} {periodoAno}</p>
          </div>
          <div style={{ padding: '16px' }}>
            {categoriasMes.length === 0 ? (
              <p style={{ fontSize: '13px', opacity: 0.35, textAlign: 'center', padding: '24px 0' }}>Nenhuma despesa este mês</p>
            ) : categoriasMes.map(({ cat, valor }) => (
              <div key={cat} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <p style={{ fontSize: '12px', opacity: 0.7 }}>{cat}</p>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: '#dc2626' }}>{fmt(valor)}</p>
                </div>
                <div style={{ height: '4px', background: 'rgba(184,150,90,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(valor / totalDespesasMes) * 100}%`, background: '#dc2626', opacity: 0.6, borderRadius: '99px' }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* RECEITA POR EVENTO + DESPESAS DO MÊS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>

        {/* Receita por evento */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={card}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(184,150,90,0.12)' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>Receita por Evento</h2>
            <p style={{ fontSize: '11px', opacity: 0.4, marginTop: '2px' }}>10% sobre fornecedores</p>
          </div>
          <div>
            {eventos.filter(e => e.receitaStudio > 0).length === 0 ? (
              <p style={{ fontSize: '13px', opacity: 0.35, textAlign: 'center', padding: isMobile ? '16px' : '32px' }}>Nenhum evento com setores cadastrados</p>
            ) : eventos.filter(e => e.receitaStudio > 0).map(e => (
              <div key={e.id} style={{ padding: '13px 20px', borderBottom: '1px solid rgba(184,150,90,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '13px', color: '#230606', marginBottom: '2px' }}>{e.nome}</p>
                  <p style={{ fontSize: '11px', opacity: 0.45 }}>
                    {new Date(e.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {e.totalSetores > 0 && ` · ${fmt(e.totalSetores)} fornecedores`}
                  </p>
                </div>
                <p style={{ fontSize: '14px', fontFamily: 'Playfair Display, serif', color: '#B8965A' }}>{fmt(e.receitaStudio)}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Despesas do mês */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} style={card}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(184,150,90,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>Despesas</h2>
              <p style={{ fontSize: '11px', opacity: 0.4, marginTop: '2px' }}>{MESES[periodoMes]} {periodoAno}</p>
            </div>
            <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#B8965A' }}>
              <Plus size={12} /> Adicionar
            </button>
          </div>
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {despesasMes.length === 0 ? (
              <p style={{ fontSize: '13px', opacity: 0.35, textAlign: 'center', padding: isMobile ? '16px' : '32px' }}>Nenhuma despesa em {MESES[periodoMes]}</p>
            ) : despesasMes.map(d => (
              <div key={d.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(184,150,90,0.07)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <p style={{ fontSize: '13px', color: '#230606' }}>{d.descricao}</p>
                    {d.recorrente && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '20px', background: 'rgba(184,150,90,0.1)', color: '#B8965A' }}>FIXO</span>}
                  </div>
                  <p style={{ fontSize: '11px', opacity: 0.45 }}>{d.categoria}</p>
                </div>
                <p style={{ fontSize: '13px', color: '#dc2626', fontWeight: 500 }}>{fmt(Number(d.valor))}</p>
                <button onClick={() => handleDelete(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, color: '#dc2626', padding: '4px' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(35,6,6,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '12px', width: '100%', maxWidth: '480px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#5C1A2E', fontWeight: 400 }}>Nova Despesa</h2>
              <button onClick={() => { setShowModal(false); setForm(emptyForm); }} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Descrição *</label>
                <input style={inputStyle} placeholder="Ex: Salário assistente" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Categoria</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Valor (R$)</label>
                  <input type="number" style={inputStyle} placeholder="0" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Data</label>
                  <input type="date" style={inputStyle} value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '20px' }}>
                  <input type="checkbox" id="recorrente" checked={form.recorrente} onChange={e => setForm({ ...form, recorrente: e.target.checked })} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#B8965A' }} />
                  <label htmlFor="recorrente" style={{ fontSize: '13px', cursor: 'pointer', opacity: 0.7 }}>Despesa fixa</label>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notas</label>
                <input style={inputStyle} placeholder="Opcional..." value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={() => { setShowModal(false); setForm(emptyForm); }} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', fontSize: '13px', color: '#230606', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '11px', background: '#B8965A', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#230606', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Salvando...' : 'Registrar Despesa'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}