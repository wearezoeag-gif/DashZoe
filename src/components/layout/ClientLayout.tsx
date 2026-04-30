import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { LogOut, Menu, X } from 'lucide-react';
import { EventProvider } from '../../context/EventContext';
import NotificationBell from '../NotificationBell';
import { supabase } from '../../lib/supabase';

const navItems = [
  { to: '/cliente', label: 'Meu Evento', end: true },
  { to: '/cliente/financeiro', label: 'Financeiro' },
  { to: '/cliente/contratos', label: 'Documentos' },
  { to: '/cliente/Arquivos', label: 'Arquivos' },
  { to: '/cliente/fotos', label: 'Fotos' },
  { to: '/cliente/mensagens', label: 'Mensagens' },
  { to: '/cliente/moodboard', label: 'Moodboard' },
  { to: '/cliente/convidados', label: 'Convidados' },
  { to: '/cliente/configuracoes', label: 'Configurações' },
];

export default function ClientLayout() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <EventProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F5EFE6', color: '#230606' }}>

        {/* Overlay */}
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(35,6,6,0.5)', zIndex: 40 }} />
        )}

        {/* Sidebar */}
        <aside style={{
          width: '210px', flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: '#230606', position: 'fixed', top: 0, height: '100vh', zIndex: 50,
          left: sidebarOpen ? 0 : '-210px', transition: 'left 0.25s ease',
        }}>
          <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid rgba(184,150,90,0.15)' }}>
            <p style={{ fontFamily: 'Playfair Display, serif', color: 'rgba(245,239,230,0.6)', fontSize: '10px', letterSpacing: '0.3em', margin: 0 }}>STUDIO</p>
            <p style={{ color: '#B8965A', fontFamily: 'Playfair Display, serif', fontSize: '22px', letterSpacing: '0.2em', margin: '2px 0' }}>ZOE</p>
          </div>
          <nav style={{ flex: 1, padding: '20px 16px', overflowY: 'auto' }}>
            {navItems.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setSidebarOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', fontSize: '13px',
                  textDecoration: 'none', marginBottom: '4px',
                  color: isActive ? '#F5EFE6' : 'rgba(245,239,230,0.45)',
                  fontWeight: isActive ? 500 : 300,
                })}>
                {({ isActive }) => (
                  <>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: isActive ? '#B8965A' : 'rgba(184,150,90,0.3)' }} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(184,150,90,0.15)' }}>
            <button onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,239,230,0.4)', width: '100%' }}>
              <LogOut size={15} /> Sair
            </button>
          </div>
        </aside>

        {/* Desktop spacer */}
        <div className="client-desktop-spacer" style={{ width: '210px', flexShrink: 0 }} />

        {/* Conteúdo */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ height: '56px', background: '#FDFAF6', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', flexShrink: 0 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="client-hamburger"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#230606', padding: '4px', flexShrink: 0 }}>
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div style={{ flex: 1 }} />
            {userEmail && <NotificationBell recipient={userEmail} />}
          </div>
          <main style={{ flex: 1, overflow: 'auto' }}>
            <Outlet />
          </main>
        </div>

        <style>{`
          @media (min-width: 769px) {
            .client-hamburger { display: none !important; }
            aside { left: 0 !important; }
          }
          @media (max-width: 768px) {
            .client-desktop-spacer { display: none !important; }
            .client-hamburger { display: block !important; }
          }
        `}</style>
      </div>
    </EventProvider>
  );
}