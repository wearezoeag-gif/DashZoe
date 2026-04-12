import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { User, Users, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type UserType = 'client' | 'guest' | 'admin' | null;

export default function Login() {
  const [selectedType, setSelectedType] = useState<UserType>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (selectedType === 'guest') {
      // Convidado não precisa de senha, só registra e redireciona
      const { error } = await supabase.auth.signInWithOtp({ email: guestEmail });
      setLoading(false);
      if (error) { setError('Erro ao acessar. Tente novamente.'); return; }
      navigate('/convidado');
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setError('E-mail ou senha incorretos.');
      return;
    }

    const userEmail = data.user?.email ?? '';
    if (selectedType === 'admin' && userEmail.endsWith('@studiozoe.co')) {
      navigate('/admin');
    } else if (selectedType === 'client' && !userEmail.endsWith('@studiozoe.co')) {
      navigate('/cliente');
    } else {
      setError('Acesso não autorizado para este perfil.');
      await supabase.auth.signOut();
    }
  };

  if (!selectedType) {
    return (
      <div style={{ minHeight: '100vh', background: '#230606', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '620px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '52px', color: '#B8965A', marginBottom: '12px', fontWeight: 400 }}>Studio Zoe</h1>
            <p style={{ fontSize: '18px', color: '#F5EFE6', opacity: 0.8, marginBottom: '6px', fontWeight: 300 }}>Eventos Sociais de Alto Padrão</p>
            <p style={{ fontSize: '13px', color: '#F5EFE6', opacity: 0.5 }}>Curadoria de celebrações privadas</p>
          </div>
          <p style={{ textAlign: 'center', color: '#F5EFE6', opacity: 0.9, marginBottom: '32px', fontSize: '16px', fontWeight: 300 }}>
            Acesse seu espaço exclusivo
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            {[
              { type: 'client' as UserType, icon: User, label: 'Sou cliente', sub: 'Acesse seu evento' },
              { type: 'guest' as UserType, icon: Users, label: 'Sou convidado', sub: 'Visualize fotos' },
              { type: 'admin' as UserType, icon: Lock, label: 'Acesso interno', sub: 'Equipe Studio Zoe' },
            ].map(({ type, icon: Icon, label, sub }) => (
              <motion.button
                key={type}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setSelectedType(type); setError(''); }}
                style={{ background: '#2E0D0D', border: '1px solid rgba(184,150,90,0.3)', borderRadius: '8px', padding: '32px 20px', cursor: 'pointer', textAlign: 'center' }}
              >
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Icon size={28} style={{ color: '#B8965A' }} />
                </div>
                <p style={{ color: '#F5EFE6', fontSize: '15px', marginBottom: '4px', fontWeight: 400 }}>{label}</p>
                <p style={{ color: '#F5EFE6', fontSize: '12px', opacity: 0.5, fontWeight: 300, margin: 0 }}>{sub}</p>
              </motion.button>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: '48px', fontSize: '12px', color: '#F5EFE6', opacity: 0.4 }}>
            studiozoe.co
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#230606', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '38px', color: '#B8965A', marginBottom: '8px', fontWeight: 400 }}>Studio Zoe</h1>
          <p style={{ fontSize: '13px', color: '#F5EFE6', opacity: 0.5, margin: 0 }}>
            {selectedType === 'client' && 'Portal do Cliente'}
            {selectedType === 'guest' && 'Acesso Convidado'}
            {selectedType === 'admin' && 'Acesso Interno'}
          </p>
        </div>
        <div style={{ background: '#2E0D0D', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '8px', padding: '32px' }}>
          <form onSubmit={handleLogin}>
            {selectedType === 'guest' ? (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#F5EFE6', opacity: 0.6, marginBottom: '8px', letterSpacing: '0.1em' }}>NOME</label>
                  <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '6px', padding: '10px 14px', color: '#F5EFE6', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="Seu nome" required />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#F5EFE6', opacity: 0.6, marginBottom: '8px', letterSpacing: '0.1em' }}>EMAIL</label>
                  <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '6px', padding: '10px 14px', color: '#F5EFE6', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="seu@email.com" required />
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#F5EFE6', opacity: 0.6, marginBottom: '8px', letterSpacing: '0.1em' }}>EMAIL</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '6px', padding: '10px 14px', color: '#F5EFE6', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="seu@email.com" required />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#F5EFE6', opacity: 0.6, marginBottom: '8px', letterSpacing: '0.1em' }}>SENHA</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '6px', padding: '10px 14px', color: '#F5EFE6', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="••••••••" required />
                </div>
                <button type="button" style={{ background: 'none', border: 'none', color: '#B8965A', fontSize: '12px', cursor: 'pointer', padding: '8px 0 20px', opacity: 0.7 }}>
                  Esqueci minha senha
                </button>
              </>
            )}

            {error && (
              <p style={{ fontSize: '12px', color: '#dc2626', textAlign: 'center', marginBottom: '16px' }}>{error}</p>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '6px', padding: '12px', fontSize: '12px', letterSpacing: '0.15em', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'AGUARDE...' : 'ACESSAR'}
            </button>
          </form>
        </div>
        <button onClick={() => { setSelectedType(null); setError(''); }}
          style={{ width: '100%', background: 'none', border: 'none', color: '#F5EFE6', opacity: 0.4, fontSize: '13px', cursor: 'pointer', marginTop: '20px', padding: '8px' }}>
          ← Voltar
        </button>
      </motion.div>
    </div>
  );
}