import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Save, Bell, User, Lock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Estilos ──────────────────────────────────────────────────────────────────

const card = {
  background: '#FDFAF6',
  border: '1px solid rgba(184,150,90,0.2)',
  borderRadius: '10px',
  overflow: 'hidden' as const,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#F5EFE6',
  border: '1px solid rgba(184,150,90,0.2)',
  borderRadius: '8px',
  padding: '10px 16px',
  fontSize: '13px',
  color: '#230606',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: '#230606',
  opacity: 0.6,
  marginBottom: '8px',
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      style={{ width: '40px', height: '24px', borderRadius: '20px', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, background: on ? '#B8965A' : 'rgba(35,6,6,0.15)', transition: 'background 0.2s' }}>
      <span style={{ position: 'absolute', top: '4px', left: on ? '20px' : '4px', width: '16px', height: '16px', background: '#fff', borderRadius: '50%', transition: 'left 0.2s' }} />
    </button>
  );
}

function SaveButton({ saving, saved, onClick, label = 'Salvar alterações' }: { saving: boolean; saved: boolean; onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} disabled={saving}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: saved ? 'rgba(34,197,94,0.15)' : '#B8965A', color: saved ? '#16a34a' : '#230606', border: saved ? '1px solid rgba(34,197,94,0.3)' : 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 500, width: 'fit-content', transition: 'all 0.3s', opacity: saving ? 0.7 : 1 }}>
      {saved ? <><CheckCircle2 size={14} /> Salvo!</> : <><Save size={14} /> {saving ? 'Salvando...' : label}</>}
    </button>
  );
}

