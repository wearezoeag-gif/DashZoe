import React from 'react';
import { NavLink, Outlet } from 'react-router';
import { LayoutDashboard, Calendar, Users, Star, DollarSign, Settings, LogOut } from 'lucide-react';
import NotificationBell from '../NotificationBell';

const navItems = [
  { to: '/admin', label: 'Visão Geral', icon: LayoutDashboard, end: true },
  { to: '/admin/eventos', label: 'Eventos', icon: Calendar },
  { to: '/admin/leads', label: 'Leads', icon: Users },
  { to: '/admin/nps', label: 'NPS', icon: Star },
  { to: '/admin/financeiro', label: 'Financeiro', icon: DollarSign },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
];

export default function AdminLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5EFE6', color: '#230606' }}>
      <aside style={{ width: '210px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#230606' }}>
        <div style={{ padding: '32px 24px', borderBottom: '1px solid rgba(184,150,90,0.15)' }}>
          <p style={{ fontFamily: 'Playfair Display, serif', color: 'rgba(245,239,230,0.7)', fontSize: '10px', letterSpacing: '0.3em', margin: 0 }}>STUDIO</p>
          <p style={{ color: '#B8965A', fontFamily: 'Playfair Display, serif', fontSize: '22px', letterSpacing: '0.2em', margin: '2px 0' }}>ZOE</p>
          <span style={{ background: 'rgba(184,150,90,0.15)', color: '#B8965A', fontSize: '9px', letterSpacing: '0.1em', padding: '2px 8px', borderRadius: '10px', display: 'inline-block', marginTop: '6px' }}>ADMIN</span>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '6px',
                fontSize: '13px', textDecoration: 'none', marginBottom: '2px',
                transition: 'all 0.2s',
                borderLeft: isActive ? '2px solid #B8965A' : '2px solid transparent',
                background: isActive ? 'rgba(184,150,90,0.08)' : 'transparent',
                color: isActive ? '#F5EFE6' : 'rgba(245,239,230,0.45)',
                fontWeight: isActive ? 500 : 300,
              })}
            >
              <Icon size={15} style={{ flexShrink: 0 }} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '12px', borderTop: '1px solid rgba(184,150,90,0.15)' }}>
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', textDecoration: 'none', color: 'rgba(245,239,230,0.4)' }}>
            <LogOut size={15} />
            Sair
          </NavLink>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header com sino */}
        <div style={{ height: '56px', background: '#FDFAF6', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 24px', flexShrink: 0 }}>
          <NotificationBell recipient="admin" />
        </div>
        <main style={{ flex: 1, overflow: 'auto', background: '#F5EFE6', color: '#230606' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}