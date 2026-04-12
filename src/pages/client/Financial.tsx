import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, AlertCircle, Upload, FileText, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type Sector = {
  id: string;
  name: string;
  value: number;
  paid: number;
  due_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  notes: string | null;
};

type Item = {
  id: string;
  sector_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

type Extra = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  approved: boolean;
};

type Receipt = {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#FDFAF6',
  border: '1px solid rgba(184,150,90,0.2)',
  borderRadius: '10px',
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 18px',
  borderRadius: '20px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '13px',
  background: active ? '#B8965A' : 'transparent',
  color: active ? '#230606' : 'rgba(35,6,6,0.45)',
  fontWeight: active ? 500 : 400,
  transition: 'all 0.2s',
});

const statusConfig = {
  paid:    { label: 'Pago',     bg: 'rgba(34,197,94,0.1)',  color: '#16a34a', icon: CheckCircle2 },
  partial: { label: 'Parcial',  bg: 'rgba(234,179,8,0.1)',  color: '#ca8a04', icon: Clock },
  overdue: { label: 'Vencido',  bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', icon: AlertCircle },
  pending: { label: 'Pendente', bg: 'rgba(184,150,90,0.1)', color: '#B8965A', icon: Clock },
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ClientFinancial() {
  const [eventId, setEventId] = useState<string | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'setores' | 'planilha' | 'extras' | 'comprovantes'>('setores');
  const [expandedSector, setExpandedSector] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  // ── Busca dados pelo email do usuário logado ──────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setLoading(false); return; }

      const { data: evento } = await supabase
        .from('eventos')
        .select('id, budget')
        .eq('cliente_email', user.email)
        .single();

      if (!evento) { setLoading(false); return; }

      setEventId(evento.id);
      setBudget(evento.budget || null);

      const [sectorsRes, itemsRes, extrasRes, receiptsRes] = await Promise.all([
        supabase.from('event_sectors').select('*').eq('event_id', evento.id).order('created_at'),
        supabase.from('event_items').select('*').eq('event_id', evento.id).order('created_at'),
        supabase.from('event_extras').select('*').eq('event_id', evento.id).order('created_at'),
        supabase.from('payment_receipts').select('*').eq('event_id', evento.id).order('created_at', { ascending: false }),
      ]);

      setSectors(sectorsRes.data || []);
      setItems(itemsRes.data || []);
      setExtras(extrasRes.data || []);
      setReceipts(receiptsRes.data || []);
      setLoading(false);
    };

    init();
  }, []);

  // ── Upload de comprovante pelo cliente ────────────────────────────────────

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;
    setUploadingReceipt(true);
    const fileName = `${Date.now()}-${file.name}`;
    await supabase.storage.from('receipts').upload(fileName, file);
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
    const { data } = await supabase.from('payment_receipts').insert({
      event_id: eventId,
      name: file.name,
      file_url: urlData.publicUrl,
    }).select().single();
    if (data) setReceipts(prev => [data, ...prev]);
    setUploadingReceipt(false);
  };

  // ── Marcar setor como pago (apenas com comprovante já enviado) ────────────

  const markSectorPaid = async (sectorId: string) => {
    if (receipts.length === 0) {
      alert('Envie um comprovante antes de marcar como pago.');
      return;
    }
    setMarkingPaid(sectorId);
    await supabase.from('event_sectors').update({ status: 'paid', paid: sectors.find(s => s.id === sectorId)?.value || 0 }).eq('id', sectorId);
    setSectors(prev => prev.map(s => s.id === sectorId ? { ...s, status: 'paid', paid: s.value } : s));
    setMarkingPaid(null);
  };

  // ── Cálculos ──────────────────────────────────────────────────────────────

  const totalEvento = sectors.reduce((s, sec) => s + sec.value, 0) + extras.filter(e => e.approved).reduce((s, e) => s + e.total, 0);
  const totalPaid = sectors.reduce((s, sec) => s + sec.paid, 0);
  const emAberto = totalEvento - totalPaid;
  const pct = totalEvento > 0 ? Math.round((totalPaid / totalEvento) * 100) : 0;

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5EFE6' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      {/* HEADER */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', fontWeight: 400, marginBottom: '4px' }}>Financeiro</h1>
        <p style={{ fontSize: '13px', opacity: 0.5 }}>Acompanhe os pagamentos do seu evento</p>
      </div>

      {/* RESUMO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'Total do Evento', value: fmt(totalEvento), gold: false },
          { label: 'Total Pago', value: fmt(totalPaid), gold: true },
          { label: 'Em Aberto', value: fmt(emAberto), alert: emAberto > 0 },
        ].map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ ...card, padding: '20px' }}>
            <p style={{ fontSize: '11px', opacity: 0.5, marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{c.label}</p>
            <p style={{ fontSize: '24px', fontFamily: 'Playfair Display, serif', fontWeight: 400, color: c.gold ? '#B8965A' : c.alert ? '#dc2626' : '#230606' }}>
              {c.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Budget (se preenchido) */}
      {budget && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ ...card, padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '13px', opacity: 0.6 }}>Budget aprovado</p>
          <p style={{ fontSize: '18px', fontFamily: 'Playfair Display, serif', color: '#B8965A', fontWeight: 400 }}>{fmt(budget)}</p>
        </motion.div>
      )}

      {/* BARRA PROGRESSO */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{ ...card, padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', opacity: 0.6 }}>Progresso de pagamento</span>
          <span style={{ fontSize: '13px', color: '#B8965A', fontWeight: 500 }}>{pct}%</span>
        </div>
        <div style={{ height: '6px', background: 'rgba(184,150,90,0.15)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#B8965A', borderRadius: '99px', transition: 'width 0.6s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontSize: '11px', opacity: 0.4 }}>{fmt(totalPaid)} pagos</span>
          <span style={{ fontSize: '11px', opacity: 0.4 }}>{fmt(emAberto)} em aberto</span>
        </div>
      </motion.div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(184,150,90,0.08)', borderRadius: '24px', padding: '4px', width: 'fit-content' }}>
        {(['setores', 'planilha', 'extras', 'comprovantes'] as const).map(t => (
          <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>
            {{ setores: 'Pagamentos', planilha: 'Planilha', extras: 'Extras', comprovantes: 'Comprovantes' }[t]}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

        {/* SETORES / PAGAMENTOS */}
        {tab === 'setores' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sectors.length === 0 && (
              <div style={{ ...card, padding: '40px', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', opacity: 0.4 }}>Nenhum pagamento cadastrado ainda</p>
              </div>
            )}
            {sectors.map(sector => {
              const cfg = statusConfig[sector.status];
              const Icon = cfg.icon;
              const sectorPct = sector.value > 0 ? Math.round((sector.paid / sector.value) * 100) : 0;
              const isExpanded = expandedSector === sector.id;
              const canMarkPaid = sector.status !== 'paid' && receipts.length > 0;

              return (
                <div key={sector.id} style={{ ...card, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
                    onClick={() => setExpandedSector(isExpanded ? null : sector.id)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '14px', color: '#230606', fontWeight: 400 }}>{sector.name}</h3>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: cfg.bg, color: cfg.color }}>
                          <Icon size={10} /> {cfg.label}
                        </span>
                      </div>
                      <div style={{ height: '3px', background: 'rgba(184,150,90,0.15)', borderRadius: '99px', overflow: 'hidden', maxWidth: '200px' }}>
                        <div style={{ height: '100%', width: `${sectorPct}%`, background: '#B8965A', borderRadius: '99px' }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '16px', fontFamily: 'Playfair Display, serif', color: '#230606' }}>{fmt(sector.value)}</p>
                      <p style={{ fontSize: '11px', opacity: 0.5 }}>{fmt(sector.paid)} pagos</p>
                    </div>
                    {isExpanded ? <ChevronUp size={15} style={{ opacity: 0.4 }} /> : <ChevronDown size={15} style={{ opacity: 0.4 }} />}
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(184,150,90,0.12)', padding: '16px 20px', background: 'rgba(184,150,90,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          {sector.due_date && (
                            <p style={{ fontSize: '13px', opacity: 0.6, marginBottom: '4px' }}>
                              Vencimento: {new Date(sector.due_date).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                          {sector.notes && (
                            <p style={{ fontSize: '12px', opacity: 0.5, fontStyle: 'italic' }}>{sector.notes}</p>
                          )}
                        </div>

                        {/* Botão que o cliente pode usar — só com comprovante enviado */}
                        {sector.status !== 'paid' && (
                          <div>
                            {receipts.length === 0 ? (
                              <p style={{ fontSize: '12px', color: '#B8965A', opacity: 0.7, fontStyle: 'italic' }}>
                                Envie um comprovante primeiro para marcar como pago
                              </p>
                            ) : (
                              <button
                                onClick={() => markSectorPaid(sector.id)}
                                disabled={markingPaid === sector.id}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, opacity: markingPaid === sector.id ? 0.6 : 1 }}>
                                <CheckCircle2 size={14} />
                                {markingPaid === sector.id ? 'Marcando...' : 'Marcar como pago'}
                              </button>
                            )}
                          </div>
                        )}

                        {sector.status === 'paid' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#16a34a' }}>
                            <CheckCircle2 size={14} /> Pagamento confirmado
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* PLANILHA */}
        {tab === 'planilha' && (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>Planilha do Evento</h2>
              <p style={{ fontSize: '13px', color: '#B8965A', fontWeight: 500 }}>{fmt(items.reduce((s, i) => s + i.total, 0))}</p>
            </div>
            {items.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', opacity: 0.4 }}>Nenhum item disponível ainda</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(184,150,90,0.1)' }}>
                    {['Descrição', 'Setor', 'Qtd', 'Valor Unit.', 'Total'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: '11px', opacity: 0.4, fontWeight: 400, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(184,150,90,0.07)' }}>
                      <td style={{ padding: '12px 20px', fontSize: '13px' }}>{item.description}</td>
                      <td style={{ padding: '12px 20px', fontSize: '12px', opacity: 0.5 }}>{sectors.find(s => s.id === item.sector_id)?.name || '—'}</td>
                      <td style={{ padding: '12px 20px', fontSize: '13px' }}>{item.quantity}</td>
                      <td style={{ padding: '12px 20px', fontSize: '13px' }}>{fmt(item.unit_price)}</td>
                      <td style={{ padding: '12px 20px', fontSize: '13px', color: '#B8965A', fontWeight: 500 }}>{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* EXTRAS */}
        {tab === 'extras' && (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>Extras</h2>
              <p style={{ fontSize: '13px', color: '#B8965A', fontWeight: 500 }}>{fmt(extras.filter(e => e.approved).reduce((s, e) => s + e.total, 0))} aprovados</p>
            </div>
            {extras.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', opacity: 0.4 }}>Nenhum extra ainda</div>
            ) : extras.map(extra => (
              <div key={extra.id} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(184,150,90,0.07)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', color: '#230606', marginBottom: '2px' }}>{extra.description}</p>
                  <p style={{ fontSize: '11px', opacity: 0.5 }}>{extra.quantity}x · {fmt(extra.unit_price)} cada</p>
                </div>
                <p style={{ fontSize: '14px', fontFamily: 'Playfair Display, serif' }}>{fmt(extra.total)}</p>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, background: extra.approved ? 'rgba(34,197,94,0.1)' : 'rgba(184,150,90,0.1)', color: extra.approved ? '#16a34a' : '#B8965A' }}>
                  {extra.approved ? <><CheckCircle2 size={11} /> Aprovado</> : 'Aguardando'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* COMPROVANTES */}
        {tab === 'comprovantes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Upload — cliente pode enviar */}
            <div style={{ ...card, padding: '20px' }}>
              <p style={{ fontSize: '13px', color: '#230606', marginBottom: '12px', opacity: 0.7 }}>
                Envie o comprovante do seu pagamento. Após o upload, você poderá marcar o setor correspondente como pago.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', background: 'rgba(184,150,90,0.08)', border: '1px dashed rgba(184,150,90,0.4)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#B8965A', width: 'fit-content' }}>
                <Upload size={15} />
                {uploadingReceipt ? 'Enviando...' : 'Enviar comprovante'}
                <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleUploadReceipt} />
              </label>
            </div>

            {receipts.length === 0 ? (
              <div style={{ ...card, padding: '40px', textAlign: 'center' }}>
                <FileText size={36} style={{ margin: '0 auto 10px', opacity: 0.2 }} />
                <p style={{ fontSize: '13px', opacity: 0.4 }}>Nenhum comprovante enviado ainda</p>
              </div>
            ) : receipts.map(receipt => (
              <div key={receipt.id} style={{ ...card, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} style={{ color: '#B8965A' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', color: '#230606', marginBottom: '2px' }}>{receipt.name}</p>
                  <p style={{ fontSize: '11px', opacity: 0.5 }}>{new Date(receipt.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <a href={receipt.file_url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#B8965A', color: '#230606', borderRadius: '6px', fontSize: '12px', fontWeight: 500, textDecoration: 'none' }}>
                  <Download size={13} /> Ver
                </a>
              </div>
            ))}
          </div>
        )}

      </motion.div>
    </div>
  );
}