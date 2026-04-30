import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { LayoutDashboard, Calendar, Users, Star, DollarSign, Settings, LogOut, Menu, X } from 'lucide-react';
import NotificationBell from '../NotificationBell';
import { supabase } from '../../lib/supabase';

const navItems = [
  { to: '/admin', label: 'Visão Geral', icon: LayoutDashboard, end: true },
  { to: '/admin/eventos', label: 'Eventos', icon: Calendar },
  { to: '/admin/leads', label: 'Leads', icon: Users },
  { to: '/admin/nps', label: 'NPS', icon: Star },
  { to: '/admin/financeiro', label: 'Financeiro', icon: DollarSign },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5EFE6' }}>

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
          <p style={{ color: '#B8965A', fontFamily: 'Playfair Display, serif', fontSize: '22px', letterSpacing: '0.2em', margin: '2px 0 6px' }}>ZOE</p>
          <span style={{ background: 'rgba(184,150,90,0.15)', color: '#B8965A', fontSize: '9px', letterSpacing: '0.1em', padding: '2px 8px', borderRadius: '10px' }}>ADMIN</span>
        </div>
        <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '6px', fontSize: '13px',
                textDecoration: 'none', marginBottom: '2px',
                borderLeft: isActive ? '2px solid #B8965A' : '2px solid transparent',
                background: isActive ? 'rgba(184,150,90,0.08)' : 'transparent',
                color: isActive ? '#F5EFE6' : 'rgba(245,239,230,0.45)',
                fontWeight: isActive ? 500 : 300,
              })}>
              <Icon size={15} style={{ flexShrink: 0 }} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '12px', borderTop: '1px solid rgba(184,150,90,0.15)' }}>
          <button onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,239,230,0.4)', width: '100%' }}>
            <LogOut size={15} /> Sair
          </button>
        </div>
      </aside>

      {/* Desktop sidebar sempre visível */}
      <div className="desktop-spacer" style={{ width: '210px', flexShrink: 0 }} />

      {/* Conteúdo */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <div style={{ height: '56px', background: '#FDFAF6', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hamburger"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#230606', padding: '4px', flexShrink: 0 }}>
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div style={{ flex: 1 }} />
          <NotificationBell recipient="admin" />
        </div>
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (min-width: 769px) {
          .hamburger { display: none !important; }
          aside { left: 0 !important; }
        }
        @media (max-width: 768px) {
          .desktop-spacer { display: none !important; }
          .hamburger { display: block !important; }
        }
      `}</style>
    </div>
  );
}