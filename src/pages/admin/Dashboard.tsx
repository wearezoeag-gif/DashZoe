import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  Calendar, Users, Star, DollarSign, ArrowRight,
  AlertCircle, MessageCircle, TrendingUp, UserCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type Evento = {
  id: string;
  nome: string;
  cliente_nome: string;
  data: string;
  status: string;
  orcamento: number;
};

type Alert = {
  type: 'high' | 'medium' | 'low';
  message: string;
  link?: string;
};

type Mensagem = {
  id: string;
  client_email: string;
  text: string;
  created_at: string;
  eventos?: { nome: string; cliente_nome: string };
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#FDFAF6',
  border: '1px solid rgba(184,150,90,0.2)',
  borderRadius: '10px',
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const statusColors: Record<string, { bg: string; color: string }> = {
  'Em Execução':      { bg: 'rgba(184,150,90,0.12)', color: '#B8965A' },
  'Planejamento':     { bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6' },
  'Contratado':       { bg: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
  'Proposta Enviada': { bg: 'rgba(234,179,8,0.1)',   color: '#ca8a04' },
  'Negociação':       { bg: 'rgba(168,85,247,0.1)',  color: '#9333ea' },
  'Entrega':          { bg: 'rgba(14,165,233,0.1)',  color: '#0ea5e9' },
  'Concluído':        { bg: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [proximosEventos, setProximosEventos] = useState<Evento[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [mensagensRecentes, setMensagensRecentes] = useState<Mensagem[]>([]);

  const [metrics, setMetrics] = useState({
    eventosAtivos: 0,
    receitaStudio: 0,
    leads: 0,
    npsMedia: 0,
    pagamentosVencidos: 0,
    confirmacoesPendentes: 0,
    mensagensNaoLidas: 0,
  });

  useEffect(() => {
    const fetchAll = async () => {

      // Busca eventos ativos primeiro para usar os IDs
      const { data: todosEventosData } = await supabase
        .from('eventos')
        .select('*')
        .order('data', { ascending: true });

      const todosEventos: Evento[] = todosEventosData || [];
      const ativos = todosEventos.filter(e => e.status !== 'Concluído');
      const idsAtivos = ativos.map(e => e.id);

      // Busca paralela do resto
      const [
        sectorsRes,
        sectorsVencidosRes,
        sectorsPendentesRes,
        guestsRes,
        mensagensRes,
        leadsRes,
        npsRes,
      ] = await Promise.all([
        idsAtivos.length > 0
          ? supabase.from('event_sectors').select('value').in('event_id', idsAtivos)
          : Promise.resolve({ data: [] }),
        supabase.from('event_sectors').select('id').eq('status', 'overdue'),
        supabase.from('event_sectors').select('id').eq('status', 'pending'),
        supabase.from('guests').select('id').eq('status', 'pending'),
        supabase.from('messages')
          .select('id, text, created_at, client_email, event_id, eventos(nome, cliente_nome)')
          .eq('sender', 'client')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('leads').select('id'),
        supabase.from('nps').select('score'),
      ]);

      // Receita Studio Zoe = 10% do total dos setores ativos
      const totalSetores = (sectorsRes.data || []).reduce((s: number, r: any) => s + (Number(r.value) || 0), 0);
      const receitaStudio = totalSetores * 0.1;

      // NPS médio (0 se não houver avaliações)
      const npsData = npsRes.data || [];
      const npsMedia = npsData.length > 0
        ? npsData.reduce((s: number, r: any) => s + (Number(r.score) || 0), 0) / npsData.length
        : 0;

      // Leads
      const leads = leadsRes.data?.length || 0;

      // Alertas
      const pagamentosVencidos = sectorsVencidosRes.data?.length || 0;
      const confirmPendentes = guestsRes.data?.length || 0;
      const mensagensNaoLidas = mensagensRes.data?.length || 0;
      const sectorsPendentes = sectorsPendentesRes.data?.length || 0;

      const alertList: Alert[] = [];
      if (pagamentosVencidos > 0) {
        alertList.push({
          type: 'high',
          message: `${pagamentosVencidos} pagamento${pagamentosVencidos > 1 ? 's' : ''} vencido${pagamentosVencidos > 1 ? 's' : ''} — ação necessária`,
          link: '/admin/eventos',
        });
      }
      if (mensagensNaoLidas > 0) {
        alertList.push({
          type: 'medium',
          message: `${mensagensNaoLidas} mensagem${mensagensNaoLidas > 1 ? 'ns' : ''} de cliente${mensagensNaoLidas > 1 ? 's' : ''} sem resposta`,
          link: '/admin/eventos',
        });
      }
      if (confirmPendentes > 0) {
        alertList.push({
          type: 'low',
          message: `${confirmPendentes} confirmação${confirmPendentes > 1 ? 'ões' : ''} de convidado${confirmPendentes > 1 ? 's' : ''} pendente${confirmPendentes > 1 ? 's' : ''}`,
        });
      }
      if (sectorsPendentes > 0) {
        alertList.push({
          type: 'low',
          message: `${sectorsPendentes} setor${sectorsPendentes > 1 ? 'es' : ''} com pagamento pendente`,
        });
      }

      // Próximos eventos (ordenados por data)
      const proximos = ativos
        .filter(e => new Date(e.data) >= new Date())
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
        .slice(0, 5);

      setEventos(ativos);
      setProximosEventos(proximos);
      setAlerts(alertList);
      setMensagensRecentes((mensagensRes.data || []) as unknown as Mensagem[]);
      setMetrics({
        eventosAtivos: ativos.length,
        receitaStudio,
        leads,
        npsMedia,
        pagamentosVencidos,
        confirmacoesPendentes: confirmPendentes,
        mensagensNaoLidas,
      });

      setLoading(false);
    };

    void fetchAll();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5EFE6' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      {/* HEADER */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', marginBottom: '4px', fontWeight: 400 }}>
          Visão Geral
        </h1>
        <p style={{ fontSize: '13px', color: '#230606', opacity: 0.5 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* 4 MÉTRICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>

        {/* Eventos Ativos */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
          style={{ ...card, padding: '20px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <Calendar size={17} style={{ color: '#B8965A' }} />
          </div>
          <p style={{ fontSize: '28px', fontFamily: 'Playfair Display, serif', fontWeight: 400, color: '#230606', marginBottom: '2px' }}>
            {metrics.eventosAtivos}
          </p>
          <p style={{ fontSize: '12px', color: '#230606', opacity: 0.55, marginBottom: '2px' }}>Eventos Ativos</p>
          <p style={{ fontSize: '11px', color: '#230606', opacity: 0.35 }}>em andamento</p>
        </motion.div>

        {/* Leads */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          style={{ ...card, padding: '20px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <Users size={17} style={{ color: '#B8965A' }} />
          </div>
          <p style={{ fontSize: '28px', fontFamily: 'Playfair Display, serif', fontWeight: 400, color: '#230606', marginBottom: '2px' }}>
            {metrics.leads}
          </p>
          <p style={{ fontSize: '12px', color: '#230606', opacity: 0.55, marginBottom: '2px' }}>Leads</p>
          <p style={{ fontSize: '11px', color: '#230606', opacity: 0.35 }}>total cadastrados</p>
        </motion.div>

        {/* NPS */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}
          style={{ ...card, padding: '20px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <Star size={17} style={{ color: '#B8965A' }} />
          </div>
          <p style={{ fontSize: '28px', fontFamily: 'Playfair Display, serif', fontWeight: 400, color: '#230606', marginBottom: '2px' }}>
            {metrics.npsMedia > 0 ? metrics.npsMedia.toFixed(1) : '—'}
          </p>
          <p style={{ fontSize: '12px', color: '#230606', opacity: 0.55, marginBottom: '2px' }}>NPS Médio</p>
          <p style={{ fontSize: '11px', color: '#230606', opacity: 0.35 }}>
            {metrics.npsMedia > 0 ? 'escala de 0 a 10' : 'sem avaliações ainda'}
          </p>
        </motion.div>

        {/* Receita Studio Zoe */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          style={{ ...card, padding: '20px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <DollarSign size={17} style={{ color: '#B8965A' }} />
          </div>
          <p style={{ fontSize: '28px', fontFamily: 'Playfair Display, serif', fontWeight: 400, color: '#B8965A', marginBottom: '2px' }}>
            {metrics.receitaStudio > 0 ? fmt(metrics.receitaStudio) : '—'}
          </p>
          <p style={{ fontSize: '12px', color: '#230606', opacity: 0.55, marginBottom: '2px' }}>Receita Studio Zoe</p>
          <p style={{ fontSize: '11px', color: '#230606', opacity: 0.35 }}>10% sobre fornecedores</p>
        </motion.div>

      </div>

      {/* ALERTAS */}
      {alerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          style={{ ...card, padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <AlertCircle size={16} style={{ color: '#dc2626' }} />
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>Alertas</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.map((alert, i) => (
              <div key={i}
                onClick={() => alert.link && navigate(alert.link)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', borderRadius: '8px',
                  cursor: alert.link ? 'pointer' : 'default',
                  background: alert.type === 'high' ? 'rgba(220,38,38,0.06)' : 'rgba(184,150,90,0.06)',
                  border: `1px solid ${alert.type === 'high' ? 'rgba(220,38,38,0.15)' : 'rgba(184,150,90,0.15)'}`,
                }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: alert.type === 'high' ? '#dc2626' : alert.type === 'medium' ? '#B8965A' : 'rgba(184,150,90,0.5)' }} />
                <p style={{ fontSize: '13px', color: '#230606', flex: 1 }}>{alert.message}</p>
                {alert.link && <ArrowRight size={13} style={{ opacity: 0.3, flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* LINHA 2: PRÓXIMOS EVENTOS + MENSAGENS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

        {/* Próximos eventos */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={card}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>Próximos Eventos</h2>
            <button onClick={() => navigate('/admin/eventos')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#230606', opacity: 0.4 }}>
              Ver todos <ArrowRight size={12} />
            </button>
          </div>
          <div style={{ padding: '8px 0' }}>
            {proximosEventos.length === 0 ? (
              <p style={{ padding: '24px', fontSize: '13px', opacity: 0.4, textAlign: 'center' }}>Nenhum evento próximo</p>
            ) : proximosEventos.map((evento, i) => {
              const diasRestantes = Math.ceil((new Date(evento.data).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={evento.id}
                  onClick={() => navigate(`/admin/eventos/${evento.id}`)}
                  style={{ padding: '12px 20px', borderBottom: i < proximosEventos.length - 1 ? '1px solid rgba(184,150,90,0.08)' : 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(184,150,90,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div>
                    <p style={{ fontSize: '13px', color: '#230606', marginBottom: '3px' }}>{evento.nome}</p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <p style={{ fontSize: '11px', opacity: 0.5 }}>
                        {new Date(evento.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                      <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: statusColors[evento.status]?.bg, color: statusColors[evento.status]?.color }}>
                        {evento.status}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: diasRestantes <= 7 ? '#dc2626' : diasRestantes <= 30 ? '#ca8a04' : '#B8965A', fontWeight: 500 }}>
                    {diasRestantes === 0 ? 'Hoje' : diasRestantes < 0 ? `há ${Math.abs(diasRestantes)}d` : `em ${diasRestantes}d`}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Mensagens recentes */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={card}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>Mensagens</h2>
              {metrics.mensagensNaoLidas > 0 && (
                <span style={{ fontSize: '11px', background: '#dc2626', color: '#fff', borderRadius: '20px', padding: '1px 7px', fontWeight: 500 }}>
                  {metrics.mensagensNaoLidas}
                </span>
              )}
            </div>
          </div>
          <div style={{ padding: '8px 0' }}>
            {mensagensRecentes.length === 0 ? (
              <p style={{ padding: '24px', fontSize: '13px', opacity: 0.4, textAlign: 'center' }}>Nenhuma mensagem recente</p>
            ) : mensagensRecentes.map((msg, i) => (
              <div key={msg.id}
                onClick={() => navigate('/admin/eventos')}
                style={{ padding: '12px 20px', borderBottom: i < mensagensRecentes.length - 1 ? '1px solid rgba(184,150,90,0.08)' : 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(184,150,90,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(184,150,90,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MessageCircle size={12} style={{ color: '#B8965A' }} />
                  </div>
                  <p style={{ fontSize: '12px', color: '#230606', fontWeight: 500 }}>
                    {msg.eventos?.cliente_nome || 'Cliente'}
                  </p>
                  <p style={{ fontSize: '11px', opacity: 0.4, marginLeft: 'auto' }}>
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p style={{ fontSize: '12px', opacity: 0.6, paddingLeft: '34px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {msg.text}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* TODOS OS EVENTOS ATIVOS */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} style={card}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>Eventos Ativos</h2>
          <button onClick={() => navigate('/admin/eventos')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#230606', opacity: 0.4 }}>
            Gerenciar <ArrowRight size={12} />
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(184,150,90,0.12)' }}>
                {['Evento', 'Cliente', 'Data', 'Status', 'Orçamento', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', opacity: 0.4, fontWeight: 400, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eventos.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', fontSize: '13px', opacity: 0.4 }}>Nenhum evento ativo</td></tr>
              )}
              {eventos.map((evento, i) => (
                <tr key={evento.id}
                  onClick={() => navigate(`/admin/eventos/${evento.id}`)}
                  style={{ borderBottom: i < eventos.length - 1 ? '1px solid rgba(184,150,90,0.08)' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(184,150,90,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '13px 20px', fontSize: '13px', color: '#230606' }}>{evento.nome}</td>
                  <td style={{ padding: '13px 20px', fontSize: '13px', opacity: 0.6 }}>{evento.cliente_nome}</td>
                  <td style={{ padding: '13px 20px', fontSize: '13px', opacity: 0.6 }}>
                    {new Date(evento.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '13px 20px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: statusColors[evento.status]?.bg, color: statusColors[evento.status]?.color }}>
                      {evento.status}
                    </span>
                  </td>
                  <td style={{ padding: '13px 20px', fontSize: '13px', color: '#B8965A', fontWeight: 500 }}>
                    {fmt(evento.orcamento || 0)}
                  </td>
                  <td style={{ padding: '13px 20px' }}>
                    <ArrowRight size={14} style={{ opacity: 0.3 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

    </div>
  );
}