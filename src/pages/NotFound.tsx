import { motion } from 'motion/react';
import { useNavigate } from 'react-router';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-8xl mb-4" style={{ color: 'var(--zoe-gold)' }}>404</h1>
        <h2 className="text-2xl mb-4">Página não encontrada</h2>
        <p className="opacity-60 mb-8">A página que você está procurando não existe ou foi movida.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-[var(--zoe-gold)] text-[var(--zoe-dark)] rounded-lg hover:opacity-90 transition-opacity"
        >
          ← Voltar
        </button>
      </motion.div>
    </div>
  );
}
