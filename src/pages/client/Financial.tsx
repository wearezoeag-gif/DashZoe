import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, Upload, FileText, Download, ChevronDown, ChevronUp, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useIsMobile } from '../../hooks/useIsMobile';

type Item = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  pagamento_tipo: 'avista' | 'parcelado';
  parcelas_total: number;
  parcelas_pagas: number;
  setor_nome: string;
};

type ComprovanteSetor = {
  id: string;
  setor_nome: string;
  name: string;
  file_url: string;
  created_at: string;
};

const card: React.CSSProperties = { background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '10px' };
const tabStyle = (active: boolean): React.CSSProperties => ({ padding: '8px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', background: active ? '#B8965A' : 'transparent', color: active ? '#230606' : 'rgba(35,6,6,0.45)', fontWeight: active ? 500 : 400, transition: 'all 0.2s' });
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ClientFinancial() {
  const isMobile = useIsMobile();
  const [eventId, setEventId] = useState<string | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [extras, setExtras] = useState<any[]>([]);
  const [extrasAll, setExtrasAll] = useState<any[]>([]);
  const [comprovantesSetor, setComprovantesSetor] = useState<ComprovanteSetor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'planilha' | 'setores' | 'extras' | 'comprovantes'>('planilha');
  const [expandedSetor, setExpandedSetor] = useState<string | null>(null);
  const [uploadingSetor, setUploadingSetor] = useState<string | null>(null);
  const [pagandoItem, setPagandoItem] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setLoading(false); return; }
      const { data: evento } = await supabase.from('eventos').select('id, budget').eq('cliente_email', user.email).single();
      if (!evento) { setLoading(false); return; }
      setEventId(evento.id);
      setBudget(evento.budget || null);
      await fetchAll(evento.id);
      setLoading(false);
    };
    void init();
  }, []);

  const fetchAll = async (eid: string) => {
    const [itemsRes, extrasRes, comprovantesRes] = await Promise.all([
      supabase.from('event_items').select('*, event_sectors(name)').eq('event_id', eid).order('created_at'),
      supabase.from('event_extras').select('*').eq('event_id', eid).order('created_at'),
      supabase.from('comprovantes_setor').select('*').eq('event_id', eid).order('created_at', { ascending: false }),
    ]);
    setItems((itemsRes.data || []).map((i: any) => ({ ...i, pagamento_tipo: i.pagamento_tipo || 'avista', parcelas_total: i.parcelas_total || 1, parcelas_pagas: i.parcelas_pagas || 0, setor_nome: (i.event_sectors as any)?.name || 'Sem setor' })));
    setExtrasAll(extrasRes.data || []);
    setExtras((extrasRes.data || []).filter((e: any) => e.approved));
    setComprovantesSetor(comprovantesRes.data || []);
  };

  const pagarParcela = async (item: Item) => {
    if (item.parcelas_pagas >= item.parcelas_total) return;
    setPagandoItem(item.id);
    const novasPagas = item.parcelas_pagas + 1;
    await supabase.from('event_items').update({ parcelas_pagas: novasPagas }).eq('id', item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, parcelas_pagas: novasPagas } : i));
    setPagandoItem(null);
  };

  const approveExtra = async (extraId: string) => {
    await supabase.from('event_extras').update({ approved: true }).eq('id', extraId);
    setExtrasAll(prev => prev.map((e: any) => e.id === extraId ? { ...e, approved: true } : e));
    setExtras(prev => {
      const atualizado = prev.find((e: any) => e.id === extraId);
      if (atualizado) return prev;
      const extra = extrasAll.find((e: any) => e.id === extraId);
      return extra ? [...prev, { ...extra, approved: true }] : prev;
    });
  };

  const handleUploadComprovante = async (e: React.ChangeEvent<HTMLInputElement>, setorNome: string) => {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;
    setUploadingSetor(setorNome);
    const ext = file.name.split('.').pop();
    const fileName = `${eventId}-${setorNome.replace(/\s+/g, '_').toLowerCase()}-${Date.now()}.${ext}`;
    await supabase.storage.from('receipts').upload(fileName, file, { upsert: true });
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
    const { data } = await supabase.from('comprovantes_setor').insert({ event_id: eventId, setor_nome: setorNome, name: fileName, file_url: urlData.publicUrl }).select().single();
    if (data) setComprovantesSetor(prev => [data as ComprovanteSetor, ...prev]);
    setUploadingSetor(null);
    e.target.value = '';
  };

  // Todos os itens incluindo extras aprovados
  const todosItens: Item[] = [
    ...items,
    ...extras.map(e => ({ id: e.id, description: `[Extra] ${e.description}`, quantity: e.quantity, unit_price: e.unit_price, total: e.total, pagamento_tipo: 'avista' as const, parcelas_total: 1, parcelas_pagas: 0, setor_nome: 'Extras Aprovados' }))
  ];

  const totalPlanilha = todosItens.reduce((s, i) => s + i.total, 0);
  const totalPago = items.reduce((s, i) => s + (i.total / i.parcelas_total) * i.parcelas_pagas, 0);
  const emAberto = totalPlanilha - totalPago;
  const margem = budget ? budget - totalPlanilha : null;

  // Agrupar por setor
  const setoresMap: Record<string, { nome: string; items: Item[]; total: number; pago: number }> = {};
  todosItens.forEach(item => {
    const nome = item.setor_nome || 'Sem setor';
    if (!setoresMap[nome]) setoresMap[nome] = { nome, items: [], total: 0, pago: 0 };
    setoresMap[nome].items.push(item);
    setoresMap[nome].total += item.total;
    setoresMap[nome].pago += (item.total / item.parcelas_total) * item.parcelas_pagas;
  });
  const setores = Object.values(setoresMap);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5EFE6' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: isMobile ? '16px' : '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', fontWeight: 400, marginBottom: '4px' }}>Financeiro</h1>
        <p style={{ fontSize: '13px', opacity: 0.5 }}>Acompanhe os pagamentos do seu evento</p>
      </div>

      {/* 5 CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Budget', value: budget ? fmt(budget) : '—', color: '#230606' },
          { label: 'Total Planilha', value: fmt(totalPlanilha), color: '#230606' },
          { label: 'Margem', value: margem !== null ? fmt(margem) : '—', color: margem !== null && margem >= 0 ? '#16a34a' : '#dc2626' },
          { label: 'Total Pago', value: fmt(totalPago), color: '#B8965A' },
          { label: 'Em Aberto', value: fmt(emAberto), color: emAberto > 0 ? '#dc2626' : '#16a34a' },
        ].map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ ...card, padding: '16px' }}>
            <p style={{ fontSize: '10px', opacity: 0.45, marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{c.label}</p>
            <p style={{ fontSize: '18px', fontFamily: 'Playfair Display, serif', fontWeight: 400, color: c.color }}>{c.value}</p>
          </motion.div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(184,150,90,0.08)', borderRadius: '24px', padding: '4px', width: 'fit-content' }}>
        {(['planilha', 'setores', 'extras', 'comprovantes'] as const).map(t => (
          <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>
            {{ planilha: 'Planilha', setores: 'Setores', extras: 'Extras', comprovantes: 'Comprovantes' }[t]}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

        {/* PLANILHA */}
        {tab === 'planilha' && (
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>Planilha do Evento</h2>
              <p style={{ fontSize: '13px', color: '#B8965A', fontWeight: 500 }}>{fmt(totalPlanilha)}</p>
            </div>
            {todosItens.length === 0 ? (
              <div style={{ padding: isMobile ? '16px' : '40px', textAlign: 'center', fontSize: '13px', opacity: 0.4 }}>Nenhum item ainda</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(184,150,90,0.1)' }}>
                    {['Descrição', 'Setor', 'Qtd', 'Valor Unit.', 'Total', 'Pagamento', 'Ação'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', opacity: 0.4, fontWeight: 400, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todosItens.map(item => {
                    const valorParcela = item.total / item.parcelas_total;
                    const isPago = item.parcelas_pagas >= item.parcelas_total;
                    const pct = Math.round((item.parcelas_pagas / item.parcelas_total) * 100);
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(184,150,90,0.07)' }}>
                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>{item.description}</td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', opacity: 0.5 }}>{item.setor_nome}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>{item.quantity}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>{fmt(item.unit_price)}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#B8965A', fontWeight: 500 }}>{fmt(item.total)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {item.pagamento_tipo === 'parcelado' ? (
                            <div>
                              <p style={{ fontSize: '12px' }}>{item.parcelas_pagas}/{item.parcelas_total}x · {fmt(valorParcela)}</p>
                              <div style={{ height: '3px', background: 'rgba(184,150,90,0.15)', borderRadius: '99px', width: '80px', marginTop: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: isPago ? '#16a34a' : '#B8965A', borderRadius: '99px' }} />
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '20px', background: isPago ? 'rgba(34,197,94,0.1)' : 'rgba(184,150,90,0.08)', color: isPago ? '#16a34a' : '#B8965A' }}>
                              {isPago ? 'Pago' : 'À vista'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {isPago ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#16a34a' }}>
                              <CheckCircle2 size={13} /> Pago
                            </span>
                          ) : (
                            <button onClick={() => pagarParcela(item)} disabled={pagandoItem === item.id}
                              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                              <CreditCard size={12} />
                              {item.pagamento_tipo === 'parcelado' ? `Pagar ${item.parcelas_pagas + 1}/${item.parcelas_total}` : 'Pagar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SETORES */}
        {tab === 'setores' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {setores.length === 0 ? (
              <div style={{ ...card, padding: isMobile ? '16px' : '40px', textAlign: 'center', fontSize: '13px', opacity: 0.4 }}>Nenhum setor ainda</div>
            ) : setores.map(setor => {
              const pct = setor.total > 0 ? Math.round((setor.pago / setor.total) * 100) : 0;
              const isExpanded = expandedSetor === setor.nome;
              return (
                <div key={setor.nome} style={{ ...card, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
                    onClick={() => setExpandedSetor(isExpanded ? null : setor.nome)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '15px', color: '#230606', fontWeight: 400 }}>{setor.nome}</h3>
                        <span style={{ fontSize: '11px', opacity: 0.4 }}>{setor.items.length} item{setor.items.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ height: '4px', background: 'rgba(184,150,90,0.15)', borderRadius: '99px', width: '120px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#B8965A', borderRadius: '99px' }} />
                        </div>
                        <span style={{ fontSize: '11px', opacity: 0.5 }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '16px', fontFamily: 'Playfair Display, serif' }}>{fmt(setor.total)}</p>
                      <p style={{ fontSize: '11px', opacity: 0.5 }}>{fmt(setor.pago)} pago</p>
                    </div>
                    {isExpanded ? <ChevronUp size={15} style={{ opacity: 0.4 }} /> : <ChevronDown size={15} style={{ opacity: 0.4 }} />}
                  </div>
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(184,150,90,0.1)', background: 'rgba(184,150,90,0.02)' }}>
                      {setor.items.map((item, i) => {
                        const valorParcela = item.total / item.parcelas_total;
                        const isPago = item.parcelas_pagas >= item.parcelas_total;
                        return (
                          <div key={item.id} style={{ padding: '12px 20px', borderBottom: i < setor.items.length - 1 ? '1px solid rgba(184,150,90,0.06)' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '13px' }}>{item.description}</p>
                              {item.pagamento_tipo === 'parcelado' && (
                                <p style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>{item.parcelas_pagas}/{item.parcelas_total} parcelas · {fmt(valorParcela)} cada</p>
                              )}
                            </div>
                            <p style={{ fontSize: '13px', color: '#B8965A' }}>{fmt(item.total)}</p>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: isPago ? 'rgba(34,197,94,0.1)' : 'rgba(184,150,90,0.08)', color: isPago ? '#16a34a' : '#B8965A' }}>
                              {isPago ? 'Pago' : item.pagamento_tipo === 'parcelado' ? `${item.parcelas_pagas}/${item.parcelas_total}` : 'Pendente'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* EXTRAS */}
        {tab === 'extras' && (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>Extras</h2>
              <p style={{ fontSize: '13px', color: '#B8965A', fontWeight: 500 }}>{fmt(extrasAll.filter((e: any) => e.approved).reduce((s: number, e: any) => s + e.total, 0))} aprovados</p>
            </div>
            {extrasAll.length === 0 ? (
              <div style={{ padding: isMobile ? '16px' : '40px', textAlign: 'center', fontSize: '13px', opacity: 0.4 }}>Nenhum extra ainda</div>
            ) : extrasAll.map((extra: any) => (
              <div key={extra.id} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(184,150,90,0.07)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', color: '#230606', marginBottom: '2px' }}>{extra.description}</p>
                  <p style={{ fontSize: '11px', opacity: 0.5 }}>{extra.quantity}x · {fmt(extra.unit_price)} cada</p>
                </div>
                <p style={{ fontSize: '14px', fontFamily: 'Playfair Display, serif' }}>{fmt(extra.total)}</p>
                {extra.approved ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
                    <CheckCircle2 size={11} /> Aprovado
                  </span>
                ) : (
                  <button onClick={() => approveExtra(extra.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                    <CheckCircle2 size={13} /> Aprovar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* COMPROVANTES POR SETOR */}
        {tab === 'comprovantes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {setores.length === 0 ? (
              <div style={{ ...card, padding: isMobile ? '16px' : '40px', textAlign: 'center', fontSize: '13px', opacity: 0.4 }}>Nenhum setor ainda</div>
            ) : setores.map(setor => {
              const comprovantesDoSetor = comprovantesSetor.filter(c => c.setor_nome === setor.nome);
              return (
                <div key={setor.nome} style={card}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(184,150,90,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '15px', color: '#5C1A2E', fontWeight: 400 }}>{setor.nome}</h3>
                      <p style={{ fontSize: '11px', opacity: 0.4, marginTop: '2px' }}>{fmt(setor.total)} · {comprovantesDoSetor.length} comprovante{comprovantesDoSetor.length !== 1 ? 's' : ''}</p>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'rgba(184,150,90,0.08)', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#B8965A' }}>
                      <Upload size={13} />
                      {uploadingSetor === setor.nome ? 'Enviando...' : 'Enviar comprovante'}
                      <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleUploadComprovante(e, setor.nome)} />
                    </label>
                  </div>
                  {comprovantesDoSetor.length === 0 ? (
                    <p style={{ padding: '16px 20px', fontSize: '12px', opacity: 0.35 }}>Nenhum comprovante para este setor ainda</p>
                  ) : comprovantesDoSetor.map(c => (
                    <div key={c.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(184,150,90,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={16} style={{ color: '#B8965A' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{c.name}</p>
                        <p style={{ fontSize: '11px', opacity: 0.4 }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <a href={c.file_url} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: '#B8965A', color: '#230606', borderRadius: '6px', fontSize: '12px', fontWeight: 500, textDecoration: 'none' }}>
                        <Download size={12} /> Ver
                      </a>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

      </motion.div>
    </div>
  );
}