import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { motion } from 'motion/react';
import { Download, X, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Evento = {
  nome: string;
  data: string;
  cliente_nome: string;
};

type Photo = {
  id: string;
  file_url: string;
  name: string | null;
};

export default function GuestGallery() {
  const { slug } = useParams(); // event id
  const [evento, setEvento] = useState<Evento | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) { setLoading(false); return; }

      const [eventoRes, photosRes] = await Promise.all([
        supabase.from('eventos').select('nome, data, cliente_nome').eq('id', slug).single(),
        supabase.from('photos').select('id, file_url, name').eq('event_id', slug).order('created_at', { ascending: true }),
      ]);

      if (eventoRes.data) setEvento(eventoRes.data);
      setPhotos(photosRes.data || []);
      setLoading(false);
    };

    void fetchData();
  }, [slug]);

  // Navegação no lightbox
  const prev = () => setSelectedIndex(i => i !== null && i > 0 ? i - 1 : i);
  const next = () => setSelectedIndex(i => i !== null && i < photos.length - 1 ? i + 1 : i);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') setSelectedIndex(null);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [photos.length]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#230606', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#230606', color: '#F5EFE6' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.3em', color: '#B8965A', marginBottom: '16px', opacity: 0.8 }}>STUDIO ZOE</p>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '38px', color: '#F5EFE6', marginBottom: '8px', fontWeight: 400 }}>
            {evento?.nome || 'Galeria do Evento'}
          </h1>
          {evento?.data && (
            <p style={{ fontSize: '15px', color: '#F5EFE6', opacity: 0.5 }}>
              {new Date(evento.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Fotos vazias */}
        {photos.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '80px 24px', background: 'rgba(184,150,90,0.05)', border: '1px solid rgba(184,150,90,0.15)', borderRadius: '12px' }}>
            <Images size={48} style={{ margin: '0 auto 16px', color: '#B8965A', opacity: 0.3 }} />
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', color: '#F5EFE6', fontWeight: 400, marginBottom: '10px' }}>
              As fotos estão sendo preparadas
            </h3>
            <p style={{ fontSize: '14px', color: '#F5EFE6', opacity: 0.45, lineHeight: 1.7 }}>
              Nosso time está selecionando os melhores momentos.<br />
              As fotos serão disponibilizadas em breve.
            </p>
          </motion.div>
        ) : (
          <>
            {/* Contador */}
            <p style={{ fontSize: '12px', opacity: 0.4, marginBottom: '24px', textAlign: 'center', letterSpacing: '0.1em' }}>
              {photos.length} foto{photos.length !== 1 ? 's' : ''}
            </p>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {photos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(index * 0.03, 0.5) }}
                  onClick={() => setSelectedIndex(index)}
                  style={{ aspectRatio: '1', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(184,150,90,0.1)' }}
                >
                  <img
                    src={photo.file_url}
                    alt={photo.name || `Foto ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s, opacity 0.3s', opacity: 0 }}
                    onLoad={e => (e.currentTarget.style.opacity = '1')}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                </motion.div>
              ))}
            </div>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: '48px', fontSize: '12px', color: '#F5EFE6', opacity: 0.25 }}>
          Evento produzido por Studio Zoe · studiozoe.co
        </p>
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && photos[selectedIndex] && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setSelectedIndex(null)}
        >
          {/* Fechar */}
          <button onClick={() => setSelectedIndex(null)}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#F5EFE6', zIndex: 2 }}>
            <X size={20} />
          </button>

          {/* Download */}
          <a
            href={photos[selectedIndex].file_url}
            download
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', top: '16px', right: '60px', background: 'rgba(184,150,90,0.2)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#B8965A', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Download size={18} />
          </a>

          {/* Anterior */}
          {selectedIndex > 0 && (
            <button onClick={e => { e.stopPropagation(); prev(); }}
              style={{ position: 'absolute', left: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', color: '#F5EFE6' }}>
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Próxima */}
          {selectedIndex < photos.length - 1 && (
            <button onClick={e => { e.stopPropagation(); next(); }}
              style={{ position: 'absolute', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', color: '#F5EFE6' }}>
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
          <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', color: '#F5EFE6', opacity: 0.4 }}>
            {selectedIndex + 1} / {photos.length}
          </div>
        </motion.div>
      )}
    </div>
  );
}