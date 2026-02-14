// src/app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Order, STATUS_LIST, StatusType, getNormalizedStatus } from '../../utils/types';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import {
  Plus,
  LogOut,
  Trash2,
  Link as LinkIcon,
  CheckCircle,
  Clock,
  User,
  Shield,
  Package,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper interface for DB response
interface DBOrder {
  Id: number;
  Status: string;
  CreatedAt: string;
  Description: string | null;
  History: string | null;
  // Joins
  Clients?: {
    FullName: string;
    Cpf: string;
  };
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard States
  const [orders, setOrders] = useState<Order[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form States
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newGlassesModel, setNewGlassesModel] = useState('');
  const [newLensType, setNewLensType] = useState('');

  // 1. Verificar se já está logado ao abrir a página
  useEffect(() => {
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setIsAuthenticated(true);
      fetchOrders();
    } else {
      setLoading(false);
    }
  }

  // 2. Buscar pedidos do Banco de Dados
  async function fetchOrders() {
    setLoading(true);
    // Agora busca de ServiceOrders e faz join com Clients
    // Filtra Status diferente de 'Entregue'
    const { data, error } = await supabase
      .from('ServiceOrders')
      .select('*, Clients(FullName, Cpf)')
      .neq('Status', 'Entregue')
      .order('CreatedAt', { ascending: false });

    if (error) {
      console.error('Erro ao buscar:', error);
    } else {
      // Safe casting
      const rawData = data as unknown as DBOrder[];

      const mappedOrders = rawData?.map((item) => {
        // Tenta parsear o histórico se for JSON string, senão cria array vazio
        let historyArray = [];
        try {
          if (item.History) {
            const parsed = JSON.parse(item.History);
            if (Array.isArray(parsed)) historyArray = parsed;
          }
        } catch (e) {
          // Se falhar o parse, assume vazio ou formato texto simples não suportado na interface
        }

        // Extrair modelo e lente da descrição se possível, ou usar padrão
        const description = item.Description || '';
        // Exemplo simples de extração ou fallback

        return {
          id: item.Id.toString(),
          customerName: item.Clients?.FullName || 'Cliente Sem Nome',
          cpf: item.Clients?.Cpf || '000.000.000-00',
          currentStatus: getNormalizedStatus(item.Status || ''),
          history: historyArray.map((h: any) => ({ ...h, status: getNormalizedStatus(h.status) })),
          glassesModel: 'Ver Descrição', // Simplificação
          lensType: 'Ver Descrição', // Simplificação
          createdAt: item.CreatedAt,
          originalDescription: description
        };
      }) || [];

      setOrders(mappedOrders);
    }
    setLoading(false);
  }

