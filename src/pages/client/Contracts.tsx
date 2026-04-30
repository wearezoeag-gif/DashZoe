import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Download, CheckCircle2, Clock, PenLine, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Contract = {
  id: string;
  name: string;
  date: string;
  status: 'signed' | 'pending';
  size: string;
  file_url: string;
};

const card = { background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '10px' };
const inputStyle: React.CSSProperties = { width: '100%', background: '#F5EFE6', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#230606', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', color: '#230606', opacity: 0.5, marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' };

export default function ClientContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState<Contract | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerCpf, setSignerCpf] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchContracts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: evento } = await supabase
        .from('eventos')
        .select('id')
        .eq('cliente_email', user.email)
        .single();

      if (!evento) { setLoading(false); return; }

      const { data } = await supabase
        .from('contracts')
        .select('*')
        .eq('event_id', evento.id)
        .order('created_at', { ascending: true });

      setContracts(data || []);
    } catch (err) {
      console.log('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchContracts(); }, []);

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').substring(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleSign = async () => {
    if (!signing) return;
    if (!signerName.trim()) { setError('Informe seu nome completo.'); return; }
    const cpfClean = signerCpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) { setError('CPF inválido.'); return; }

    setSaving(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Registrar assinatura
      await supabase.from('contract_signatures').insert({
        contract_id: signing.id,
        signer_name: signerName.trim(),
        signer_cpf: cpfClean,
        signer_email: user?.email || null,
      });

      // Atualizar status do contrato
      await supabase.from('contracts').update({ status: 'signed' }).eq('id', signing.id);

      setContracts(prev => prev.map(c => c.id === signing.id ? { ...c, status: 'signed' } : c));
      setSuccess(`Contrato "${signing.name}" assinado com sucesso!`);
      setSigning(null);
      setSignerName('');
      setSignerCpf('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Erro ao assinar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5EFE6' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: '896px', margin: '0 auto', padding: '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', marginBottom: '4px', fontWeight: 400 }}>Contratos</h1>
        <p style={{ fontSize: '13px', color: '#230606', opacity: 0.5 }}>Visualize e assine os documentos do seu evento</p>
      </div>

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '8px', marginBottom: '20px' }}>
          <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
          <p style={{ fontSize: '13px', color: '#16a34a' }}>{success}</p>
        </div>
      )}

      {contracts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {contracts.map((contract) => (
            <motion.div key={contract.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              style={{ ...card, padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={26} style={{ color: '#B8965A' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '16px', color: '#230606', marginBottom: '4px', fontWeight: 400 }}>{contract.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#230606', opacity: 0.55 }}>
                        <span>{contract.date}</span>
                        {contract.size && <><span>•</span><span>{contract.size}</span></>}
                      </div>
                    </div>
                    {contract.status === 'signed' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', fontSize: '12px', flexShrink: 0 }}>
                        <CheckCircle2 size={13} /> Assinado digitalmente
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(184,150,90,0.15)', color: '#B8965A', fontSize: '12px', flexShrink: 0 }}>
                        <Clock size={13} /> Aguardando assinatura
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {contract.file_url && (
                      <a href={contract.file_url} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(184,150,90,0.1)', color: '#B8965A', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '6px', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
                        <Download size={14} /> Visualizar
                      </a>
                    )}
                    {contract.status === 'pending' && (
                      <button onClick={() => { setSigning(contract); setError(''); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                        <PenLine size={14} /> Assinar digitalmente
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, padding: '48px', textAlign: 'center' }}>
          <FileText size={56} style={{ margin: '0 auto 16px', color: '#230606', opacity: 0.2 }} />
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#5C1A2E', fontWeight: 400, marginBottom: '8px' }}>Nenhum contrato disponível</h3>
          <p style={{ fontSize: '13px', color: '#230606', opacity: 0.55 }}>Seu contrato será disponibilizado em breve</p>
        </motion.div>
      )}

      {/* Modal de assinatura */}
      {signing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(35,6,6,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '12px', width: '100%', maxWidth: '480px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#5C1A2E', fontWeight: 400 }}>Assinatura Digital</h2>
                <p style={{ fontSize: '12px', opacity: 0.5, marginTop: '2px' }}>{signing.name}</p>
              </div>
              <button onClick={() => { setSigning(null); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px 16px', background: 'rgba(184,150,90,0.06)', border: '1px solid rgba(184,150,90,0.15)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <AlertCircle size={14} style={{ color: '#B8965A', flexShrink: 0, marginTop: '1px' }} />
                  <p style={{ fontSize: '12px', color: '#230606', opacity: 0.7, lineHeight: 1.5 }}>
                    Ao assinar, você confirma que leu e concorda com todos os termos do contrato. Sua assinatura ficará registrada com data, hora e CPF.
                  </p>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Nome completo *</label>
                <input style={inputStyle} placeholder="Exatamente como no documento" value={signerName} onChange={e => setSignerName(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>CPF *</label>
                <input style={inputStyle} placeholder="000.000.000-00" value={signerCpf} onChange={e => setSignerCpf(formatCPF(e.target.value))} maxLength={14} />
              </div>
              {error && (
                <p style={{ fontSize: '12px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={12} /> {error}
                </p>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button onClick={() => { setSigning(null); setError(''); }}
                  style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', fontSize: '13px', color: '#230606', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSign} disabled={saving}
                  style={{ flex: 1, padding: '12px', background: '#B8965A', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#230606', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <PenLine size={14} /> {saving ? 'Assinando...' : 'Confirmar assinatura'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}