function sectionHeader(icon: React.ReactNode, title: string) {
  return (
    <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(184,150,90,0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
      {icon}
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#5C1A2E', fontWeight: 400 }}>{title}</h2>
    </div>
  );
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ClientSettings() {
  const [userEmail, setUserEmail] = useState('');
  const [eventoNome, setEventoNome] = useState('');

  // Perfil
  const [perfil, setPerfil] = useState({ nome: '', telefone: '', instagram: '' });
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savedPerfil, setSavedPerfil]   = useState(false);

  // Senha
  const [senhas, setSenhas] = useState({ nova: '', confirmar: '' });
  const [savingSenha, setSavingSenha] = useState(false);
  const [savedSenha, setSavedSenha]   = useState(false);
  const [erroSenha, setErroSenha]     = useState('');

  // Notificações
  const [notifs, setNotifs] = useState({
    nova_mensagem: true,
    novo_contrato: true,
    pagamento_confirmado: true,
    novo_moodboard: true,
    fotos_disponiveis: true,
  });
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [savedNotifs, setSavedNotifs]   = useState(false);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || '');

      const meta = user.user_metadata || {};
      setPerfil({
        nome: meta.nome || user.email?.split('@')[0] || '',
        telefone: meta.telefone || '',
        instagram: meta.instagram || '',
      });
      if (meta.notifs_cliente) setNotifs(meta.notifs_cliente);

      // Busca nome do evento
      const { data: evento } = await supabase
        .from('eventos')
        .select('nome')
        .eq('cliente_email', user.email)
        .single();
      if (evento) setEventoNome(evento.nome);
    };
    void init();
  }, []);

  // ── Salvar perfil ─────────────────────────────────────────────────────────

  const handleSavePerfil = async () => {
    setSavingPerfil(true);
    await supabase.auth.updateUser({
      data: { nome: perfil.nome, telefone: perfil.telefone, instagram: perfil.instagram },
    });
    setSavingPerfil(false);
    setSavedPerfil(true);
    setTimeout(() => setSavedPerfil(false), 2500);
  };

  // ── Alterar senha ─────────────────────────────────────────────────────────

  const handleSaveSenha = async () => {
    setErroSenha('');
    if (!senhas.nova) { setErroSenha('Digite a nova senha.'); return; }
    if (senhas.nova.length < 6) { setErroSenha('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (senhas.nova !== senhas.confirmar) { setErroSenha('As senhas não coincidem.'); return; }

    setSavingSenha(true);
    const { error } = await supabase.auth.updateUser({ password: senhas.nova });
    setSavingSenha(false);

    if (error) {
      setErroSenha(error.message);
    } else {
      setSavedSenha(true);
      setSenhas({ nova: '', confirmar: '' });
      setTimeout(() => setSavedSenha(false), 2500);
    }
  };

  // ── Salvar notificações ───────────────────────────────────────────────────

  const handleSaveNotifs = async () => {
    setSavingNotifs(true);
    await supabase.auth.updateUser({ data: { notifs_cliente: notifs } });
    setSavingNotifs(false);
    setSavedNotifs(true);
    setTimeout(() => setSavedNotifs(false), 2500);
  };

  const notifItems = [
    { key: 'nova_mensagem',       label: 'Novas mensagens',         sub: 'Quando a Studio Zoe enviar uma mensagem' },
    { key: 'novo_contrato',       label: 'Novos documentos',        sub: 'Quando um contrato for adicionado' },
    { key: 'pagamento_confirmado',label: 'Pagamento confirmado',     sub: 'Quando um setor for marcado como pago' },
    { key: 'novo_moodboard',      label: 'Atualizações no moodboard', sub: 'Quando novas referências forem adicionadas' },
    { key: 'fotos_disponiveis',   label: 'Fotos disponíveis',       sub: 'Quando as fotos do evento forem publicadas' },
  ] as const;

  return (
    <div style={{ padding: '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      {/* HEADER */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', marginBottom: '4px', fontWeight: 400 }}>
          Configurações
        </h1>
        <p style={{ fontSize: '13px', color: '#230606', opacity: 0.5 }}>
          {eventoNome ? `${eventoNome} · ` : ''}{userEmail}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>

        {/* ── PERFIL ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={card}>
          {sectionHeader(<User size={18} style={{ color: '#B8965A' }} />, 'Meu Perfil')}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Como prefere ser chamado(a)</label>
              <input style={inputStyle} value={perfil.nome} onChange={e => setPerfil({ ...perfil, nome: e.target.value })} placeholder="Seu nome" />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} value={userEmail} readOnly />
              <p style={{ fontSize: '11px', opacity: 0.4, marginTop: '4px' }}>Para alterar o email, fale com a Studio Zoe</p>
            </div>
            <div>
              <label style={labelStyle}>Telefone</label>
              <input style={inputStyle} value={perfil.telefone} onChange={e => setPerfil({ ...perfil, telefone: e.target.value })} placeholder="(11) 99999-0000" />
            </div>
            <div>
              <label style={labelStyle}>Instagram</label>
              <input style={inputStyle} value={perfil.instagram} onChange={e => setPerfil({ ...perfil, instagram: e.target.value })} placeholder="@seu_instagram" />
            </div>
            <SaveButton saving={savingPerfil} saved={savedPerfil} onClick={handleSavePerfil} />
          </div>
        </motion.div>

        {/* ── NOTIFICAÇÕES ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} style={card}>
          {sectionHeader(<Bell size={18} style={{ color: '#B8965A' }} />, 'Notificações')}
          <div style={{ padding: '0 24px' }}>
            {notifItems.map(({ key, label, sub }, i) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: i < notifItems.length - 1 ? '1px solid rgba(184,150,90,0.12)' : 'none' }}>
                <div style={{ flex: 1, paddingRight: '16px' }}>
                  <p style={{ fontSize: '13px', color: '#230606', marginBottom: '2px' }}>{label}</p>
                  <p style={{ fontSize: '11px', color: '#230606', opacity: 0.5 }}>{sub}</p>
                </div>
                <Toggle on={notifs[key]} onChange={v => setNotifs({ ...notifs, [key]: v })} />
              </div>
            ))}
          </div>
          <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(184,150,90,0.12)' }}>
            <SaveButton saving={savingNotifs} saved={savedNotifs} onClick={handleSaveNotifs} />
          </div>
        </motion.div>

        {/* ── SEGURANÇA ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={card}>
          {sectionHeader(<Lock size={18} style={{ color: '#B8965A' }} />, 'Segurança')}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Nova senha</label>
              <input type="password" style={inputStyle} value={senhas.nova} onChange={e => setSenhas({ ...senhas, nova: e.target.value })} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label style={labelStyle}>Confirmar nova senha</label>
              <input type="password" style={inputStyle} value={senhas.confirmar} onChange={e => setSenhas({ ...senhas, confirmar: e.target.value })} placeholder="Repita a nova senha" />
            </div>
            {erroSenha && (
              <p style={{ fontSize: '12px', color: '#dc2626' }}>{erroSenha}</p>
            )}
            <SaveButton saving={savingSenha} saved={savedSenha} onClick={handleSaveSenha} label="Alterar senha" />
          </div>
        </motion.div>

      </div>
    </div>
  );
}