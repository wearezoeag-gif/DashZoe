import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft, Save, Upload, Send, FileText, Download,
  CheckCircle2, Clock, Plus, Trash2, ChevronDown, ChevronUp,
  AlertCircle, DollarSign, Users, Camera, X, ChevronLeft, ChevronRight, Copy, Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useIsMobile } from '../../hooks/useIsMobile';

type Evento = {
  id: string; nome: string; cliente_nome: string; cliente_email: string;
  data?: string; local?: string; cidade?: string; convidados?: number;
  orcamento?: number; budget?: number; status?: string; tipo?: string;
  tipo_evento_comercial?: string;
  receita_studio?: number;
  etapa_planejamento?: boolean;
  etapa_moodboard?: boolean;
  etapa_orcamento?: boolean;
  etapa_contrato?: boolean;
  etapa_pagamento?: boolean;
  etapa_execucao?: boolean;
  etapa_pos_evento?: boolean;
};

// ─── Calculadora de precificação ──────────────────────────────────────────────

type FaixaPreco = {
  min: number;
  max: number;
  label: string;
  desconto?: string;
};

function calcularPrecificacao(tipoComercial: string, budget: number): {
  faixa: FaixaPreco | null;
  fornecedores: number;
  alertas: string[];
} {
  const alertas: string[] = [];
  let faixa: FaixaPreco | null = null;
  let receita = 0;

  if (budget < 50000 && tipoComercial !== 'corporativo') {
    alertas.push('Budget abaixo do mínimo ideal — só aceitar de parceiros, convidados ou equipe');
  }

  if (tipoComercial === 'casamento') {
    if (budget <= 50000) {
      faixa = { min: 8000, max: 8000, label: 'Fee fixo', desconto: 'até 1,5%' };
    } else if (budget <= 100000) {
      faixa = { min: 12000, max: 18000, label: '12k–18k', desconto: '2%' };
    } else if (budget <= 200000) {
      const pct15 = budget * 0.15;
      faixa = { min: Math.max(pct15, 15000), max: 18000, label: '15%–18k', desconto: '3%' };
    } else {
      const pct18 = budget * 0.18;
      faixa = { min: pct18, max: pct18, label: '18%', desconto: 'até 5%' };
    }
  } else if (tipoComercial === 'social') {
    if (budget <= 30000) {
      faixa = { min: 5000, max: 8000, label: '5k–8k', desconto: undefined };
    } else if (budget <= 80000) {
      faixa = { min: 8000, max: 15000, label: '8k–15k', desconto: undefined };
    } else {
      const pct12 = budget * 0.12;
      const pct15 = budget * 0.15;
      faixa = { min: Math.max(pct12, 8000), max: pct15, label: '12%–15% (mín. 8k)', desconto: undefined };
    }
  } else if (tipoComercial === 'corporativo') {
    if (budget <= 50000) {
      // Fee fechado simples
      faixa = { min: 8000, max: 15000, label: 'Fee fechado simples', desconto: undefined };
    } else if (budget <= 100000) {
      faixa = { min: 15000, max: 30000, label: 'Fee fechado médio porte', desconto: undefined };
    } else {
      const pct10 = budget * 0.10;
      faixa = { min: Math.max(pct10, 30000), max: pct10, label: '10% + diária coordenadores', desconto: 'mín. 5%' };
      alertas.push('Cobrar diária dos coordenadores no dia do evento (mín. R$ 2.000 por coordenador)');
    }
    alertas.push('Fee: mínimo R$ 10k, máximo R$ 20k + 10%');
  }

  // Validação do mínimo
  if (faixa && faixa.min < 12000) {
    alertas.push('Atenção: ganho mínimo deve ser R$ 12k–15k');
  }

  const fornecedores = budget - (faixa?.min || 0);

  return { faixa, fornecedores, alertas };
}
type Contract = { id: string; name: string; date: string; status: 'signed' | 'pending'; size: string; file_url: string; };
type Sector = { id: string; name: string; value: number; paid: number; due_date: string | null; status: 'pending' | 'paid' | 'overdue' | 'partial'; notes: string | null; };
type Item = { id: string; sector_id: string | null; description: string; quantity: number; unit_price: number; total: number; };
type Extra = { id: string; description: string; quantity: number; unit_price: number; total: number; approved: boolean; };
type Receipt = { id: string; name: string; file_url: string; amount: number | null; created_at: string; };
type EventPhoto = { id: string; file_url: string; name: string | null; created_at: string; };

