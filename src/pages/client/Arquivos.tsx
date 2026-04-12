import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type FileItem = {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
};

const card = {
  background: '#FDFAF6',
  border: '1px solid rgba(184,150,90,0.2)',
  borderRadius: '10px',
};

export default function ClientPhotos() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          console.log('Usuário não encontrado');
          setLoading(false);
          return;
        }

        console.log('Email do usuário:', user.email);

        const { data, error } = await supabase
          .from('photos')
          .select('*')
          .eq('client_email', user.email)
          .order('created_at', { ascending: false });

        if (error) {
          console.log('Erro ao buscar arquivos:', error);
          setFiles([]);
        } else {
          console.log('Arquivos encontrados:', data);
          setFiles(data || []);
        }
      } catch (err) {
        console.log('Erro geral:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Carregando arquivos...</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', fontWeight: 400, marginBottom: '4px' }}>
          Arquivos
        </h1>
        <p style={{ fontSize: '13px', opacity: 0.5 }}>
          Documentos do seu evento (convite, listas e materiais)
        </p>
      </div>

      {files.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {files.map((file, index) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              style={{ ...card, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}
            >
              {/* Ícone */}
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                background: 'rgba(184,150,90,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FileText size={22} style={{ color: '#B8965A' }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', margin: 0 }}>{file.name || 'Documento'}</p>
                <span style={{ fontSize: '12px', opacity: 0.5 }}>
                  {new Date(file.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Ação */}
              <a
                href={file.file_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: '#B8965A',
                  color: '#230606',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  textDecoration: 'none'
                }}
              >
                <Download size={14} />
                Baixar
              </a>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ ...card, padding: '48px', textAlign: 'center' }}
        >
          <FileText size={48} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#5C1A2E', fontWeight: 400 }}>
            Nenhum arquivo disponível
          </h3>
          <p style={{ fontSize: '13px', opacity: 0.5 }}>
            Seus documentos serão adicionados em breve
          </p>
        </motion.div>
      )}
    </div>
  );
}