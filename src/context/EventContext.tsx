import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Evento = {
  id: string;
  nome: string;
  tipo: string;
  data: string;
  local: string;
  cidade: string;
  convidados: number;
  orcamento: number;
  status: string;
  cliente_nome: string;
  cliente_email: string;
};

type EventContextType = {
  evento: Evento | null;
  clienteEmail: string | null;
  loading: boolean;
  setClienteEmail: (email: string) => void;
  logout: () => void;
};

const EventContext = createContext<EventContextType>({} as EventContextType);

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [clienteEmail, setClienteEmailState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // começa true até verificar auth

  // Busca o email do usuário logado via Supabase Auth
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setClienteEmailState(user.email);
        } else {
          // fallback: tenta localStorage (compatibilidade)
          const saved = localStorage.getItem('cliente_email');
          if (saved) setClienteEmailState(saved);
          else setLoading(false); // sem email, para o loading
        }
      } catch {
        setLoading(false);
      }
    };
    void init();
  }, []);

  // Busca o evento sempre que o email estiver disponível
  useEffect(() => {
    if (!clienteEmail) return;

    const fetchEvento = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('eventos')
          .select('*')
          .eq('cliente_email', clienteEmail)
          .single();
        setEvento(data || null);
      } catch {
        setEvento(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchEvento();
  }, [clienteEmail]);

  const setClienteEmail = (email: string) => {
    localStorage.setItem('cliente_email', email);
    setClienteEmailState(email);
  };

  const logout = async () => {
    localStorage.removeItem('cliente_email');
    setClienteEmailState(null);
    setEvento(null);
    await supabase.auth.signOut();
  };

  return (
    <EventContext.Provider value={{ evento, clienteEmail, loading, setClienteEmail, logout }}>
      {children}
    </EventContext.Provider>
  );
}

export const useEvent = () => useContext(EventContext);