const card: React.CSSProperties = { background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '12px', padding: '24px' };
const inputStyle: React.CSSProperties = { width: '100%', background: '#F5EFE6', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#230606', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' };
const inputSmall: React.CSSProperties = { ...inputStyle, padding: '7px 10px', borderRadius: '6px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', color: '#230606', opacity: 0.5, marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' };
const tabStyle = (active: boolean): React.CSSProperties => ({ padding: '8px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', background: active ? '#B8965A' : 'transparent', color: active ? '#230606' : 'rgba(35,6,6,0.45)', fontWeight: active ? 500 : 400, transition: 'all 0.2s' });
const statusConfig = {
  paid:    { label: 'Pago',     bg: 'rgba(34,197,94,0.1)',  color: '#16a34a', icon: CheckCircle2 },
  partial: { label: 'Parcial',  bg: 'rgba(234,179,8,0.1)',  color: '#ca8a04', icon: Clock },
  overdue: { label: 'Vencido',  bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', icon: AlertCircle },
  pending: { label: 'Pendente', bg: 'rgba(184,150,90,0.1)', color: '#B8965A', icon: Clock },
};
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AdminEventDetail() {
  const isMobile = useIsMobile();
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState<Evento | null>(null);
  const [tab, setTab] = useState<'info' | 'financeiro' | 'fotos' | 'arquivos' | 'contracts' | 'moodboard' | 'messages'>('info');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [uploadingContracts, setUploadingContracts] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expandedSector, setExpandedSector] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [finTab, setFinTab] = useState<'planilha' | 'extras' | 'comprovantes' | 'setores_auto'>('planilha');
  const [showNewSector, setShowNewSector] = useState(false);
  const [newSector, setNewSector] = useState({ name: '', value: '', due_date: '', notes: '' });
  const [comprovantesSetor, setComprovantesSetor] = useState<any[]>([]);
  const [uploadingSetor, setUploadingSetor] = useState<string | null>(null);
  const [pagandoItem, setPagandoItem] = useState<string | null>(null);
  const [expandedSetorAuto, setExpandedSetorAuto] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editItemData, setEditItemData] = useState<any>({});
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItem, setNewItem] = useState({ sector_id: '', description: '', quantity: '1', unit_price: '', pagamento_tipo: 'avista', parcelas_total: '1' });
  const [showNewExtra, setShowNewExtra] = useState(false);
  const [newExtra, setNewExtra] = useState({ description: '', quantity: '1', unit_price: '' });

  // Calculadora
  const [showCalc, setShowCalc] = useState(false);

  // Fotos do evento
  const [eventPhotos, setEventPhotos] = useState<EventPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [arquivos, setArquivos] = useState<any[]>([]);
  const [uploadingArquivos, setUploadingArquivos] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);

  // ── Fetch evento ──
  useEffect(() => {
    const fetchEvento = async () => {
      const { data } = await supabase.from('eventos').select('*').eq('id', id).single();
      if (data) setForm(data);
      setLoading(false);
    };
    fetchEvento();
  }, [id]);

  // ── Fetch por aba ──
  const fetchContracts = async () => {
    if (!id) return;
    const { data } = await supabase.from('contracts').select('*').eq('event_id', id).order('date', { ascending: true });
    if (data) setContracts(data);
  };
  const fetchImages = async () => {
    if (!id) return;
    const { data } = await supabase.from('moodboard').select('*').eq('event_id', id).order('created_at', { ascending: false });
    if (data) setImages(data);
  };
  const fetchMessages = async () => {
    if (!form?.cliente_email) return;
    const { data } = await supabase.from('messages').select('*').eq('client_email', form.cliente_email).order('created_at', { ascending: true });
    setMessages(data || []);
  };
  const updateItem = async (itemId: string) => {
    const d = editItemData;
    const total = (Number(d.quantity) || 1) * (Number(d.unit_price) || 0);
    // Buscar ou criar setor pelo nome
    let finalSectorId: string | null = null;
    if (d.setor_nome) {
      const sectorExistente = sectors.find(s => s.name === d.setor_nome);
      if (sectorExistente) {
        finalSectorId = sectorExistente.id;
      } else {
        const { data: novoSetor } = await supabase.from('event_sectors').insert({ event_id: id, name: d.setor_nome, value: 0, status: 'pending' }).select().single();
        if (novoSetor) { setSectors(prev => [...prev, novoSetor]); finalSectorId = novoSetor.id; }
      }
    }
    // total é coluna gerada pelo banco (quantity * unit_price), não pode ser enviada no update
    const { error } = await supabase.from('event_items').update({ 
      description: d.description, 
      quantity: Number(d.quantity) || 1, 
      unit_price: Number(d.unit_price) || 0, 
      sector_id: finalSectorId, 
      pagamento_tipo: d.pagamento_tipo || 'avista', 
      parcelas_total: Number(d.parcelas_total) || 1 
    }).eq('id', itemId);
    if (!error) {
      setItems(prev => prev.map((i: any) => i.id === itemId ? { ...i, ...d, total, sector_id: finalSectorId, setor_nome: d.setor_nome } : i));
    }
    setEditingItem(null);
  };

  const pagarParcela = async (item: any) => {
    if (item.parcelas_pagas >= item.parcelas_total) return;
    setPagandoItem(item.id);
    const novasPagas = item.parcelas_pagas + 1;
    await supabase.from('event_items').update({ parcelas_pagas: novasPagas }).eq('id', item.id);
    setItems(prev => prev.map((i: any) => i.id === item.id ? { ...i, parcelas_pagas: novasPagas } : i));
    setPagandoItem(null);
  };

  const desfazerPagamento = async (item: any) => {
    if (item.parcelas_pagas <= 0) return;
    const novasPagas = item.parcelas_pagas - 1;
    await supabase.from('event_items').update({ parcelas_pagas: novasPagas }).eq('id', item.id);
    setItems(prev => prev.map((i: any) => i.id === item.id ? { ...i, parcelas_pagas: novasPagas } : i));
  };

  const handleUploadComprovanteSetor = async (e: React.ChangeEvent<HTMLInputElement>, setorNome: string) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingSetor(setorNome);
    const ext = file.name.split('.').pop();
    const fileName = `${id}-${setorNome.replace(/\s+/g, '_').toLowerCase()}-${Date.now()}.${ext}`;
    await supabase.storage.from('receipts').upload(fileName, file, { upsert: true });
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
    const { data } = await supabase.from('comprovantes_setor').insert({ event_id: id, setor_nome: setorNome, name: fileName, file_url: urlData.publicUrl }).select().single();
    if (data) setComprovantesSetor((prev: any[]) => [data, ...prev]);
    setUploadingSetor(null);
    e.target.value = '';
  };

  const fetchFinanceiro = async () => {
    if (!id) return;
    const [sectorsRes, itemsRes, extrasRes, receiptsRes, comprovantesRes] = await Promise.all([
      supabase.from('event_sectors').select('*').eq('event_id', id).order('created_at'),
      supabase.from('event_items').select('*, event_sectors(name)').eq('event_id', id).order('created_at'),
      supabase.from('event_extras').select('*').eq('event_id', id).order('created_at'),
      supabase.from('payment_receipts').select('*').eq('event_id', id).order('created_at', { ascending: false }),
      supabase.from('comprovantes_setor').select('*').eq('event_id', id).order('created_at', { ascending: false }),
    ]);
    setSectors(sectorsRes.data || []);
    setItems((itemsRes.data || []).map((i: any) => ({ ...i, pagamento_tipo: i.pagamento_tipo || 'avista', parcelas_total: i.parcelas_total || 1, parcelas_pagas: i.parcelas_pagas || 0, setor_nome: i.event_sectors?.name || 'Sem setor' })));
    setExtras(extrasRes.data || []);
    setReceipts(receiptsRes.data || []);
    setComprovantesSetor(comprovantesRes.data || []);
  };
  const fetchArquivos = async () => {
    if (!id) return;
    const { data } = await supabase.from('arquivos').select('*').eq('event_id', id).order('created_at', { ascending: false });
    setArquivos(data || []);
  };

  const handleUploadArquivos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id) return;
    setUploadingArquivos(true);
    for (const file of Array.from(files)) {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error } = await supabase.storage.from('arquivos').upload(fileName, file, { upsert: true });
      if (error) { console.error(error); continue; }
      const { data: urlData } = supabase.storage.from('arquivos').getPublicUrl(fileName);
      await supabase.from('arquivos').insert({ event_id: id, name: file.name, file_url: urlData.publicUrl, size: `${(file.size / 1024 / 1024).toFixed(2)} MB` });
    }
    setUploadingArquivos(false);
    fetchArquivos();
  };

  const deleteArquivo = async (arquivoId: string) => {
    await supabase.from('arquivos').delete().eq('id', arquivoId);
    setArquivos(prev => prev.filter((a: any) => a.id !== arquivoId));
  };

  const fetchEventPhotos = async () => {
    if (!id) return;
    const { data } = await supabase.from('photos').select('*').eq('event_id', id).order('created_at', { ascending: true });
    setEventPhotos(data || []);
  };

  useEffect(() => {
    if (tab === 'contracts') fetchContracts();
    if (tab === 'moodboard') fetchImages();
    if (tab === 'messages') fetchMessages();
    if (tab === 'financeiro') fetchFinanceiro();
    if (tab === 'fotos') fetchEventPhotos();
    if (tab === 'arquivos') fetchArquivos();
  }, [tab, form]);

  // ── Salvar evento ──
  const handleSave = async () => {
    if (!form || !id) return;
    setSaving(true);
    await supabase.from('eventos').update({
      nome: form.nome, cliente_nome: form.cliente_nome, cliente_email: form.cliente_email,
      data: form.data, local: form.local, cidade: form.cidade, convidados: form.convidados,
      orcamento: form.orcamento, budget: form.budget, status: form.status, tipo: form.tipo,
      tipo_evento_comercial: form.tipo_evento_comercial,
      receita_studio: form.receita_studio,
      etapa_planejamento: form.etapa_planejamento || false,
      etapa_moodboard: form.etapa_moodboard || false,
      etapa_orcamento: form.etapa_orcamento || false,
      etapa_contrato: form.etapa_contrato || false,
      etapa_pagamento: form.etapa_pagamento || false,
      etapa_execucao: form.etapa_execucao || false,
      etapa_pos_evento: form.etapa_pos_evento || false,
    }).eq('id', id);
    setSaving(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2500);
  };

  // ── Mensagens ──
  const sendMessage = async () => {
    if (!text || !form?.cliente_email) return;
    await supabase.from('messages').insert({ client_email: form.cliente_email, event_id: id, sender: 'admin', sender_name: 'Studio Zoe', text: text.trim() });
    setText('');
    fetchMessages();
  };

  // ── Upload contratos ──
  const handleUploadContracts = async (e: any) => {
    const files = e.target.files;
    if (!files) return;
    setUploadingContracts(true);
    for (let file of files) {
      const fileName = `${Date.now()}-${file.name}`;
      await supabase.storage.from('contracts').upload(fileName, file);
      const { data } = supabase.storage.from('contracts').getPublicUrl(fileName);
      await supabase.from('contracts').insert({ event_id: id, name: file.name, date: new Date().toISOString().split('T')[0], status: 'pending', size: `${(file.size / 1024 / 1024).toFixed(2)} MB`, file_url: data.publicUrl });
    }
    setUploadingContracts(false);
    fetchContracts();
  };

  // ── Upload moodboard ──
  const handleUploadImages = async (e: any) => {
    const files = e.target.files;
    if (!files) return;
    setUploadingImages(true);
    for (let file of files) {
      const fileName = `${Date.now()}-${file.name}`;
      await supabase.storage.from('moodboard').upload(fileName, file);
      const { data } = supabase.storage.from('moodboard').getPublicUrl(fileName);
      await supabase.from('moodboard').insert({ event_id: id, image_url: data.publicUrl });
    }
    setUploadingImages(false);
    fetchImages();
  };

  // ── Upload comprovante ──
  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingReceipt(true);
    const fileName = `${Date.now()}-${file.name}`;
    await supabase.storage.from('receipts').upload(fileName, file);
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
    const { data } = await supabase.from('payment_receipts').insert({ event_id: id, name: file.name, file_url: urlData.publicUrl }).select().single();
    if (data) setReceipts(prev => [data, ...prev]);
    setUploadingReceipt(false);
  };

  // ── Upload fotos do evento (lotes de 5 em paralelo) ──
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });

  const handleUploadEventPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id) return;
    const fileArray = Array.from(files);
    setUploadingPhotos(true);
    setUploadProgress({ done: 0, total: fileArray.length });

    const uploadOne = async (file: File) => {
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(fileName, file, { upsert: true });
      if (uploadError) { console.error('Erro upload:', uploadError.message); return; }
      const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(fileName);
      await supabase.from('photos').insert({
        event_id: id,
        file_url: urlData.publicUrl,
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      });
      setUploadProgress(prev => ({ ...prev, done: prev.done + 1 }));
    };

    // Processa em lotes de 5 simultâneos
    const BATCH = 5;
    for (let i = 0; i < fileArray.length; i += BATCH) {
      await Promise.all(fileArray.slice(i, i + BATCH).map(uploadOne));
    }

    setUploadingPhotos(false);
    setUploadProgress({ done: 0, total: 0 });
    fetchEventPhotos();
  };

  const deleteEventPhoto = async (photoId: string) => {
    await supabase.from('photos').delete().eq('id', photoId);
    setEventPhotos(prev => prev.filter(p => p.id !== photoId));
    setSelectedPhoto(null);
  };

  const deleteSelectedPhotos = async () => {
    if (selectedIds.size === 0) return;
    setDeletingSelected(true);
    for (const photoId of Array.from(selectedIds)) {
      await supabase.from('photos').delete().eq('id', photoId);
    }
    setEventPhotos(prev => prev.filter(p => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setSelectMode(false);
    setDeletingSelected(false);
  };

  const toggleSelectPhoto = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyGalleryLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/evento/${id}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ── Financeiro ──
  const addSector = async () => {
    if (!newSector.name || !id) return;
    const { data } = await supabase.from('event_sectors').insert({ event_id: id, name: newSector.name, value: Number(newSector.value) || 0, due_date: newSector.due_date || null, notes: newSector.notes || null, status: 'pending' }).select().single();
    if (data) setSectors(prev => [...prev, data]);
    setNewSector({ name: '', value: '', due_date: '', notes: '' });
    setShowNewSector(false);
  };
  const updateSectorPaid = async (sectorId: string, paid: number) => {
    const sector = sectors.find(s => s.id === sectorId);
    if (!sector) return;
    const status: Sector['status'] = paid >= sector.value ? 'paid' : paid > 0 ? 'partial' : 'pending';
    await supabase.from('event_sectors').update({ paid, status }).eq('id', sectorId);
    setSectors(prev => prev.map(s => s.id === sectorId ? { ...s, paid, status } : s));
  };
  const updateSectorStatus = async (sectorId: string, status: Sector['status']) => {
    await supabase.from('event_sectors').update({ status }).eq('id', sectorId);
    setSectors(prev => prev.map(s => s.id === sectorId ? { ...s, status } : s));
  };
  const deleteSector = async (sectorId: string) => {
    await supabase.from('event_sectors').delete().eq('id', sectorId);
    setSectors(prev => prev.filter(s => s.id !== sectorId));
  };
  const addItem = async () => {
    if (!newItem.description || !id) return;
    // Buscar ou criar setor pelo nome
    let finalSectorId: string | null = null;
    if (newItem.sector_id) {
      const sectorExistente = sectors.find(s => s.name === newItem.sector_id || s.id === newItem.sector_id);
      if (sectorExistente) {
        finalSectorId = sectorExistente.id;
      } else {
        // Criar novo setor automaticamente
        const { data: novoSetor } = await supabase.from('event_sectors').insert({ event_id: id, name: newItem.sector_id, value: 0, status: 'pending' }).select().single();
        if (novoSetor) { setSectors(prev => [...prev, novoSetor]); finalSectorId = novoSetor.id; }
      }
    }
    // total é coluna gerada pelo banco, não precisa enviar
    const { data } = await supabase.from('event_items').insert({ event_id: id, sector_id: finalSectorId, description: newItem.description, quantity: Number(newItem.quantity) || 1, unit_price: Number(newItem.unit_price) || 0, pagamento_tipo: newItem.pagamento_tipo, parcelas_total: Number(newItem.parcelas_total) || 1, parcelas_pagas: 0 }).select().single();
    if (data) setItems(prev => [...prev, data]);
    setNewItem({ sector_id: '', description: '', quantity: '1', unit_price: '', pagamento_tipo: 'avista', parcelas_total: '1' });
    setShowNewItem(false);
  };
  const deleteItem = async (itemId: string) => {
    await supabase.from('event_items').delete().eq('id', itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  };
  const addExtra = async () => {
    if (!newExtra.description || !id) return;
    const { data } = await supabase.from('event_extras').insert({ event_id: id, description: newExtra.description, quantity: Number(newExtra.quantity) || 1, unit_price: Number(newExtra.unit_price) || 0, approved: false }).select().single();
    if (data) setExtras(prev => [...prev, data]);
    setNewExtra({ description: '', quantity: '1', unit_price: '' });
    setShowNewExtra(false);
  };
  const toggleExtraApproved = async (extraId: string, approved: boolean) => {
    await supabase.from('event_extras').update({ approved }).eq('id', extraId);
    setExtras(prev => prev.map(e => e.id === extraId ? { ...e, approved } : e));
  };
  const deleteExtra = async (extraId: string) => {
    await supabase.from('event_extras').delete().eq('id', extraId);
    setExtras(prev => prev.filter(e => e.id !== extraId));
  };
  const deleteReceipt = async (receiptId: string) => {
    await supabase.from('payment_receipts').delete().eq('id', receiptId);
    setReceipts(prev => prev.filter(r => r.id !== receiptId));
  };

  // ── Cálculos ──
  // Total vem dos itens da planilha (não dos setores manuais)
  const totalPlanilhaAdmin = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalExtras = extras.filter(e => e.approved).reduce((s, e) => s + (Number(e.total) || 0), 0);
  const totalEvento = totalPlanilhaAdmin + totalExtras;
  // Total pago = soma das parcelas pagas de cada item
  const totalPaid = items.reduce((s, i) => {
    const parcTotal = Number(i.parcelas_total) || 1;
    const parcPagas = Number(i.parcelas_pagas) || 0;
    return s + (Number(i.total) / parcTotal) * parcPagas;
  }, 0);
  const emAberto = totalEvento - totalPaid;
  const pct = totalEvento > 0 ? Math.round((totalPaid / totalEvento) * 100) : 0;
  const margem = form?.budget ? Number(form.budget) - totalEvento : null;

  if (loading || !form) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5EFE6' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(184,150,90,0.2)', borderTop: '2px solid #B8965A', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: isMobile ? '16px' : '32px 40px', background: '#F5EFE6', minHeight: '100vh' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/admin/eventos')}
            style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(184,150,90,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#230606' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: '#5C1A2E', fontWeight: 400, marginBottom: '2px' }}>{form.nome}</h1>
            <p style={{ fontSize: '13px', color: '#230606', opacity: 0.5 }}>{form.cliente_nome} · {form.cliente_email}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate(`/admin/eventos/${id}/convidados`)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(184,150,90,0.1)', color: '#B8965A', border: '1px solid rgba(184,150,90,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            <Users size={14} /> Convidados
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: savedOk ? 'rgba(34,197,94,0.15)' : '#B8965A', color: savedOk ? '#16a34a' : '#230606', border: savedOk ? '1px solid rgba(34,197,94,0.3)' : 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.3s', opacity: saving ? 0.7 : 1 }}>
            <Save size={14} />
            {saving ? 'Salvando...' : savedOk ? 'Salvo!' : 'Salvar alterações'}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(184,150,90,0.08)', borderRadius: '24px', padding: '4px', width: 'fit-content' }}>
        {(['info', 'financeiro', 'fotos', 'arquivos', 'contracts', 'moodboard', 'messages'] as const).map(t => (
          <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>
            {{ info: 'Informações', financeiro: 'Financeiro', fotos: 'Fotos', arquivos: 'Arquivos', contracts: 'Contratos', moodboard: 'Moodboard', messages: 'Mensagens' }[t]}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

        {/* ── ABA: INFORMAÇÕES ── */}
        {tab === 'info' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={card}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400, marginBottom: '20px' }}>Dados do Evento</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div><label style={labelStyle}>Nome do Evento</label><input style={inputStyle} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                  <div><label style={labelStyle}>Tipo</label><input style={inputStyle} value={form.tipo || ''} onChange={e => setForm({ ...form, tipo: e.target.value })} placeholder="Ex: Casamento, Aniversário" /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <div><label style={labelStyle}>Data</label><input type="date" style={inputStyle} value={form.data || ''} onChange={e => setForm({ ...form, data: e.target.value })} /></div>
                    <div><label style={labelStyle}>Convidados</label><input type="number" style={inputStyle} value={form.convidados || ''} onChange={e => setForm({ ...form, convidados: Number(e.target.value) })} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <div><label style={labelStyle}>Local</label><input style={inputStyle} value={form.local || ''} onChange={e => setForm({ ...form, local: e.target.value })} /></div>
                    <div><label style={labelStyle}>Cidade</label><input style={inputStyle} value={form.cidade || ''} onChange={e => setForm({ ...form, cidade: e.target.value })} /></div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={card}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400, marginBottom: '20px' }}>Cliente</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div><label style={labelStyle}>Nome</label><input style={inputStyle} value={form.cliente_nome} onChange={e => setForm({ ...form, cliente_nome: e.target.value })} /></div>
                  <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={form.cliente_email} onChange={e => setForm({ ...form, cliente_email: e.target.value })} /></div>
                </div>
              </div>
              <div style={card}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400, marginBottom: '20px' }}>Financeiro & Status</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                  {/* Tipo comercial */}
                  <div>
                    <label style={labelStyle}>Tipo Comercial</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.tipo_evento_comercial || ''} onChange={e => setForm({ ...form, tipo_evento_comercial: e.target.value })}>
                      <option value="">Selecione...</option>
                      <option value="casamento">Casamento</option>
                      <option value="social">Evento Social (noivado, aniversário, jantar)</option>
                      <option value="corporativo">Evento Corporativo</option>
                    </select>
                  </div>

                  {/* Budget */}
                  <div>
                    <label style={labelStyle}>Budget do Cliente (R$)</label>
                    <div style={{ position: 'relative' }}>
                      <DollarSign size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#B8965A', opacity: 0.7 }} />
                      <input type="number" style={{ ...inputStyle, paddingLeft: '32px', borderColor: 'rgba(184,150,90,0.4)' }} value={form.budget || ''} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} placeholder="Valor disponível pelo cliente" />
                    </div>
                  </div>

                  {/* Calculadora */}
                  {form.tipo_evento_comercial && form.budget && form.budget > 0 && (() => {
                    const calc = calcularPrecificacao(form.tipo_evento_comercial, form.budget);
                    return (
                      <div style={{ background: 'rgba(184,150,90,0.06)', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '8px', padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.5 }}>Sugestão de Precificação</p>
                        </div>
                        {calc.faixa && (
                          <div style={{ marginBottom: '10px' }}>
                            <p style={{ fontSize: '20px', fontFamily: 'Playfair Display, serif', color: '#B8965A' }}>
                              {calc.faixa.min === calc.faixa.max
                                ? `R$ ${calc.faixa.min.toLocaleString('pt-BR')}`
                                : `R$ ${calc.faixa.min.toLocaleString('pt-BR')} – R$ ${calc.faixa.max.toLocaleString('pt-BR')}`}
                            </p>
                            <p style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>
                              {calc.faixa.label}
                              {calc.faixa.desconto && ` · desconto máx. ${calc.faixa.desconto}`}
                            </p>
                            <p style={{ fontSize: '12px', opacity: 0.5, marginTop: '6px' }}>
                              Fornecedores: <strong>R$ {Math.max(calc.fornecedores, 0).toLocaleString('pt-BR')}</strong>
                            </p>
                          </div>
                        )}
                        {calc.alertas.map((a, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '6px', fontSize: '11px', color: '#dc2626', opacity: 0.8 }}>
                            <span style={{ flexShrink: 0 }}>⚠️</span> {a}
                          </div>
                        ))}
                        {calc.faixa && (
                          <button
                            onClick={() => setForm({ ...form, receita_studio: calc.faixa!.min })}
                            style={{ marginTop: '10px', padding: '6px 12px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                            Usar valor mínimo
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Receita Studio Zoe (valor final acordado) */}
                  <div>
                    <label style={labelStyle}>Receita Studio Zoe — Valor Final (R$)</label>
                    <div style={{ position: 'relative' }}>
                      <DollarSign size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#16a34a', opacity: 0.7 }} />
                      <input type="number" style={{ ...inputStyle, paddingLeft: '32px', borderColor: 'rgba(34,197,94,0.3)' }}
                        value={form.receita_studio || ''}
                        onChange={e => setForm({ ...form, receita_studio: Number(e.target.value) })}
                        placeholder="Valor acordado com o cliente" />
                    </div>
                    {form.receita_studio && form.receita_studio < 12000 && (
                      <p style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>⚠️ Abaixo do mínimo de R$ 12.000</p>
                    )}
                  </div>

                  {/* Etapas do evento */}
                  <div>
                    <label style={labelStyle}>Etapas do Evento</label>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '8px', marginTop: '4px' }}>
                      {([
                        { key: 'etapa_planejamento', label: '1. Planejamento' },
                        { key: 'etapa_moodboard',    label: '2. Moodboard' },
                        { key: 'etapa_orcamento',    label: '3. Orçamento' },
                        { key: 'etapa_contrato',     label: '4. Contrato' },
                        { key: 'etapa_pagamento',    label: '5. Pagamento' },
                        { key: 'etapa_execucao',     label: '6. Execução' },
                        { key: 'etapa_pos_evento',   label: '7. Pós Evento' },
                      ] as const).map(({ key, label }) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: (form as any)[key] ? 'rgba(34,197,94,0.08)' : 'rgba(184,150,90,0.05)', border: `1px solid ${(form as any)[key] ? 'rgba(34,197,94,0.25)' : 'rgba(184,150,90,0.15)'}`, borderRadius: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })}
                            style={{ width: '16px', height: '16px', accentColor: '#B8965A', cursor: 'pointer' }} />
                          <span style={{ fontSize: '13px', color: (form as any)[key] ? '#16a34a' : '#230606', fontWeight: (form as any)[key] ? 500 : 400 }}>{label}</span>
                        </label>
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', opacity: 0.4, marginTop: '8px' }}>Salve as alterações para atualizar a timeline do cliente</p>
                  </div>

                  <div><label style={labelStyle}>Orçamento Interno (R$)</label><input type="number" style={inputStyle} value={form.orcamento || ''} onChange={e => setForm({ ...form, orcamento: Number(e.target.value) })} placeholder="Custo estimado do evento" /></div>
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.status || 'Negociação'} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {['Negociação', 'Proposta Enviada', 'Contratado', 'Planejamento', 'Em Execução', 'Entrega', 'Concluído'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA: FOTOS ── */}
        {tab === 'fotos' && (
          <div>
            {/* Header com link e upload */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: uploadingPhotos ? 'rgba(184,150,90,0.5)' : '#B8965A', color: '#230606', borderRadius: '8px', cursor: uploadingPhotos ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 500, minWidth: '160px', justifyContent: 'center' }}>
                <Camera size={15} />
                {uploadingPhotos
                  ? `${uploadProgress.done}/${uploadProgress.total} fotos...`
                  : 'Adicionar fotos'}
                <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleUploadEventPhotos} disabled={uploadingPhotos} />
              </label>

              <button onClick={copyGalleryLink}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: linkCopied ? 'rgba(34,197,94,0.1)' : 'rgba(184,150,90,0.1)', color: linkCopied ? '#16a34a' : '#B8965A', border: `1px solid ${linkCopied ? 'rgba(34,197,94,0.3)' : 'rgba(184,150,90,0.3)'}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.2s' }}>
                {linkCopied ? <><Check size={14} /> Link copiado!</> : <><Copy size={14} /> Copiar link da galeria</>}
              </button>

              {eventPhotos.length > 0 && (
                <>
                  <button onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: selectMode ? 'rgba(184,150,90,0.15)' : 'transparent', color: '#230606', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', opacity: 0.7 }}>
                    {selectMode ? 'Cancelar seleção' : 'Selecionar'}
                  </button>
                  {selectMode && selectedIds.size > 0 && (
                    <button onClick={deleteSelectedPhotos} disabled={deletingSelected}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                      <Trash2 size={14} />
                      {deletingSelected ? 'Deletando...' : `Deletar ${selectedIds.size} foto${selectedIds.size > 1 ? 's' : ''}`}
                    </button>
                  )}
                  <p style={{ fontSize: '12px', opacity: 0.4, marginLeft: 'auto' }}>
                    {eventPhotos.length} foto{eventPhotos.length !== 1 ? 's' : ''} · visíveis para convidados
                  </p>
                </>
              )}
            </div>

            {/* Info separação */}
            <div style={{ padding: '10px 14px', background: 'rgba(184,150,90,0.06)', border: '1px solid rgba(184,150,90,0.15)', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', color: '#230606', opacity: 0.6 }}>
              📸 Estas fotos são exclusivas para a galeria de convidados — separadas do moodboard e dos arquivos do cliente.
            </div>

            {eventPhotos.length === 0 ? (
              <div style={{ ...card, padding: '64px', textAlign: 'center' }}>
                <Camera size={48} style={{ margin: '0 auto 16px', color: '#B8965A', opacity: 0.2 }} />
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', color: '#5C1A2E', fontWeight: 400, marginBottom: '8px' }}>Nenhuma foto ainda</h3>
                <p style={{ fontSize: '13px', opacity: 0.4 }}>Adicione as fotos do evento para disponibilizar na galeria</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '8px' }}>
                {eventPhotos.map((photo, index) => {
                  const isSelected = selectedIds.has(photo.id);
                  return (
                    <div key={photo.id}
                      onClick={() => selectMode ? toggleSelectPhoto(photo.id) : setSelectedPhoto(index)}
                      style={{ aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: isSelected ? '2px solid #dc2626' : '1px solid rgba(184,150,90,0.15)', position: 'relative', transition: 'border 0.15s' }}>
                      <img
                        src={photo.file_url}
                        alt={photo.name || ''}
                        loading="lazy"
                        decoding="async"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.2s, opacity 0.3s', opacity: isSelected ? 0.7 : 1 }}
                        onLoad={e => (e.currentTarget.style.opacity = isSelected ? '0.7' : '1')}
                        onMouseEnter={e => { if (!selectMode) { e.currentTarget.style.transform = 'scale(1.05)'; const btn = e.currentTarget.nextElementSibling?.nextElementSibling as HTMLElement; if (btn) btn.style.opacity = '1'; } }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; const btn = e.currentTarget.nextElementSibling?.nextElementSibling as HTMLElement; if (btn) btn.style.opacity = '0'; }} />
                      {/* Checkbox de seleção */}
                      {selectMode && (
                        <div style={{ position: 'absolute', top: '6px', left: '6px', width: '20px', height: '20px', borderRadius: '50%', background: isSelected ? '#dc2626' : 'rgba(255,255,255,0.8)', border: isSelected ? 'none' : '2px solid rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected && <Check size={12} style={{ color: '#fff' }} />}
                        </div>
                      )}
                      {/* Delete rápido no hover (modo normal) */}
                      {!selectMode && (
                        <button
                          onClick={e => { e.stopPropagation(); deleteEventPhoto(photo.id); }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                          style={{ position: 'absolute', top: '6px', right: '6px', width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(239,68,68,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: 0, transition: 'opacity 0.2s' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Lightbox */}
            {selectedPhoto !== null && eventPhotos[selectedPhoto] && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
                onClick={() => setSelectedPhoto(null)}>
                <button onClick={() => setSelectedPhoto(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#fff' }}><X size={20} /></button>
                <button onClick={e => { e.stopPropagation(); deleteEventPhoto(eventPhotos[selectedPhoto].id); }}
                  style={{ position: 'absolute', top: '16px', right: '56px', background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#dc2626', fontSize: '12px' }}>
                  <Trash2 size={16} />
                </button>
                {selectedPhoto > 0 && (
                  <button onClick={e => { e.stopPropagation(); setSelectedPhoto(selectedPhoto - 1); }} style={{ position: 'absolute', left: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', color: '#fff' }}><ChevronLeft size={22} /></button>
                )}
                {selectedPhoto < eventPhotos.length - 1 && (
                  <button onClick={e => { e.stopPropagation(); setSelectedPhoto(selectedPhoto + 1); }} style={{ position: 'absolute', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', color: '#fff' }}><ChevronRight size={22} /></button>
                )}
                <img src={eventPhotos[selectedPhoto].file_url} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '4px' }} onClick={e => e.stopPropagation()} />
                <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', color: '#fff', opacity: 0.4 }}>
                  {selectedPhoto + 1} / {eventPhotos.length}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ABA: FINANCEIRO ── */}
        {tab === 'financeiro' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Budget', value: form.budget ? fmt(Number(form.budget)) : '—', editable: true },
                { label: 'Total Planilha', value: fmt(totalEvento) },
                { label: 'Total Pago', value: fmt(totalPaid), gold: true },
                { label: 'Em Aberto', value: fmt(emAberto), alert: emAberto > 0 },
                { label: 'Margem', value: margem !== null ? fmt(margem) : '—', positive: margem !== null && margem >= 0, negative: margem !== null && margem < 0 },
              ].map((c, i) => (
                <div key={i} style={{ ...card, padding: '16px' }}>
                  <p style={{ fontSize: '10px', opacity: 0.5, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</p>
                  <p style={{ fontSize: '18px', fontFamily: 'Playfair Display, serif', fontWeight: 400, color: (c as any).gold ? '#B8965A' : (c as any).alert ? '#dc2626' : (c as any).positive ? '#16a34a' : (c as any).negative ? '#dc2626' : '#230606' }}>
                    {(c as any).value}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ ...card, padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', opacity: 0.6 }}>Progresso de pagamento</span>
                <span style={{ fontSize: '13px', color: '#B8965A', fontWeight: 500 }}>{pct}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(184,150,90,0.15)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#B8965A', borderRadius: '99px', transition: 'width 0.6s' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(184,150,90,0.06)', borderRadius: '20px', padding: '4px', width: 'fit-content' }}>
              {(['planilha', 'setores_auto', 'extras', 'comprovantes'] as const).map(t => (
                <button key={t} style={{ ...tabStyle(finTab === t), fontSize: '12px', padding: '6px 14px' }} onClick={() => setFinTab(t)}>
                  {{ planilha: 'Planilha', setores_auto: 'Por Setor', extras: 'Extras', comprovantes: 'Comprovantes' }[t]}
                </button>
              ))}
            </div>

            

            {finTab === 'planilha' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between' }}>
                    <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>Planilha do Evento</h2>
                    <p style={{ fontSize: '13px', color: '#B8965A', fontWeight: 500 }}>{fmt(items.reduce((s, i) => s + i.total, 0))}</p>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ borderBottom: '1px solid rgba(184,150,90,0.1)' }}>
                      {['Descrição', 'Setor', 'Qtd', 'Valor Unit.', 'Total', 'Pagamento', 'Status', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', opacity: 0.4, fontWeight: 400, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {items.length === 0 && <tr><td colSpan={8} style={{ padding: '28px', textAlign: 'center', fontSize: '13px', opacity: 0.4 }}>Nenhum item cadastrado</td></tr>}
                      {items.map((item: any) => {
                        const parcTotal = item.parcelas_total || 1;
                        const parcPagas = item.parcelas_pagas || 0;
                        const valorParcela = item.total / parcTotal;
                        const isPago = parcPagas >= parcTotal;
                        const pct = Math.round((parcPagas / parcTotal) * 100);
                        const isEditing = editingItem === item.id;

                        if (isEditing) {
                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid rgba(184,150,90,0.07)', background: 'rgba(184,150,90,0.04)' }}>
                              <td style={{ padding: '8px 10px' }}><input style={{ ...inputSmall, fontSize: '12px' }} value={editItemData.description || ''} onChange={e => setEditItemData({ ...editItemData, description: e.target.value })} /></td>
                              <td style={{ padding: '8px 10px' }}>
                                <input list="setores-edit-list" style={{ ...inputSmall, fontSize: '12px' }} value={editItemData.setor_nome || ''} onChange={e => setEditItemData({ ...editItemData, setor_nome: e.target.value })} placeholder="Setor..." />
                                <datalist id="setores-edit-list">{sectors.map(s => <option key={s.id} value={s.name} />)}</datalist>
                              </td>
                              <td style={{ padding: '8px 10px' }}><input type="number" style={{ ...inputSmall, fontSize: '12px', width: '60px' }} value={editItemData.quantity || ''} onChange={e => setEditItemData({ ...editItemData, quantity: e.target.value })} /></td>
                              <td style={{ padding: '8px 10px' }}><input type="number" style={{ ...inputSmall, fontSize: '12px', width: '80px' }} value={editItemData.unit_price || ''} onChange={e => setEditItemData({ ...editItemData, unit_price: e.target.value })} /></td>
                              <td style={{ padding: '8px 10px', fontSize: '13px', color: '#B8965A' }}>{fmt((Number(editItemData.quantity) || 1) * (Number(editItemData.unit_price) || 0))}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <select style={{ ...inputSmall, fontSize: '11px' }} value={editItemData.pagamento_tipo || 'avista'} onChange={e => setEditItemData({ ...editItemData, pagamento_tipo: e.target.value })}>
                                  <option value="avista">À vista</option>
                                  <option value="parcelado">Parcelado</option>
                                </select>
                                {editItemData.pagamento_tipo === 'parcelado' && (
                                  <input type="number" min="2" max="24" style={{ ...inputSmall, fontSize: '11px', marginTop: '4px' }} value={editItemData.parcelas_total || ''} onChange={e => setEditItemData({ ...editItemData, parcelas_total: e.target.value })} placeholder="Nº parcelas" />
                                )}
                              </td>
                              <td colSpan={2} style={{ padding: '8px 10px' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button onClick={() => updateItem(item.id)} style={{ padding: '4px 10px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 500 }}>Salvar</button>
                                  <button onClick={() => setEditingItem(null)} style={{ padding: '4px 10px', background: 'transparent', color: '#230606', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', opacity: 0.6 }}>Cancelar</button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid rgba(184,150,90,0.07)' }}
                            onDoubleClick={() => { setEditingItem(item.id); setEditItemData({ description: item.description, setor_nome: item.setor_nome, quantity: item.quantity, unit_price: item.unit_price, pagamento_tipo: item.pagamento_tipo || 'avista', parcelas_total: item.parcelas_total || 1 }); }}>
                            <td style={{ padding: '11px 16px', fontSize: '13px' }}>{item.description}</td>
                            <td style={{ padding: '11px 16px', fontSize: '12px', opacity: 0.5 }}>{item.setor_nome || sectors.find(s => s.id === item.sector_id)?.name || '—'}</td>
                            <td style={{ padding: '11px 16px', fontSize: '13px' }}>{item.quantity}</td>
                            <td style={{ padding: '11px 16px', fontSize: '13px' }}>{fmt(item.unit_price)}</td>
                            <td style={{ padding: '11px 16px', fontSize: '13px', color: '#B8965A', fontWeight: 500 }}>{fmt(item.total)}</td>
                            <td style={{ padding: '11px 16px' }}>
                              {item.pagamento_tipo === 'parcelado' ? (
                                <div>
                                  <p style={{ fontSize: '11px' }}>{parcPagas}/{parcTotal}x · {fmt(valorParcela)}</p>
                                  <div style={{ height: '3px', background: 'rgba(184,150,90,0.15)', borderRadius: '99px', width: '60px', marginTop: '3px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: isPago ? '#16a34a' : '#B8965A', borderRadius: '99px' }} />
                                  </div>
                                </div>
                              ) : <span style={{ fontSize: '11px', opacity: 0.5 }}>À vista</span>}
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              {isPago ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '11px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '3px' }}><CheckCircle2 size={12} /> Pago</span>
                                  <button onClick={() => desfazerPagamento(item)} title="Desfazer" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, fontSize: '10px', color: '#dc2626' }}>↩</button>
                                </div>
                              ) : (
                                <button onClick={() => pagarParcela(item)} disabled={pagandoItem === item.id}
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 500 }}>
                                  {item.pagamento_tipo === 'parcelado' ? `Pagar ${parcPagas + 1}/${parcTotal}` : 'Pagar'}
                                </button>
                              )}
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => { setEditingItem(item.id); setEditItemData({ description: item.description, setor_nome: item.setor_nome, quantity: item.quantity, unit_price: item.unit_price, pagamento_tipo: item.pagamento_tipo || 'avista', parcelas_total: item.parcelas_total || 1 }); }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, color: '#B8965A' }} title="Editar">✏️</button>
                                <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, color: '#dc2626' }}><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {showNewItem ? (
                  <div style={{ ...card, padding: '18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div><label style={labelStyle}>Descrição</label><input style={inputSmall} placeholder="Ex: Bolo 4 andares" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} /></div>
                      <div>
                        <label style={labelStyle}>Setor</label>
                        <input list="setores-list" style={inputSmall} placeholder="Ex: Buffet, Flores..." value={newItem.sector_id} onChange={e => setNewItem({ ...newItem, sector_id: e.target.value })} />
                        <datalist id="setores-list">
                          {sectors.map(s => <option key={s.id} value={s.name} />)}
                          {[...new Set((items as any[]).map((i: any) => i.setor_nome).filter(Boolean))].map((nome: string) => <option key={nome} value={nome} />)}
                        </datalist>
                      </div>
                      <div><label style={labelStyle}>Qtd</label><input type="number" style={inputSmall} value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} /></div>
                      <div><label style={labelStyle}>Valor Unit. (R$)</label><input type="number" style={inputSmall} placeholder="0" value={newItem.unit_price} onChange={e => setNewItem({ ...newItem, unit_price: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label style={labelStyle}>Forma de pagamento</label>
                        <select style={inputSmall} value={newItem.pagamento_tipo} onChange={e => setNewItem({ ...newItem, pagamento_tipo: e.target.value })}>
                          <option value="avista">À vista</option>
                          <option value="parcelado">Parcelado</option>
                        </select>
                      </div>
                      {newItem.pagamento_tipo === 'parcelado' && (
                        <div>
                          <label style={labelStyle}>Número de parcelas</label>
                          <input type="number" min="2" max="24" style={inputSmall} placeholder="Ex: 5" value={newItem.parcelas_total} onChange={e => setNewItem({ ...newItem, parcelas_total: e.target.value })} />
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={addItem} style={{ padding: '8px 18px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Adicionar</button>
                      <button onClick={() => setShowNewItem(false)} style={{ padding: '8px 18px', background: 'transparent', color: '#230606', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', opacity: 0.6 }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowNewItem(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', background: 'rgba(184,150,90,0.05)', border: '1px dashed rgba(184,150,90,0.35)', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', color: '#B8965A', width: '100%', justifyContent: 'center' }}>
                    <Plus size={14} /> Adicionar item
                  </button>
                )}
              </div>
            )}

            {finTab === 'setores_auto' && (() => {
              // Agrupar itens por setor automaticamente
              const itensComSetor = items.map((i: any) => ({ ...i, setor_nome: (i as any).setor_nome || sectors.find(s => s.id === i.sector_id)?.name || 'Sem setor' }));
              const extrasAprovados = extras.filter(e => e.approved).map(e => ({ ...e, setor_nome: 'Extras Aprovados', pagamento_tipo: 'avista', parcelas_total: 1, parcelas_pagas: 0 }));
              const todos = [...itensComSetor, ...extrasAprovados];
              const setoresAutoMap: Record<string, { nome: string; items: any[]; total: number; pago: number }> = {};
              todos.forEach((item: any) => {
                const nome = item.setor_nome;
                if (!setoresAutoMap[nome]) setoresAutoMap[nome] = { nome, items: [], total: 0, pago: 0 };
                setoresAutoMap[nome].items.push(item);
                setoresAutoMap[nome].total += item.total;
                setoresAutoMap[nome].pago += (item.total / (item.parcelas_total || 1)) * (item.parcelas_pagas || 0);
              });
              const setoresAuto = Object.values(setoresAutoMap);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {setoresAuto.length === 0 ? (
                    <div style={{ ...card, padding: isMobile ? '16px' : '40px', textAlign: 'center', fontSize: '13px', opacity: 0.4 }}>Adicione itens na planilha para gerar os setores</div>
                  ) : setoresAuto.map(setor => {
                    const pct = setor.total > 0 ? Math.round((setor.pago / setor.total) * 100) : 0;
                    const isExp = expandedSetorAuto === setor.nome;
                    const comprovantesDoSetor = comprovantesSetor.filter((c: any) => c.setor_nome === setor.nome);
                    return (
                      <div key={setor.nome} style={{ ...card, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
                          onClick={() => setExpandedSetorAuto(isExp ? null : setor.nome)}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <h3 style={{ fontSize: '14px', color: '#230606', fontWeight: 400 }}>{setor.nome}</h3>
                              <span style={{ fontSize: '11px', opacity: 0.4 }}>{setor.items.length} item{setor.items.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ height: '3px', background: 'rgba(184,150,90,0.15)', borderRadius: '99px', width: '100px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#B8965A', borderRadius: '99px' }} />
                              </div>
                              <span style={{ fontSize: '11px', opacity: 0.5 }}>{pct}%</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '15px', fontFamily: 'Playfair Display, serif' }}>{fmt(setor.total)}</p>
                            <p style={{ fontSize: '11px', opacity: 0.5 }}>{fmt(setor.pago)} pago</p>
                          </div>
                          {isExp ? <ChevronUp size={14} style={{ opacity: 0.4 }} /> : <ChevronDown size={14} style={{ opacity: 0.4 }} />}
                        </div>
                        {isExp && (
                          <div style={{ borderTop: '1px solid rgba(184,150,90,0.1)', background: 'rgba(184,150,90,0.02)' }}>
                            {setor.items.map((item: any, i: number) => {
                              const isPago = (item.parcelas_pagas || 0) >= (item.parcelas_total || 1);
                              return (
                                <div key={item.id} style={{ padding: '10px 20px', borderBottom: i < setor.items.length - 1 ? '1px solid rgba(184,150,90,0.06)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '13px' }}>{item.description}</p>
                                    {item.pagamento_tipo === 'parcelado' && <p style={{ fontSize: '11px', opacity: 0.4 }}>{item.parcelas_pagas}/{item.parcelas_total} parcelas</p>}
                                  </div>
                                  <p style={{ fontSize: '13px', color: '#B8965A' }}>{fmt(item.total)}</p>
                                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: isPago ? 'rgba(34,197,94,0.1)' : 'rgba(184,150,90,0.08)', color: isPago ? '#16a34a' : '#B8965A' }}>
                                    {isPago ? 'Pago' : item.pagamento_tipo === 'parcelado' ? `${item.parcelas_pagas}/${item.parcelas_total}` : 'Pendente'}
                                  </span>
                                </div>
                              );
                            })}
                            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(184,150,90,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <p style={{ fontSize: '12px', opacity: 0.5 }}>{comprovantesDoSetor.length} comprovante{comprovantesDoSetor.length !== 1 ? 's' : ''}</p>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: 'rgba(184,150,90,0.08)', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: '#B8965A' }}>
                                <Upload size={11} />
                                {uploadingSetor === setor.nome ? 'Enviando...' : 'Comprovante'}
                                <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleUploadComprovanteSetor(e, setor.nome)} />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {finTab === 'extras' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(184,150,90,0.15)', display: 'flex', justifyContent: 'space-between' }}>
                    <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#5C1A2E', fontWeight: 400 }}>Extras</h2>
                    <p style={{ fontSize: '13px', color: '#B8965A', fontWeight: 500 }}>{fmt(totalExtras)} aprovados</p>
                  </div>
                  {extras.length === 0 && <div style={{ padding: '28px', textAlign: 'center', fontSize: '13px', opacity: 0.4 }}>Nenhum extra cadastrado</div>}
                  {extras.map(extra => (
                    <div key={extra.id} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(184,150,90,0.07)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', color: '#230606', marginBottom: '2px' }}>{extra.description}</p>
                        <p style={{ fontSize: '11px', opacity: 0.5 }}>{extra.quantity}x · {fmt(extra.unit_price)} cada</p>
                      </div>
                      <p style={{ fontSize: '14px', fontFamily: 'Playfair Display, serif' }}>{fmt(extra.total)}</p>
                      {extra.approved ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
                          <CheckCircle2 size={11} /> Aprovado pelo cliente
                        </span>
                      ) : (
                        <button onClick={() => toggleExtraApproved(extra.id, true)}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                          <CheckCircle2 size={11} /> Aprovar como cliente
                        </button>
                      )}
                      <button onClick={() => deleteExtra(extra.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, color: '#dc2626' }}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
                {showNewExtra ? (
                  <div style={{ ...card, padding: '18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div><label style={labelStyle}>Descrição</label><input style={inputSmall} placeholder="Ex: Arranjo adicional" value={newExtra.description} onChange={e => setNewExtra({ ...newExtra, description: e.target.value })} /></div>
                      <div><label style={labelStyle}>Qtd</label><input type="number" style={inputSmall} value={newExtra.quantity} onChange={e => setNewExtra({ ...newExtra, quantity: e.target.value })} /></div>
                      <div><label style={labelStyle}>Valor Unit. (R$)</label><input type="number" style={inputSmall} placeholder="0" value={newExtra.unit_price} onChange={e => setNewExtra({ ...newExtra, unit_price: e.target.value })} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={addExtra} style={{ padding: '8px 18px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Adicionar</button>
                      <button onClick={() => setShowNewExtra(false)} style={{ padding: '8px 18px', background: 'transparent', color: '#230606', border: '1px solid rgba(184,150,90,0.25)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', opacity: 0.6 }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowNewExtra(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', background: 'rgba(184,150,90,0.05)', border: '1px dashed rgba(184,150,90,0.35)', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', color: '#B8965A', width: '100%', justifyContent: 'center' }}>
                    <Plus size={14} /> Adicionar extra
                  </button>
                )}
              </div>
            )}

            {finTab === 'comprovantes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ ...card, padding: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(184,150,90,0.08)', border: '1px dashed rgba(184,150,90,0.4)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#B8965A', width: 'fit-content' }}>
                    <Upload size={14} />
                    {uploadingReceipt ? 'Enviando...' : 'Upload de comprovante'}
                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleUploadReceipt} />
                  </label>
                </div>
                {receipts.length === 0 && <div style={{ ...card, padding: isMobile ? '16px' : '32px', textAlign: 'center' }}><FileText size={36} style={{ margin: '0 auto 10px', opacity: 0.2 }} /><p style={{ fontSize: '13px', opacity: 0.4 }}>Nenhum comprovante ainda</p></div>}
                {receipts.map(receipt => (
                  <div key={receipt.id} style={{ ...card, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={16} style={{ color: '#B8965A' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', color: '#230606', marginBottom: '2px' }}>{receipt.name}</p>
                      <p style={{ fontSize: '11px', opacity: 0.5 }}>{new Date(receipt.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <a href={receipt.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#B8965A', color: '#230606', borderRadius: '6px', fontSize: '12px', fontWeight: 500, textDecoration: 'none' }}>
                      <Download size={12} /> Ver
                    </a>
                    <button onClick={() => deleteReceipt(receipt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, color: '#dc2626' }}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA: ARQUIVOS ── */}
        {tab === 'arquivos' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#B8965A', color: '#230606', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, width: 'fit-content' }}>
                <Upload size={15} />
                {uploadingArquivos ? 'Enviando...' : 'Adicionar arquivos'}
                <input type="file" multiple style={{ display: 'none' }} onChange={handleUploadArquivos} />
              </label>
              <p style={{ fontSize: '11px', opacity: 0.4, marginTop: '8px' }}>Estes arquivos ficam visíveis para o cliente na tela de Arquivos</p>
            </div>
            {arquivos.length === 0 ? (
              <div style={{ ...card, padding: isMobile ? '16px' : '40px', textAlign: 'center' }}>
                <FileText size={40} style={{ margin: '0 auto 12px', color: '#230606', opacity: 0.2 }} />
                <p style={{ fontSize: '13px', color: '#230606', opacity: 0.5 }}>Nenhum arquivo adicionado ainda</p>
              </div>
            ) : arquivos.map((arquivo: any) => (
              <div key={arquivo.id} style={{ ...card, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} style={{ color: '#B8965A' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', color: '#230606', marginBottom: '2px' }}>{arquivo.name}</p>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '12px', opacity: 0.5 }}>
                    <span>{new Date(arquivo.created_at).toLocaleDateString('pt-BR')}</span>
                    {arquivo.size && <><span>·</span><span>{arquivo.size}</span></>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a href={arquivo.file_url} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#B8965A', color: '#230606', borderRadius: '6px', fontSize: '12px', fontWeight: 500, textDecoration: 'none' }}>
                    <Download size={12} /> Ver
                  </a>
                  <button onClick={() => deleteArquivo(arquivo.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, color: '#dc2626' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ABA: CONTRATOS ── */}
        {tab === 'contracts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ ...card, padding: '18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(184,150,90,0.08)', border: '1px dashed rgba(184,150,90,0.4)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#B8965A', width: 'fit-content' }}>
                <Upload size={14} />{uploadingContracts ? 'Enviando...' : 'Adicionar contrato'}
                <input type="file" multiple style={{ display: 'none' }} onChange={handleUploadContracts} />
              </label>
            </div>
            {contracts.length === 0 ? (
              <div style={{ ...card, padding: isMobile ? '16px' : '40px', textAlign: 'center' }}>
                <FileText size={40} style={{ margin: '0 auto 12px', color: '#230606', opacity: 0.2 }} />
                <p style={{ fontSize: '13px', color: '#230606', opacity: 0.5 }}>Nenhum contrato adicionado ainda</p>
              </div>
            ) : contracts.map(c => (
              <div key={c.id} style={{ ...card, padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'rgba(184,150,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} style={{ color: '#B8965A' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', color: '#230606', marginBottom: '2px' }}>{c.name}</p>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '12px', opacity: 0.5 }}><span>{c.date}</span><span>·</span><span>{c.size}</span></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {c.status === 'signed'
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#16a34a', background: 'rgba(34,197,94,0.1)', padding: '3px 10px', borderRadius: '20px' }}><CheckCircle2 size={11} /> Assinado</span>
                    : <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#B8965A', background: 'rgba(184,150,90,0.1)', padding: '3px 10px', borderRadius: '20px' }}><Clock size={11} /> Pendente</span>
                  }
                  <a href={c.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#B8965A', color: '#230606', borderRadius: '6px', fontSize: '12px', fontWeight: 500, textDecoration: 'none' }}>
                    <Download size={12} /> Baixar
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ABA: MOODBOARD ── */}
        {tab === 'moodboard' && (
          <div>
            <div style={{ ...card, padding: '18px', marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(184,150,90,0.08)', border: '1px dashed rgba(184,150,90,0.4)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#B8965A', width: 'fit-content' }}>
                <Upload size={14} />{uploadingImages ? 'Enviando...' : 'Adicionar imagens'}
                <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleUploadImages} />
              </label>
            </div>
            {images.length === 0 ? (
              <div style={{ ...card, padding: isMobile ? '16px' : '40px', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', opacity: 0.5 }}>Nenhuma imagem no moodboard ainda</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '3px' }}>
                {images.map(img => (
                  <div key={img.id} style={{ borderRadius: '0', overflow: 'hidden', aspectRatio: '1', position: 'relative' }}>
                    <img src={img.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {img.status && (
                      <div style={{ position: 'absolute', top: '8px', right: '8px', padding: '3px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 500, background: img.status === 'approved' ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)', color: '#fff' }}>
                        {img.status === 'approved' ? 'Aprovado' : 'Recusado'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA: MENSAGENS ── */}
        {tab === 'messages' && (
          <div style={{ background: '#FDFAF6', border: '1px solid rgba(184,150,90,0.2)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ maxHeight: '460px', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.length === 0 && <p style={{ textAlign: 'center', opacity: 0.4, fontSize: '13px', padding: '24px 0' }}>Nenhuma mensagem ainda</p>}
              {messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'admin' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {msg.sender === 'admin' && <p style={{ fontSize: '11px', color: '#5C1A2E', fontWeight: 500, paddingLeft: '4px', opacity: 0.8 }}>Studio Zoe</p>}
                    <div style={{ padding: '10px 14px', borderRadius: msg.sender === 'admin' ? '4px 12px 12px 12px' : '12px 4px 12px 12px', background: msg.sender === 'admin' ? '#5C1A2E' : '#B8965A', color: msg.sender === 'admin' ? '#F5EFE6' : '#230606' }}>
                      <p style={{ fontSize: '13px' }}>{msg.text}</p>
                      <p style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px', textAlign: 'right' }}>{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(184,150,90,0.15)', display: 'flex', gap: '10px' }}>
              <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Escreva uma mensagem para o cliente..." style={{ ...inputStyle, flex: 1 }} />
              <button onClick={sendMessage} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#B8965A', color: '#230606', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                <Send size={14} /> Enviar
              </button>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
}