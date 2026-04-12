import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { motion } from 'motion/react';
import { CheckCircle2, Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Evento = {
  nome: string;
  data: string;
  local: string;
  cidade: string;
  tipo: string;
};

type Step = 'search' | 'form' | 'success' | 'not_found' | 'new_guest';

export default function RSVPPage() {
  const { id } = useParams(); // event id
  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('search');

  const [searchName, setSearchName] = useState('');
  const [foundGuest, setFoundGuest] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const [form, setForm] = useState({
    name: '',
    date_of_birth: '',
    companions: '0',
    dietary: '',
    special_needs: '',
    message: '',
    attending: 'yes',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEvento = async () => {
      if (!id) return;
      const { data } = await supabase
        .from('eventos')
        .select('nome, data, local, cidade, tipo')
        .eq('id', id)
        .single();
      setEvento(data);
      setLoading(false);
    };
    fetchEvento();
  }, [id]);

  // Busca convidado pelo nome
  const searchGuest = async () => {
    if (!searchName.trim() || !id) return;
    setSearching(true);
    const { data } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', id)
      .ilike('name', `%${searchName.trim()}%`)
      .limit(1)
      .single();

    if (data) {
      setFoundGuest(data);
      setForm(f => ({ ...f, name: data.name, date_of_birth: data.date_of_birth || '' }));
      setStep('form');
    } else {
      setStep('not_found');
    }
    setSearching(false);
  };

  // Confirmar presença
  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);

    const status = form.attending === 'yes' ? 'confirmed' : 'declined';

    if (foundGuest) {
      // Atualiza convidado existente
      await supabase.from('guests').update({
        status,
        companions: Number(form.companions) || 0,
        dietary: form.dietary || null,
        special_needs: form.special_needs || null,
        message: form.message || null,
        confirmed_at: new Date().toISOString(),
      }).eq('id', foundGuest.id);
    } else {
      // Cria novo convidado (não estava na lista)
      await supabase.from('guests').insert({
        event_id: id,
        name: form.name,
        date_of_birth: form.date_of_birth || null,
        status,
        companions: Number(form.companions) || 0,
        dietary: form.dietary || null,
        special_needs: form.special_needs || null,
        message: form.message || null,
        confirmed_at: new Date().toISOString(),
      });
    }

    setSubmitting(false);
    setStep('success');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(184,150,90,0.3)',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    color: '#F5EFE6',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    color: 'rgba(245,239,230,0.6)',
    marginBottom: '6px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#230606', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#230606', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Header do evento */}
        {evento && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p style={{ fontSize: '11px', color: '#B8965A', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.8 }}>STUDIO ZOE</p>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '36px', color: '#F5EFE6', fontWeight: 400, marginBottom: '12px' }}>
              {evento.nome}
            </h1>
            {evento.data && (
              <p style={{ fontSize: '14px', color: 'rgba(245,239,230,0.6)', marginBottom: '4px' }}>
                {new Date(evento.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            )}
            {evento.local && (
              <p style={{ fontSize: '14px', color: 'rgba(245,239,230,0.5)' }}>
                {evento.local}{evento.cidade ? ` · ${evento.cidade}` : ''}
              </p>
            )}
          </motion.div>
        )}

        {/* STEP: Buscar nome */}
        {step === 'search' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: '#2E0D0D', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '12px', padding: '32px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', color: '#B8965A', fontWeight: 400, marginBottom: '8px' }}>
              Confirmar presença
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(245,239,230,0.55)', marginBottom: '24px' }}>
              Digite seu nome para encontrarmos seu convite.
            </p>
            <label style={labelStyle}>Seu nome</label>
            <input
              style={inputStyle}
              placeholder="Como está no convite..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchGuest()}
            />
            <button onClick={searchGuest} disabled={searching || !searchName.trim()}
              style={{ width: '100%', marginTop: '16px', padding: '13px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.1em', opacity: searching ? 0.7 : 1 }}>
              {searching ? 'BUSCANDO...' : 'BUSCAR MEU CONVITE'}
            </button>
            <button onClick={() => { setStep('new_guest'); setForm(f => ({ ...f, name: searchName })); }}
              style={{ width: '100%', marginTop: '10px', padding: '10px', background: 'transparent', color: 'rgba(245,239,230,0.4)', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
              Não estou na lista — confirmar mesmo assim
            </button>
          </motion.div>
        )}

        {/* STEP: Não encontrado */}
        {step === 'not_found' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: '#2E0D0D', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '15px', color: '#F5EFE6', marginBottom: '8px' }}>Não encontramos "{searchName}"</p>
            <p style={{ fontSize: '13px', color: 'rgba(245,239,230,0.5)', marginBottom: '24px' }}>Tente um nome diferente ou confirme mesmo assim.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => setStep('search')}
                style={{ padding: '11px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                Tentar novamente
              </button>
              <button onClick={() => { setStep('new_guest'); setForm(f => ({ ...f, name: searchName })); }}
                style={{ padding: '11px', background: 'transparent', color: 'rgba(245,239,230,0.5)', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                Confirmar mesmo assim
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP: Formulário (encontrado ou novo) */}
        {(step === 'form' || step === 'new_guest') && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: '#2E0D0D', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '12px', padding: '32px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', color: '#B8965A', fontWeight: 400, marginBottom: '4px' }}>
              {step === 'form' ? `Olá, ${foundGuest?.name?.split(' ')[0]}!` : 'Seus dados'}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(245,239,230,0.55)', marginBottom: '24px' }}>
              Preencha as informações abaixo para confirmar sua presença.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {step === 'new_guest' && (
                <div>
                  <label style={labelStyle}>Nome completo</label>
                  <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Seu nome completo" />
                </div>
              )}

              <div>
                <label style={labelStyle}>Você irá ao evento?</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button onClick={() => setForm({ ...form, attending: 'yes' })}
                    style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${form.attending === 'yes' ? '#B8965A' : 'rgba(184,150,90,0.2)'}`, background: form.attending === 'yes' ? 'rgba(184,150,90,0.15)' : 'transparent', color: form.attending === 'yes' ? '#B8965A' : 'rgba(245,239,230,0.5)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                    ✓ Sim, vou!
                  </button>
                  <button onClick={() => setForm({ ...form, attending: 'no' })}
                    style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${form.attending === 'no' ? 'rgba(239,68,68,0.5)' : 'rgba(184,150,90,0.2)'}`, background: form.attending === 'no' ? 'rgba(239,68,68,0.08)' : 'transparent', color: form.attending === 'no' ? '#dc2626' : 'rgba(245,239,230,0.5)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                    ✕ Não poderei
                  </button>
                </div>
              </div>

              {form.attending === 'yes' && (
                <>
                  <div>
                    <label style={labelStyle}>Data de nascimento</label>
                    <input type="date" style={inputStyle} value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Acompanhantes (além de você)</label>
                    <input type="number" min="0" style={inputStyle} value={form.companions} onChange={e => setForm({ ...form, companions: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Restrição alimentar</label>
                    <input style={inputStyle} placeholder="Ex: vegetariano, sem glúten..." value={form.dietary} onChange={e => setForm({ ...form, dietary: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Necessidade especial</label>
                    <input style={inputStyle} placeholder="Ex: cadeira de rodas, intérprete..." value={form.special_needs} onChange={e => setForm({ ...form, special_needs: e.target.value })} />
                  </div>
                </>
              )}

              <div>
                <label style={labelStyle}>Mensagem para os anfitriões</label>
                <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'none' } as React.CSSProperties}
                  placeholder="Deixe uma mensagem especial..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
              </div>

              <button onClick={handleSubmit} disabled={submitting}
                style={{ width: '100%', padding: '13px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.1em', marginTop: '8px', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'ENVIANDO...' : 'CONFIRMAR PRESENÇA'}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP: Sucesso */}
        {step === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ background: '#2E0D0D', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '12px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: form.attending === 'yes' ? 'rgba(34,197,94,0.1)' : 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              {form.attending === 'yes'
                ? <CheckCircle2 size={28} style={{ color: '#16a34a' }} />
                : <Heart size={28} style={{ color: '#B8965A' }} />
              }
            </div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', color: '#F5EFE6', fontWeight: 400, marginBottom: '12px' }}>
              {form.attending === 'yes' ? 'Presença confirmada!' : 'Resposta registrada'}
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(245,239,230,0.55)', lineHeight: 1.6 }}>
              {form.attending === 'yes'
                ? 'Ficamos felizes em saber que você estará conosco. Até lá!'
                : 'Sentiremos sua falta. Obrigado por nos avisar.'
              }
            </p>
            <p style={{ fontSize: '12px', color: '#B8965A', marginTop: '24px', opacity: 0.7 }}>Studio Zoe · studiozoe.co</p>
          </motion.div>
        )}

      </div>
    </div>
  );
}