  // 3. Login Real com Supabase
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoginError(error.message);
      setLoading(false);
    } else {
      setIsAuthenticated(true);
      fetchOrders();
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setOrders([]);
    setEmail('');
    setPassword('');
  }

  // 4. Criar Pedido no Banco
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanCpf = newCpf.replace(/\D/g, '');

      // 1. Verificar/Criar Cliente
      let clientId: number | null = null;

      const { data: existingClient, error: clientFetchError } = await supabase
        .from('Clients')
        .select('Id')
        .eq('Cpf', cleanCpf)
        .single();

      if (clientFetchError && clientFetchError.code !== 'PGRST116') { // PGRST116 is "Row not found"
        throw new Error(`Erro ao buscar cliente: ${clientFetchError.message}`);
      }

      if (existingClient) {
        clientId = existingClient.Id;
      } else {
        // Criar novo cliente
        const { data: newClient, error: createClientError } = await supabase
          .from('Clients')
          .insert({
            FullName: newCustomerName,
            Cpf: cleanCpf,
            Phone: '' // Opcional por enquanto
          })
          .select('Id')
          .single();

        if (createClientError) {
          throw new Error(`Erro ao criar cliente: ${createClientError.message}`);
        }

        clientId = newClient.Id;
      }

      // 2. Criar Pedido
      const { error: createOrderError } = await supabase
        .from('ServiceOrders')
        .insert({
          ClientId: clientId,
          Description: `${newGlassesModel} - ${newLensType}`,
          Status: 'Recebido',
          History: JSON.stringify([{ status: 'Recebido', date: new Date().toLocaleString('pt-BR') }])
        });

      if (createOrderError) {
        throw new Error(`Erro ao criar pedido: ${createOrderError.message}`);
      }

      // Sucesso
      alert('Pedido criado com sucesso!');
      setIsModalOpen(false);

      // Limpar form
      setNewCustomerName('');
      setNewCpf('');
      setNewGlassesModel('');
      setNewLensType('');

      fetchOrders();

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Ocorreu um erro ao criar o pedido.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Atualizar Status no Banco
  const updateStatus = async (orderId: string, newStatus: StatusType) => {
    const now = new Date().toLocaleString('pt-BR');

    // Pega o pedido atual
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) return;

    // Constrói novo histórico
    // Na interface Order, history já é um array de objetos {status, date}
    const newHistoryEntry = { status: newStatus, date: now };
    const updatedHistoryArray = [...currentOrder.history, newHistoryEntry];

    // Atualização Otimista da UI
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, currentStatus: newStatus, history: updatedHistoryArray } : o
    ));

    // Se o novo status for 'Entregue', remove da lista (conforme regra de negócio solicitada)
    if (newStatus === 'Entregue') {
      setTimeout(() => {
        setOrders(prev => prev.filter(o => o.id !== orderId));
      }, 500); // Pequeno delay para feedback visual
    }

    const { error } = await supabase
      .from('ServiceOrders')
      .update({
        Status: newStatus,
        History: JSON.stringify(updatedHistoryArray) // Grava como JSON string
      })
      .eq('Id', parseInt(orderId));

    if (error) {
      alert('Erro ao atualizar: ' + error.message);
      fetchOrders(); // Reverte em caso de erro
    }
  };

  // 6. Deletar no Banco
  const handleDeleteOrder = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este pedido?')) {
      setOrders(prev => prev.filter(o => o.id !== id)); // Otimista

      // Usa 'ServiceOrders' e 'Id' (PascalCase e número)
      const { error } = await supabase.from('ServiceOrders').delete().eq('Id', parseInt(id));
      if (error) {
        alert('Erro ao deletar: ' + error.message);
        fetchOrders(); // Reverte
      }
    }
  }

  // Utilitários
  const copyLink = (id: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/login?id=${id}`;
    navigator.clipboard.writeText(link);
    alert(`Link copiado!`);
  };

  const formatCPF = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
  }

  // --- RENDERIZAÇÃO (LOGIN) ---
  if (!isAuthenticated) {
    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loading /></div>;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Animate Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full mix-blend-overlay filter blur-[100px] animate-blob"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-600/10 rounded-full mix-blend-overlay filter blur-[100px] animate-blob animation-delay-2000"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm relative z-10"
        >
          <Card className="shadow-2xl border-t border-white/10 p-8">
            <div className="text-center mb-8">
              <div className="bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-white/10">
                <Shield className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Acesso Gerencial</h2>
              <p className="text-slate-400 text-sm mt-1">Faça login para gerenciar pedidos</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@oticasvizz.com"
                  className="bg-slate-900/50 focus:border-amber-500 focus:ring-amber-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Senha</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-900/50 focus:border-amber-500 focus:ring-amber-500"
                  required
                />
              </div>

              {loginError && (
                <p className="text-red-400 text-sm bg-red-500/10 p-2 rounded border border-red-500/20 text-center">
                  {loginError}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full font-bold" disabled={loading}>
                {loading ? 'Entrando...' : 'Acessar Painel'}
              </Button>

              <Link href="/" className="block text-center text-sm text-amber-400 mt-4 hover:text-amber-300 transition-colors">
                Voltar para o Início
              </Link>
            </form>
          </Card>
        </motion.div>
      </div>
    );
  }

  // --- RENDERIZAÇÃO (DASHBOARD) ---
  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <div className="bg-slate-900/50 backdrop-blur-md border-b border-white/5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-amber-400 to-yellow-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-100 hidden sm:block">Painel Vizz</h1>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={logout}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              size="sm"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="primary"
              className="shadow-lg shadow-amber-500/20"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Novo Pedido
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {loading && orders.length === 0 ? (
          <Loading />
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800"
          >
            <Package className="w-16 h-16 mx-auto text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">Nenhum pedido encontrado</h3>
            <p className="text-slate-500">Crie um novo pedido para começar.</p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {orders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group"
                >
                  <Card className="flex flex-col md:flex-row justify-between p-5 gap-5 border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-lg text-slate-200 truncate">{order.customerName}</h3>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                          #{order.id}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-2">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> {order.cpf}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" /> {order.glassesModel || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1.5 hidden sm:flex">
                          <Clock className="w-3.5 h-3.5" /> {order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : '-'}
                        </div>
                      </div>

                      <button
                        onClick={() => copyLink(order.id)}
                        className="text-xs text-amber-500 font-medium mt-3 flex items-center gap-1 hover:text-amber-400 transition-colors"
                      >
                        <LinkIcon className="w-3 h-3" /> Copiar Link de Rastreio
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto mt-2 md:mt-0">
                      {/* Status Selector Customizado */}
                      <div className="relative w-full sm:w-64">
                        <select
                          className={cn(
                            "w-full appearance-none bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all cursor-pointer",
                            order.currentStatus === 'Entregue' && "border-green-500/50 text-green-400 bg-green-950/20"
                          )}
                          value={order.currentStatus}
                          onChange={(e) => updateStatus(order.id, e.target.value as StatusType)}
                        >
                          {STATUS_LIST.map(s => <option key={s} value={s} className="bg-slate-900 text-slate-200">{s}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      </div>

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteOrder(order.id)}
                        className="w-full sm:w-auto bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Modal - Create Order */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg relative z-10"
            >
              <Card className="bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-white">Novo Pedido</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <label className="text-xs font-medium text-slate-400 uppercase">Nome do Cliente</label>
                      <Input
                        type="text"
                        placeholder="Ex: Ana Maria"
                        value={newCustomerName}
                        onChange={e => setNewCustomerName(e.target.value)}
                        className="bg-slate-950/50"
                        required
                      />
                    </div>
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <label className="text-xs font-medium text-slate-400 uppercase">CPF</label>
                      <Input
                        type="text"
                        placeholder="000.000.000-00"
                        value={newCpf}
                        onChange={e => setNewCpf(formatCPF(e.target.value))}
                        maxLength={14}
                        className="bg-slate-950/50"
                        required
                      />
                    </div>
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <label className="text-xs font-medium text-slate-400 uppercase">Modelo</label>
                      <Input
                        type="text"
                        placeholder="Ex: Ray-Ban Aviator"
                        value={newGlassesModel}
                        onChange={e => setNewGlassesModel(e.target.value)}
                        className="bg-slate-950/50"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-xs font-medium text-slate-400 uppercase">Tipo de Lente</label>
                      <Input
                        type="text"
                        placeholder="Ex: Multifocal Antirreflexo"
                        value={newLensType}
                        onChange={e => setNewLensType(e.target.value)}
                        className="bg-slate-950/50"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-brand-primary hover:bg-blue-600"
                    >
                      Criar Pedido
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}