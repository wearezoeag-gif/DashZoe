import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { Star, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const PALAVRAS = ['Elegante', 'Especial', 'Inesquecível', 'Detalhado', 'Acolhedor', 'Surpreendente', 'Perfeito', 'Único'];

export default function GuestNPS() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('evento');

  const [step, setStep] = useState<'score' | 'details' | 'done'>('score');
  const [score, setScore] = useState<number | null>(null);
  const [palavra, setPalavra] = useState('');
  const [momento, setMomento] = useState('');
  const [melhoria, setMelhoria] = useState('');
  const [instagram, setInstagram] = useState('');
  const [emailContato, setEmailContato] = useState('');
  const [saving, setSaving] = useState(false);
  const [eventoNome, setEventoNome] = useState('');

  useEffect(() => {
    if (eventId) {
      supabase.from('eventos').select('nome').eq('id', eventId).single().then(({ data }) => {
        if (data) setEventoNome(data.nome);
      });
    }
  }, [eventId]);

  const handleSubmit = async () => {
    if (score === null) return;
    setSaving(true);
    await supabase.from('nps').insert({
      event_id: eventId || null,
      score,
      palavra: palavra || null,
      momento: momento || null,
      melhoria: melhoria || null,
      instagram: instagram || null,
      email_contato: emailContato || null,
    });
    setSaving(false);
    setStep('done');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#230606', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '520px' }}>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '38px', color: '#B8965A', marginBottom: '8px', fontWeight: 400 }}>Studio Zoe</h1>
          {eventoNome && <p style={{ fontSize: '14px', color: '#F5EFE6', opacity: 0.6 }}>{eventoNome}</p>}
        </div>

        {step === 'done' ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ background: '#2E0D0D', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
            <CheckCircle2 size={48} style={{ color: '#B8965A', margin: '0 auto 20px' }} />
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', color: '#F5EFE6', fontWeight: 400, marginBottom: '12px' }}>Obrigada pelo seu feedback!</h2>
            <p style={{ fontSize: '14px', color: '#F5EFE6', opacity: 0.5, lineHeight: 1.6 }}>
              Sua avaliação é muito importante para continuarmos criando experiências inesquecíveis.
            </p>
          </motion.div>
        ) : step === 'score' ? (
          <div style={{ background: '#2E0D0D', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '12px', padding: '32px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', color: '#F5EFE6', fontWeight: 400, marginBottom: '8px', textAlign: 'center' }}>
              Como foi sua experiência?
            </h2>
            <p style={{ fontSize: '13px', color: '#F5EFE6', opacity: 0.5, textAlign: 'center', marginBottom: '32px' }}>
              De 0 a 10, o quanto você recomendaria a Studio Zoe?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: '6px', marginBottom: '12px' }}>
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} onClick={() => setScore(i)}
                  style={{ aspectRatio: '1', borderRadius: '8px', border: `2px solid ${score === i ? '#B8965A' : 'rgba(184,150,90,0.2)'}`, background: score === i ? '#B8965A' : 'transparent', color: score === i ? '#230606' : '#F5EFE6', fontSize: '15px', fontWeight: score === i ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Playfair Display, serif' }}>
                  {i}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
              <p style={{ fontSize: '11px', color: '#F5EFE6', opacity: 0.35 }}>Muito improvável</p>
              <p style={{ fontSize: '11px', color: '#F5EFE6', opacity: 0.35 }}>Com certeza!</p>
            </div>
            <button onClick={() => score !== null && setStep('details')} disabled={score === null}
              style={{ width: '100%', background: score !== null ? '#B8965A' : 'rgba(184,150,90,0.2)', color: '#230606', border: 'none', borderRadius: '8px', padding: '13px', fontSize: '13px', fontWeight: 500, cursor: score !== null ? 'pointer' : 'not-allowed', letterSpacing: '0.05em' }}>
              Continuar
            </button>
          </div>
        ) : (
          <div style={{ background: '#2E0D0D', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '12px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(184,150,90,0.1)', borderRadius: '20px' }}>
                <Star size={14} style={{ color: '#B8965A' }} />
                <span style={{ fontSize: '20px', fontFamily: 'Playfair Display, serif', color: '#B8965A' }}>{score}</span>
              </div>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#F5EFE6', opacity: 0.7, marginBottom: '12px' }}>Uma palavra que define sua experiência:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {PALAVRAS.map(p => (
                  <button key={p} onClick={() => setPalavra(palavra === p ? '' : p)}
                    style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${palavra === p ? '#B8965A' : 'rgba(184,150,90,0.2)'}`, background: palavra === p ? '#B8965A' : 'transparent', color: palavra === p ? '#230606' : '#F5EFE6', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#F5EFE6', opacity: 0.5, marginBottom: '8px', letterSpacing: '0.08em' }}>MOMENTO MAIS MARCANTE (opcional)</label>
              <textarea value={momento} onChange={e => setMomento(e.target.value)} placeholder="Conte-nos um momento especial..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#F5EFE6', fontSize: '13px', outline: 'none', resize: 'none', minHeight: '80px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#F5EFE6', opacity: 0.5, marginBottom: '8px', letterSpacing: '0.08em' }}>O QUE TORNARIA AINDA MAIS ESPECIAL? (opcional)</label>
              <textarea value={melhoria} onChange={e => setMelhoria(e.target.value)} placeholder="Sua sugestão..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#F5EFE6', fontSize: '13px', outline: 'none', resize: 'none', minHeight: '64px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#F5EFE6', opacity: 0.5, marginBottom: '8px', letterSpacing: '0.08em' }}>INSTAGRAM (opcional)</label>
                <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@seuinstagram"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#F5EFE6', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#F5EFE6', opacity: 0.5, marginBottom: '8px', letterSpacing: '0.08em' }}>E-MAIL (opcional)</label>
                <input type="email" value={emailContato} onChange={e => setEmailContato(e.target.value)} placeholder="seu@email.com"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#F5EFE6', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep('score')}
                style={{ padding: '12px 20px', background: 'transparent', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', fontSize: '13px', color: '#F5EFE6', opacity: 0.6, cursor: 'pointer' }}>
                ← Voltar
              </button>
              <button onClick={handleSubmit} disabled={saving}
                style={{ flex: 1, background: '#B8965A', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#230606', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Enviando...' : 'Enviar avaliação'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}