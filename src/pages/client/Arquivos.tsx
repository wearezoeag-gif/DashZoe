import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Download, FolderOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Arquivo = {
  id: string;
  name: string;
  file_url: string;
  size: string | null;
  created_at: string;
};

const card = {
  background: '#FDFAF6',
  border: '1px solid rgba(184,150,90,0.2)',
  borderRadius: '10px',
};

export default function ClientArquivos() {
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArquivos = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setLoading(false); return; }

      const { data: evento } = await supabase
        .from('eventos')
        .select('id')
        .eq('cliente_email', user.email)
        .single();

      if (!evento) { setLoading(false); return; }

      const { data } = await supabase
        .from('arquivos')
        .select('*')
        .eq('event_id', evento.id)
        .order('created_at', { ascending: false });

      setArquivos(data || []);
      setLoading(false);
    };

    void fetchArquivos();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5EFE6' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', fontWeight: 400, marginBottom: '4px' }}>
          Arquivos
        </h1>
        <p style={{ fontSize: '13px', opacity: 0.5 }}>
          Documentos do seu evento — convites, listas e materiais
        </p>
      </div>

      {arquivos.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ ...card, padding: '64px', textAlign: 'center' }}>
          <FolderOpen size={48} style={{ margin: '0 auto 16px', color: '#B8965A', opacity: 0.2 }} />
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#5C1A2E', fontWeight: 400, marginBottom: '8px' }}>
            Nenhum arquivo disponível
          </h3>
          <p style={{ fontSize: '13px', opacity: 0.5 }}>
            Seus documentos serão adicionados em breve pela equipe Studio Zoe
          </p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {arquivos.map((arquivo, index) => (
            <motion.div key={arquivo.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              style={{ ...card, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={20} style={{ color: '#B8965A' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', color: '#230606', marginBottom: '3px' }}>{arquivo.name}</p>
                <div style={{ display: 'flex', gap: '10px', fontSize: '12px', opacity: 0.45 }}>
                  <span>{new Date(arquivo.created_at).toLocaleDateString('pt-BR')}</span>
                  {arquivo.size && <><span>·</span><span>{arquivo.size}</span></>}
                </div>
              </div>
              <a href={arquivo.file_url} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#B8965A', color: '#230606', borderRadius: '6px', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
                <Download size={14} /> Baixar
              </a>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}