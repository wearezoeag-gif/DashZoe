import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Photo = {
  id: string;
  file_url: string;
  name: string | null;
  created_at: string;
};

export default function ClientFotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [eventNome, setEventNome] = useState('');

  useEffect(() => {
    const fetchPhotos = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setLoading(false); return; }

      const { data: evento } = await supabase
        .from('eventos')
        .select('id, nome')
        .eq('cliente_email', user.email)
        .single();

      if (!evento) { setLoading(false); return; }

      setEventNome(evento.nome);

      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', evento.id)
        .order('created_at', { ascending: true });

      setPhotos(photosData || []);
      setLoading(false);
    };

    void fetchPhotos();
  }, []);

  // Navegação teclado
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'ArrowLeft' && selectedIndex > 0) setSelectedIndex(selectedIndex - 1);
      if (e.key === 'ArrowRight' && selectedIndex < photos.length - 1) setSelectedIndex(selectedIndex + 1);
      if (e.key === 'Escape') setSelectedIndex(null);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [selectedIndex, photos.length]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5EFE6' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      {/* HEADER */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', marginBottom: '4px', fontWeight: 400 }}>
          Fotos do Evento
        </h1>
        <p style={{ fontSize: '13px', opacity: 0.5 }}>
          {eventNome || 'Seu evento'}
        </p>
      </div>

      {/* FOTOS VAZIAS */}
      {photos.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '12px', padding: '80px 40px', textAlign: 'center' }}>
          <Camera size={48} style={{ margin: '0 auto 16px', color: '#B8965A', opacity: 0.2 }} />
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#5C1A2E', fontWeight: 400, marginBottom: '8px' }}>
            As fotos estão sendo preparadas
          </h3>
          <p style={{ fontSize: '13px', opacity: 0.45, lineHeight: 1.7 }}>
            Nossa equipe está selecionando os melhores momentos.<br />
            As fotos serão disponibilizadas em até 2 semanas após o evento.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Contador */}
          <p style={{ fontSize: '12px', opacity: 0.4, marginBottom: '20px', letterSpacing: '0.08em' }}>
            {photos.length} foto{photos.length !== 1 ? 's' : ''} disponíveis
          </p>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(index * 0.03, 0.6) }}
                onClick={() => setSelectedIndex(index)}
                style={{
                  aspectRatio: '1',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid rgba(184,150,90,0.15)',
                  background: '#FDFAF6',
                }}
              >
                <img
                  src={photo.file_url}
                  alt={photo.name || `Foto ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s, opacity 0.3s', opacity: 0 }}
                  onLoad={e => (e.currentTarget.style.opacity = '1')}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                />
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* LIGHTBOX */}
      {selectedIndex !== null && photos[selectedIndex] && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setSelectedIndex(null)}
        >
          {/* Fechar */}
          <button onClick={() => setSelectedIndex(null)}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#fff' }}>
            <X size={20} />
          </button>

          {/* Download */}
          <a
            href={photos[selectedIndex].file_url}
            download
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', top: '16px', right: '60px', background: 'rgba(184,150,90,0.2)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#B8965A', display: 'flex' }}>
            <Download size={18} />
          </a>

          {/* Anterior */}
          {selectedIndex > 0 && (
            <button onClick={e => { e.stopPropagation(); setSelectedIndex(selectedIndex - 1); }}
              style={{ position: 'absolute', left: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', color: '#fff' }}>
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Próxima */}
          {selectedIndex < photos.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setSelectedIndex(selectedIndex + 1); }}
              style={{ position: 'absolute', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', color: '#fff' }}>
              <ChevronRight size={22} />
            </button>
          )}

          {/* Foto */}
          <img
            src={photos[selectedIndex].file_url}
            alt=""
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '4px' }}
            onClick={e => e.stopPropagation()}
          />

          {/* Contador */}
          <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', color: '#fff', opacity: 0.4 }}>
            {selectedIndex + 1} / {photos.length}
          </div>
        </motion.div>
      )}
    </div>
  );
}