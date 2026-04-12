import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { LogOut } from 'lucide-react';
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  return (
    <EventProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F5EFE6', color: '#230606' }}>
        <aside style={{ width: '210px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#230606' }}>
          <div style={{ padding: '32px 24px', borderBottom: '1px solid rgba(184,150,90,0.15)' }}>
            <p style={{ fontFamily: 'Playfair Display, serif', color: 'rgba(245,239,230,0.7)', fontSize: '10px', letterSpacing: '0.3em', margin: 0 }}>STUDIO</p>
            <p style={{ color: '#B8965A', fontFamily: 'Playfair Display, serif', fontSize: '22px', letterSpacing: '0.2em', margin: '2px 0' }}>ZOE</p>
          </div>
          <nav style={{ flex: 1, padding: '24px 16px' }}>
            {navItems.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', fontSize: '13px',
                  textDecoration: 'none', marginBottom: '4px',
                  color: isActive ? '#F5EFE6' : 'rgba(245,239,230,0.45)',
                  fontWeight: isActive ? 500 : 300,
                })}
              >
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
            <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', fontSize: '13px', textDecoration: 'none', color: 'rgba(245,239,230,0.4)' }}>
              <LogOut size={15} />
              Sair
            </NavLink>
          </div>
        </aside>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ height: '56px', background: '#FDFAF6', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 24px', flexShrink: 0 }}>
            {userEmail && <NotificationBell recipient={userEmail} />}
          </div>
          <main style={{ flex: 1, overflow: 'auto', background: '#F5EFE6', color: '#230606' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </EventProvider>
  );
}