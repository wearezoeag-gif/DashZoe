import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Star, TrendingUp, Users, MessageCircle, ChevronDown, ChevronUp, Instagram, Mail, Copy, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useIsMobile } from '../../hooks/useIsMobile';

type NPS = {
  id: string;
  event_id: string | null;
  score: number;
  palavra: string | null;
  momento: string | null;
  melhoria: string | null;
  instagram: string | null;
  email_contato: string | null;
  created_at: string;
  evento?: { nome: string; data: string } | null;
};

const card: React.CSSProperties = {
  background: '#FDFAF6',
  border: '1px solid rgba(184,150,90,0.2)',
  borderRadius: '10px',
};

function getScoreCategory(score: number): { label: string; color: string; bg: string } {
  if (score >= 9) return { label: 'Promotor', color: '#16a34a', bg: 'rgba(34,197,94,0.1)' };
  if (score >= 7) return { label: 'Neutro',   color: '#ca8a04', bg: 'rgba(234,179,8,0.1)' };
  return              { label: 'Detrator',  color: '#dc2626', bg: 'rgba(239,68,68,0.1)' };
}

function calcNPS(responses: NPS[]): number {
  if (responses.length === 0) return 0;
  const promoters = responses.filter(r => r.score >= 9).length;
  const detractors = responses.filter(r => r.score <= 6).length;
  return Math.round(((promoters - detractors) / responses.length) * 100);
}

