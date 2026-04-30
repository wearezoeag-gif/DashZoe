import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ThumbsUp, ThumbsDown, MessageSquare, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type MoodImage = {
  id: string;
  image_url: string;
  status: 'approved' | 'rejected' | null;
  comment: string | null;
  created_at: string;
};

export default function ClientMoodboard() {
  const [images, setImages] = useState<MoodImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [commentBox, setCommentBox] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    void fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('moodboard')
        .select('*')
        .eq('client_email', user.email)
        .order('created_at', { ascending: false });

      if (!error) setImages(data || []);
    } catch (err) {
      console.log('Erro ao buscar moodboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (imageId: string, status: 'approved' | 'rejected') => {
    setLoadingId(imageId);
    await supabase.from('moodboard').update({ status }).eq('id', imageId);
    setLoadingId(null);
    void fetchImages();
  };

  const saveComment = async (imageId: string) => {
    if (!commentText.trim()) return;
    setLoadingId(imageId);
    await supabase.from('moodboard').update({ comment: commentText.trim() }).eq('id', imageId);
    setCommentBox(null);
    setCommentText('');
    setLoadingId(null);
    void fetchImages();
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5EFE6' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px', background: '#F5EFE6', minHeight: '100vh', color: '#230606' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#5C1A2E', fontWeight: 400, marginBottom: '4px' }}>
          Moodboard
        </h1>
        <p style={{ fontSize: '13px', opacity: 0.5 }}>
          Referências visuais do seu evento — aprove ou comente cada imagem
        </p>
      </div>

      {images.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '10px', padding: '64px', textAlign: 'center' }}>
          <Sparkles size={48} style={{ margin: '0 auto 16px', color: '#B8965A', opacity: 0.3 }} />
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#5C1A2E', fontWeight: 400, marginBottom: '8px' }}>
            Nenhuma referência ainda
          </h3>
          <p style={{ fontSize: '13px', opacity: 0.5 }}>
            A equipe Studio Zoe adicionará as referências visuais em breve
          </p>
        </motion.div>
      ) : (
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
          {images.map((img) => (
            <div
              key={img.id}
              style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden' }}
              onMouseEnter={() => setHoveredId(img.id)}
              onMouseLeave={() => { setHoveredId(null); setCommentBox(null); }}
            >
              <img src={img.image_url} alt="Referência" style={{ width: '100%', display: 'block' }} />

              {/* Status badge fixo no canto */}
              {img.status && (
                <div style={{
                  position: 'absolute', top: '10px', right: '10px',
                  padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                  background: img.status === 'approved' ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)',
                  color: '#fff',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                  {img.status === 'approved' ? <><Check size={11} /> Aprovado</> : <><ThumbsDown size={11} /> Não gostei</>}
                </div>
              )}

              {/* Overlay de ações */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(35,6,6,0.85) 0%, rgba(35,6,6,0.2) 50%, transparent 100%)',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                padding: '16px',
                opacity: hoveredId === img.id ? 1 : 0,
                transition: 'opacity 0.25s ease',
              }}>

                {/* Comentário existente */}
                {img.comment && commentBox !== img.id && (
                  <p style={{ fontSize: '12px', color: 'rgba(245,239,230,0.8)', marginBottom: '10px', fontStyle: 'italic' }}>
                    "{img.comment}"
                  </p>
                )}

                {/* Campo de comentário */}
                {commentBox === img.id && (
                  <div style={{ marginBottom: '10px' }}>
                    <textarea
                      autoFocus
                      placeholder="Escreva um comentário..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      style={{
                        width: '100%', background: 'rgba(245,239,230,0.95)', border: 'none',
                        borderRadius: '6px', padding: '8px 10px', fontSize: '12px',
                        color: '#230606', resize: 'none', outline: 'none',
                        fontFamily: 'Inter, sans-serif', minHeight: '60px', boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <button
                        onClick={() => saveComment(img.id)}
                        style={{ flex: 1, background: '#B8965A', border: 'none', borderRadius: '6px', padding: '6px', fontSize: '12px', cursor: 'pointer', color: '#230606', fontWeight: 500 }}>
                        Salvar
                      </button>
                      <button
                        onClick={() => { setCommentBox(null); setCommentText(''); }}
                        style={{ background: 'rgba(245,239,230,0.2)', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer', color: '#F5EFE6' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Botões de ação */}
                {commentBox !== img.id && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => updateStatus(img.id, 'approved')}
                      disabled={loadingId === img.id}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                        padding: '8px', background: img.status === 'approved' ? '#B8965A' : 'rgba(184,150,90,0.85)',
                        border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                        color: '#230606', fontWeight: 500
                      }}>
                      <ThumbsUp size={13} /> Aprovar
                    </button>

                    <button
                      onClick={() => updateStatus(img.id, 'rejected')}
                      disabled={loadingId === img.id}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                        padding: '8px', background: 'rgba(239,68,68,0.85)',
                        border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                        color: '#fff', fontWeight: 500
                      }}>
                      <ThumbsDown size={13} /> Não gostei
                    </button>

                    <button
                      onClick={() => { setCommentBox(img.id); setCommentText(img.comment || ''); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '8px 10px', background: 'rgba(245,239,230,0.15)',
                        border: '1px solid rgba(245,239,230,0.3)', borderRadius: '6px',
                        cursor: 'pointer', color: '#F5EFE6'
                      }}>
                      <MessageSquare size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}