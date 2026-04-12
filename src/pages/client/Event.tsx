import React from 'react';
import { motion } from 'motion/react';
import {
  Share2, MapPin, Calendar, CheckCircle2, Circle,
  DollarSign, FileText, MessageCircle, Sparkles, ArrowRight, FolderOpen
} from 'lucide-react';
import { useEvent } from '../../context/EventContext';
import { useNavigate } from 'react-router';

const timelineSteps = ['Contrato', 'Pagamento', 'Moodboard', 'Planejamento', 'Execução', 'Entrega'];
const statusOrder = ['contrato', 'pagamento', 'moodboard', 'planejamento', 'execucao', 'entrega'];

export default function ClientEvent() {
  const { evento, loading } = useEvent();
  const navigate = useNavigate();

  // Aguarda o carregamento antes de qualquer decisão
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5EFE6' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  // Só redireciona se terminou de carregar e não encontrou evento
  if (!loading && !evento) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5EFE6' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#5C1A2E', marginBottom: '8px' }}>
          Nenhum evento encontrado
        </p>
        <p style={{ fontSize: '13px', color: '#230606', opacity: 0.5, marginBottom: '24px' }}>
          Entre em contato com a Studio Zoe para mais informações.
        </p>
        <button onClick={() => navigate('/')}
          style={{ padding: '10px 20px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
          Voltar ao início
        </button>
      </div>
    </div>
  );

  if (!evento) return null;

  const currentStepIndex = statusOrder.indexOf(evento.status?.toLowerCase() || 'planejamento');

  const getStepStatus = (index: number) => {
    if (index < currentStepIndex) return 'complete';
    if (index === currentStepIndex) return 'active';
    return 'pending';
  };

  const summaryCards = [
    {
      name: 'Financeiro',
      icon: DollarSign,
      value: 'Ver pagamentos',
      detail: evento.orcamento ? evento.orcamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Ver detalhes',
      link: '/cliente/financeiro',
    },
    {
      name: 'Contratos',
      icon: FileText,
      value: 'Ver documentos',
      detail: 'Contratos e assinaturas',
      link: '/cliente/contratos',
    },
    {
      name: 'Arquivos',
      icon: FolderOpen,
      value: 'Ver arquivos',
      detail: 'Materiais do seu evento',
      link: '/cliente/Arquivos',
    },
    {
      name: 'Mensagens',
      icon: MessageCircle,
      value: 'Abrir chat',
      detail: 'Fale com a Studio Zoe',
      link: '/cliente/mensagens',
    },
    {
      name: 'Moodboard',
      icon: Sparkles,
      value: 'Ver referências',
      detail: 'Paleta e inspirações',
      link: '/cliente/moodboard',
    },
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>

      {/* Saudação */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', paddingBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '36px', color: '#5C1A2E', marginBottom: '8px', fontWeight: 400 }}>
          Bem-vinda, {evento.cliente_nome?.split(' ')[0]}
        </h1>
        <p style={{ fontSize: '16px', color: '#230606', opacity: 0.6 }}>Cada detalhe do seu evento, em um só lugar</p>
      </motion.div>

      {/* Card do evento */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '10px', padding: '32px', marginBottom: '24px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', marginBottom: '12px', fontWeight: 400 }}>
              {evento.nome}
            </h2>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {evento.data && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#230606', opacity: 0.6 }}>
                  <Calendar size={14} />
                  {new Date(evento.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              )}
              {evento.local && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#230606', opacity: 0.6 }}>
                  <MapPin size={14} />{evento.local}{evento.cidade ? ` — ${evento.cidade}` : ''}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate(`/evento/${evento.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            <Share2 size={14} /> Compartilhar com convidados
          </button>
        </div>

        {/* Status */}
        <div style={{ background: 'rgba(184,150,90,0.08)', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '6px', padding: '12px 16px', marginBottom: '28px' }}>
          <p style={{ fontSize: '13px', color: '#230606', margin: 0 }}>
            <span style={{ color: '#B8965A', fontWeight: 500 }}>Status atual: {evento.status}</span>
          </p>
        </div>

        {/* Timeline */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {timelineSteps.map((step, index) => {
            const status = getStepStatus(index);
            return (
              <div key={step} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${status !== 'pending' ? '#B8965A' : 'rgba(184,150,90,0.3)'}`,
                    background: status === 'complete' ? '#B8965A' : 'transparent'
                  }}>
                    {status === 'complete'
                      ? <CheckCircle2 size={16} style={{ color: '#230606' }} />
                      : <Circle size={16} style={{ color: status === 'active' ? '#B8965A' : 'rgba(184,150,90,0.3)' }} />
                    }
                  </div>
                  <span style={{ fontSize: '11px', color: status === 'pending' ? 'rgba(35,6,6,0.3)' : '#230606', whiteSpace: 'nowrap' }}>
                    {step}
                  </span>
                </div>
                {index < timelineSteps.length - 1 && (
                  <div style={{ flex: 1, height: '1px', background: status === 'complete' ? '#B8965A' : 'rgba(184,150,90,0.2)', margin: '0 4px', marginBottom: '18px' }} />
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Cards de navegação */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.a
              key={card.name}
              href={card.link}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              style={{ background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '10px', padding: '24px', textDecoration: 'none', display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} style={{ color: '#B8965A' }} />
                </div>
                <ArrowRight size={14} style={{ color: '#B8965A', opacity: 0.5 }} />
              </div>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', marginBottom: '6px', fontWeight: 400 }}>{card.name}</h3>
              <p style={{ fontSize: '14px', color: '#B8965A', marginBottom: '4px', fontWeight: 500 }}>{card.value}</p>
              <p style={{ fontSize: '12px', color: '#230606', opacity: 0.5 }}>{card.detail}</p>
            </motion.a>
          );
        })}
      </div>

    </div>
  );
}