function NPSLinkButton() {
  const [eventos, setEventos] = React.useState<{id: string, nome: string}[]>([]);
  const [selected, setSelected] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    supabase.from('eventos').select('id, nome').order('data', { ascending: false }).then(({ data }) => setEventos(data || []));
  }, []);

  const copy = () => {
    const base = `${window.location.origin}/dashboard/nps`;
    const link = selected ? `${base}?evento=${selected}` : base;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      <select value={selected} onChange={e => setSelected(e.target.value)}
        style={{ background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#230606', outline: 'none', cursor: 'pointer' }}>
        <option value="">Todos os eventos</option>
        {eventos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
      </select>
      <button onClick={copy}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: copied ? 'rgba(34,197,94,0.1)' : '#B8965A', color: copied ? '#16a34a' : '#230606', border: copied ? '1px solid rgba(34,197,94,0.3)' : 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.2s' }}>
        {copied ? <><CheckCircle2 size={14} /> Link copiado!</> : <><Copy size={14} /> Copiar link NPS</>}
      </button>
    </div>
  );
}

export default function AdminNPS() {
  const isMobile = useIsMobile();
  const [responses, setResponses] = useState<NPS[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todos' | 'promotores' | 'neutros' | 'detratores'>('todos');

  useEffect(() => {
    const fetchNPS = async () => {
      const { data } = await supabase
        .from('nps')
        .select('*, evento:event_id(nome, data)')
        .order('created_at', { ascending: false });
      setResponses((data || []) as NPS[]);
      setLoading(false);
    };
    void fetchNPS();
  }, []);

  const promotores  = responses.filter(r => r.score >= 9);
  const neutros     = responses.filter(r => r.score >= 7 && r.score <= 8);
  const detratores  = responses.filter(r => r.score <= 6);
  const media       = responses.length > 0 ? (responses.reduce((s, r) => s + r.score, 0) / responses.length).toFixed(1) : '—';
  const npsScore    = calcNPS(responses);

  const palavras = responses.filter(r => r.palavra).map(r => r.palavra!);
  const palavraTop = palavras.length > 0
    ? Object.entries(palavras.reduce((acc: Record<string, number>, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {}))
        .sort((a, b) => b[1] - a[1])[0][0]
    : null;

  const filtered = responses.filter(r => {
    if (filter === 'promotores') return r.score >= 9;
    if (filter === 'neutros')    return r.score >= 7 && r.score <= 8;
    if (filter === 'detratores') return r.score <= 6;
    return true;
  });

  type Metrica = { label: string; value: string | number; icon: React.ElementType; sub: string; gold?: boolean; green?: boolean; text?: boolean };

  const metricas: Metrica[] = [
    { label: 'Respostas',   value: responses.length, icon: Users,         sub: 'total coletado' },
    { label: 'Score NPS',  value: responses.length > 0 ? npsScore : '—', icon: TrendingUp, sub: 'promotores − detratores', gold: true },
    { label: 'Nota Média', value: media,              icon: Star,          sub: 'escala de 0 a 10' },
    { label: 'Promotores', value: promotores.length,  icon: TrendingUp,    sub: `${responses.length > 0 ? Math.round(promotores.length / responses.length * 100) : 0}% das respostas`, green: true },
    { label: 'Palavra Top',value: palavraTop || '—',  icon: MessageCircle, sub: 'mais citada', text: true },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5EFE6' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', marginBottom: '4px', fontWeight: 400 }}>NPS</h1>
          <p style={{ fontSize: '13px', color: '#230606', opacity: 0.5 }}>Avaliações de experiência dos convidados</p>
        </div>
        <NPSLinkButton />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {metricas.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              style={{ ...card, padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} style={{ color: '#B8965A' }} />
                </div>
                <p style={{ fontSize: '11px', opacity: 0.5 }}>{m.label}</p>
              </div>
              <p style={{ fontFamily: m.text ? 'Inter, sans-serif' : 'Playfair Display, serif', fontSize: m.text ? '16px' : '26px', fontWeight: m.text ? 500 : 400, color: m.gold ? '#B8965A' : m.green ? '#16a34a' : '#230606', marginBottom: '2px' }}>
                {m.value}
              </p>
              <p style={{ fontSize: '11px', opacity: 0.35 }}>{m.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {responses.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ ...card, padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '15px', color: '#5C1A2E', fontWeight: 400 }}>Distribuição de respostas</h3>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <span style={{ color: '#dc2626' }}>● Detratores {detratores.length}</span>
              <span style={{ color: '#ca8a04' }}>● Neutros {neutros.length}</span>
              <span style={{ color: '#16a34a' }}>● Promotores {promotores.length}</span>
            </div>
          </div>
          <div style={{ display: 'flex', height: '12px', borderRadius: '99px', overflow: 'hidden', gap: '2px' }}>
            {detratores.length > 0 && <div style={{ flex: detratores.length, background: '#dc2626', opacity: 0.7, transition: 'flex 0.5s' }} />}
            {neutros.length > 0 && <div style={{ flex: neutros.length, background: '#ca8a04', opacity: 0.7, transition: 'flex 0.5s' }} />}
            {promotores.length > 0 && <div style={{ flex: promotores.length, background: '#16a34a', opacity: 0.7, transition: 'flex 0.5s' }} />}
          </div>
        </motion.div>
      )}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {([
          { key: 'todos',      label: `Todos (${responses.length})` },
          { key: 'promotores', label: `Promotores (${promotores.length})` },
          { key: 'neutros',    label: `Neutros (${neutros.length})` },
          { key: 'detratores', label: `Detratores (${detratores.length})` },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: '1px solid rgba(184,150,90,0.25)', background: filter === f.key ? '#B8965A' : 'transparent', color: '#230606', opacity: filter === f.key ? 1 : 0.6 }}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {responses.length === 0 ? (
          <div style={{ ...card, padding: '64px', textAlign: 'center' }}>
            <Star size={40} style={{ margin: '0 auto 16px', color: '#B8965A', opacity: 0.2 }} />
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', color: '#5C1A2E', fontWeight: 400, marginBottom: '8px' }}>Nenhuma avaliação ainda</h3>
            <p style={{ fontSize: '13px', opacity: 0.4 }}>As respostas aparecerão aqui após os convidados preencherem o formulário de NPS</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...card, padding: isMobile ? '16px' : '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', opacity: 0.4 }}>Nenhuma resposta nessa categoria</p>
          </div>
        ) : filtered.map((nps, i) => {
          const cat = getScoreCategory(nps.score);
          const isExpanded = expandedId === nps.id;
          const hasDetails = nps.momento || nps.melhoria || nps.instagram || nps.email_contato;

          return (
            <motion.div key={nps.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}
              style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: hasDetails ? 'pointer' : 'default' }}
                onClick={() => hasDetails && setExpandedId(isExpanded ? null : nps.id)}>
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '20px', fontFamily: 'Playfair Display, serif', color: cat.color, fontWeight: 400 }}>{nps.score}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '20px', background: cat.bg, color: cat.color, fontWeight: 500 }}>{cat.label}</span>
                    {nps.palavra && <span style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '20px', background: 'rgba(184,150,90,0.1)', color: '#B8965A' }}>{nps.palavra}</span>}
                    {nps.evento && <span style={{ fontSize: '12px', opacity: 0.5 }}>{(nps.evento as any).nome}</span>}
                  </div>
                  <p style={{ fontSize: '12px', opacity: 0.4 }}>
                    {new Date(nps.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {nps.instagram && ` · @${nps.instagram.replace('@', '')}`}
                  </p>
                </div>
                {hasDetails && (isExpanded ? <ChevronUp size={16} style={{ opacity: 0.3, flexShrink: 0 }} /> : <ChevronDown size={16} style={{ opacity: 0.3, flexShrink: 0 }} />)}
              </div>

              {isExpanded && (
                <div style={{ padding: '16px 20px 20px', borderTop: '1px solid rgba(184,150,90,0.1)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {nps.momento && (
                    <div>
                      <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.4, marginBottom: '6px' }}>Momento mais marcante</p>
                      <p style={{ fontSize: '13px', color: '#230606', lineHeight: 1.6, fontStyle: 'italic', opacity: 0.8 }}>"{nps.momento}"</p>
                    </div>
                  )}
                  {nps.melhoria && (
                    <div>
                      <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.4, marginBottom: '6px' }}>O que tornaria ainda mais excepcional</p>
                      <p style={{ fontSize: '13px', color: '#230606', lineHeight: 1.6, opacity: 0.8 }}>{nps.melhoria}</p>
                    </div>
                  )}
                  {(nps.instagram || nps.email_contato) && (
                    <div style={{ display: 'flex', gap: '16px', paddingTop: '8px', borderTop: '1px solid rgba(184,150,90,0.1)' }}>
                      {nps.instagram && (
                        <a href={`https://instagram.com/${nps.instagram.replace('@', '')}`} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#B8965A', textDecoration: 'none' }}>
                          <Instagram size={13} /> @{nps.instagram.replace('@', '')}
                        </a>
                      )}
                      {nps.email_contato && (
                        <a href={`mailto:${nps.email_contato}`}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#B8965A', textDecoration: 'none' }}>
                          <Mail size={13} /> {nps.email_contato}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}