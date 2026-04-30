import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Save, Bell, User, Lock, Globe, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useIsMobile } from '../../hooks/useIsMobile';

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
    <button
      onClick={() => onChange(!on)}
      style={{ width: '40px', height: '24px', borderRadius: '20px', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, background: on ? '#B8965A' : 'rgba(35,6,6,0.15)', transition: 'background 0.2s' }}
    >
      <span style={{ position: 'absolute', top: '4px', left: on ? '20px' : '4px', width: '16px', height: '16px', background: '#fff', borderRadius: '50%', transition: 'left 0.2s' }} />
    </button>
  );
}

function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={saving}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: saved ? 'rgba(34,197,94,0.15)' : '#B8965A', color: saved ? '#16a34a' : '#230606', border: saved ? '1px solid rgba(34,197,94,0.3)' : 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 500, width: 'fit-content', transition: 'all 0.3s', opacity: saving ? 0.7 : 1 }}>
      {saved ? <><CheckCircle2 size={14} /> Salvo!</> : <><Save size={14} /> {saving ? 'Salvando...' : 'Salvar alterações'}</>}
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

export default function AdminSettings() {
  const isMobile = useIsMobile();
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId]       = useState('');

  // Perfil
  const [perfil, setPerfil] = useState({ nome: 'Studio Zoe', email: '', telefone: '', site: 'studiozoe.co', instagram: '@studio___zoe' });
  const [savingPerfil, setSavingPerfil]   = useState(false);
  const [savedPerfil, setSavedPerfil]     = useState(false);

  // Senha
  const [senhas, setSenhas] = useState({ atual: '', nova: '', confirmar: '' });
  const [savingSenha, setSavingSenha]   = useState(false);
  const [savedSenha, setSavedSenha]     = useState(false);
  const [erroSenha, setErroSenha]       = useState('');

  // Notificações
  const [notifs, setNotifs] = useState({
    pagamento_vencido: true,
    novos_leads: true,
    mensagens_clientes: true,
    relatorios_semanais: false,
    nps_disponivel: true,
    atualizacoes_sistema: false,
  });
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [savedNotifs, setSavedNotifs]   = useState(false);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setUserEmail(user.email || '');
      setPerfil(prev => ({ ...prev, email: user.email || '' }));

      // Carrega metadata se existir
      const meta = user.user_metadata || {};
      setPerfil(prev => ({
        ...prev,
        nome: meta.nome || prev.nome,
        telefone: meta.telefone || prev.telefone,
        site: meta.site || prev.site,
        instagram: meta.instagram || prev.instagram,
      }));

      // Carrega preferências de notificação
      if (meta.notifs) setNotifs(meta.notifs);
    };
    void init();
  }, []);

  // ── Salvar perfil ─────────────────────────────────────────────────────────

  const handleSavePerfil = async () => {
    setSavingPerfil(true);
    const { error } = await supabase.auth.updateUser({
      email: perfil.email !== userEmail ? perfil.email : undefined,
      data: { nome: perfil.nome, telefone: perfil.telefone, site: perfil.site, instagram: perfil.instagram },
    });
    setSavingPerfil(false);
    if (!error) {
      setSavedPerfil(true);
      setTimeout(() => setSavedPerfil(false), 2500);
    }
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
      setSenhas({ atual: '', nova: '', confirmar: '' });
      setTimeout(() => setSavedSenha(false), 2500);
    }
  };

  // ── Salvar notificações ───────────────────────────────────────────────────

  const handleSaveNotifs = async () => {
    setSavingNotifs(true);
    await supabase.auth.updateUser({ data: { notifs } });
    setSavingNotifs(false);
    setSavedNotifs(true);
    setTimeout(() => setSavedNotifs(false), 2500);
  };

  const notifItems = [
    { key: 'pagamento_vencido', label: 'Alertas de pagamento vencido', sub: 'Notificar quando um pagamento atrasar' },
    { key: 'novos_leads', label: 'Novos leads', sub: 'Receber alerta a cada novo lead' },
    { key: 'mensagens_clientes', label: 'Mensagens de clientes', sub: 'Notificar novas mensagens recebidas' },
    { key: 'relatorios_semanais', label: 'Relatórios semanais', sub: 'Resumo enviado toda segunda-feira' },
    { key: 'nps_disponivel', label: 'NPS disponível', sub: 'Quando uma avaliação for enviada' },
    { key: 'atualizacoes_sistema', label: 'Atualizações do sistema', sub: 'Novidades e melhorias da plataforma' },
  ] as const;

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', marginBottom: '4px', fontWeight: 400 }}>Configurações</h1>
        <p style={{ fontSize: '13px', color: '#230606', opacity: 0.5 }}>Perfil e preferências do sistema</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '24px' }}>

        {/* ── PERFIL ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={card}>
          {sectionHeader(<User size={18} style={{ color: '#B8965A' }} />, 'Perfil do Studio')}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Nome do Studio</label>
              <input style={inputStyle} value={perfil.nome} onChange={e => setPerfil({ ...perfil, nome: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Email de contato</label>
              <input type="email" style={inputStyle} value={perfil.email} onChange={e => setPerfil({ ...perfil, email: e.target.value })} />
              {perfil.email !== userEmail && (
                <p style={{ fontSize: '11px', color: '#B8965A', marginTop: '4px', opacity: 0.8 }}>
                  Um email de confirmação será enviado para o novo endereço
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Telefone</label>
              <input style={inputStyle} value={perfil.telefone} onChange={e => setPerfil({ ...perfil, telefone: e.target.value })} placeholder="(11) 99999-0000" />
            </div>
            <div>
              <label style={labelStyle}>Site</label>
              <input style={inputStyle} value={perfil.site} onChange={e => setPerfil({ ...perfil, site: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Instagram</label>
              <input style={inputStyle} value={perfil.instagram} onChange={e => setPerfil({ ...perfil, instagram: e.target.value })} />
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
            <div>
              <p style={{ fontSize: '12px', color: '#230606', opacity: 0.45, marginBottom: '16px', lineHeight: 1.6 }}>
                Email atual: <strong>{userEmail}</strong>
              </p>
              <SaveButton saving={savingSenha} saved={savedSenha} onClick={handleSaveSenha} />
            </div>
          </div>
        </motion.div>

        {/* ── SISTEMA ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} style={card}>
          {sectionHeader(<Globe size={18} style={{ color: '#B8965A' }} />, 'Sistema')}
          <div style={{ padding: '0 24px' }}>
            {[
              { label: 'Idioma', value: 'Português (Brasil)' },
              { label: 'Fuso horário', value: 'America/São_Paulo (UTC-3)' },
              { label: 'Formato de data', value: 'DD/MM/AAAA' },
              { label: 'Moeda', value: 'BRL — Real Brasileiro' },
            ].map((item, i, arr) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(184,150,90,0.12)' : 'none' }}>
                <p style={{ fontSize: '13px', color: '#230606', opacity: 0.6 }}>{item.label}</p>
                <p style={{ fontSize: '13px', color: '#230606' }}>{item.value}</p>
              </div>
            ))}
            <div style={{ padding: '20px 0', borderTop: '1px solid rgba(184,150,90,0.12)', marginTop: '4px' }}>
              <p style={{ fontSize: '11px', color: '#230606', opacity: 0.3 }}>Studio Zoe Dashboard v1.0.0</p>
              <p style={{ fontSize: '11px', color: '#230606', opacity: 0.25, marginTop: '2px' }}>
                Logado como {userEmail}
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}