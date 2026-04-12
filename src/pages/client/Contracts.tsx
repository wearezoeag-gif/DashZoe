import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Download, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Contract = {
  id: string;
  name: string;
  date: string;
  status: 'signed' | 'pending';
  size: string;
  url: string;
};

const card = {
  background: '#FDFAF6',
  border: '1px solid rgba(184,150,90,0.2)',
  borderRadius: '10px',
};

export default function ClientContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('Usuário não encontrado');
        setLoading(false);
        return;
      }

      console.log('Email do usuário:', user.email);

      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('client_email', user.email)
        .order('created_at', { ascending: true });

      if (error) {
        console.log('Erro ao buscar contratos:', error);
        setContracts([]);
      } else {
        console.log('Contratos encontrados:', data);
        setContracts(data || []);
      }
    } catch (err) {
      console.log('Erro geral:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchContracts();
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Carregando contratos...</div>;

  return (
    <div style={{ maxWidth: '896px', margin: '0 auto', padding: '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', marginBottom: '4px', fontWeight: 400 }}>Contratos</h1>
        <p style={{ fontSize: '13px', color: '#230606', opacity: 0.5 }}>Todos os documentos do seu evento</p>
      </div>

      {contracts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {contracts.map((contract) => (
            <motion.div
              key={contract.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ ...card, padding: '24px' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={26} style={{ color: '#B8965A' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '16px', color: '#230606', marginBottom: '4px', fontWeight: 400 }}>{contract.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#230606', opacity: 0.55 }}>
                        <span>{contract.date}</span>
                        <span>•</span>
                        <span>{contract.size}</span>
                      </div>
                    </div>

                    {contract.status === 'signed' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', fontSize: '12px' }}>
                        <CheckCircle2 size={13} /> Assinado
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(184,150,90,0.15)', color: '#B8965A', fontSize: '12px' }}>
                        <Clock size={13} /> Pendente
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <a href={contract.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#B8965A', color: '#230606', borderRadius: '6px', fontSize: '13px', fontWeight: 500 }}>
                      <Download size={14} /> Download
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, padding: '48px', textAlign: 'center' }}>
          <FileText size={56} style={{ margin: '0 auto 16px', color: '#230606', opacity: 0.2 }} />
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#5C1A2E', fontWeight: 400, marginBottom: '8px' }}>Nenhum contrato disponível</h3>
          <p style={{ fontSize: '13px', color: '#230606', opacity: 0.55 }}>Seu contrato será disponibilizado em breve</p>
        </motion.div>
      )}
    </div>
  );
}