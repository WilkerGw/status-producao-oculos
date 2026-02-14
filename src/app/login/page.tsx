'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlId = searchParams.get('id') || '';

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [cpf, setCpf] = useState('');

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove não dígitos

    // Aplica máscara visualmente: 000.000.000-00
    if (value.length > 11) value = value.slice(0, 11);

    value = value.replace(/(\d{3})(\d)/, '$1.$2')
    value = value.replace(/(\d{3})(\d)/, '$1.$2')
    value = value.replace(/(\d{3})(\d{1,2})/, '$1-$2')
    value = value.replace(/(-\d{2})\d+?$/, '$1');

    setCpf(value);
  };
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ordersList, setOrdersList] = useState<any[]>([]);

  useEffect(() => {
    // Limpa lista se mudar URL, embora urlId não seja mais usado
  }, [urlId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOrdersList([]);

    try {
      // Remover formatação para comparar com o banco (que armazena apenas números)
      const cleanInputCpf = cpf.replace(/\D/g, '');

      // Busca no Supabase (ServiceOrders + Clients)
      // Traz todos os pedidos deste CPF
      const { data, error } = await supabase
        .from('ServiceOrders')
        .select('Id, CreatedAt, Description, Status, Clients!inner(Cpf)')
        .eq('Clients.Cpf', cleanInputCpf)
        // Removed .neq('Status', 'Entregue') to show all orders
        .order('CreatedAt', { ascending: false });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        setError('Nenhum pedido encontrado para este CPF.');
      } else if (data.length === 1) {
        // Apenas um pedido, redireciona direto
        const orderId = data[0].Id;
        router.push(`/acompanhamento?id=${orderId}`);
      } else {
        // Múltiplos pedidos, mostra lista para selecionar
        setOrdersList(data);
      }
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao buscar os pedidos. Verifique o CPF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/20 rounded-full mix-blend-overlay filter blur-[100px] animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-600/20 rounded-full mix-blend-overlay filter blur-[100px] animate-blob animation-delay-2000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Button
          variant="ghost"
          className="mb-6 -ml-2 text-slate-400 hover:text-white"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>

        <Card className="shadow-2xl border-t border-white/10 p-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-amber-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20"
            >
              <Search className="w-8 h-8 text-amber-500" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">Acompanhe seu Pedido</h2>
            <p className="text-slate-400">Digite seu CPF para consultar o status</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {!ordersList.length ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="cpf" className="text-sm font-medium text-slate-300 ml-1">CPF do Titular</label>
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={handleCpfChange}
                    maxLength={14}
                    className="bg-slate-900/50 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3 text-red-200 text-sm"
                    >
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-base font-semibold mt-2 font-bold shadow-amber-500/20"
                  disabled={!cpf || loading}
                  isLoading={loading}
                  variant="primary"
                >
                  {loading ? "Buscando..." : "Consultar Pedidos"}
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-300 text-sm text-center mb-4">Encontramos os seguintes pedidos:</p>
                {ordersList.map((order) => (
                  <div
                    key={order.Id}
                    onClick={() => router.push(`/acompanhamento?id=${order.Id}`)}
                    className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-amber-500/50 hover:bg-slate-800 transition-all cursor-pointer flex justify-between items-center group"
                  >
                    <div>
                      <p className="text-amber-500 font-bold text-sm">Pedido #{order.Id}</p>
                      <p className="text-slate-400 text-xs mt-1">{new Date(order.CreatedAt).toLocaleDateString('pt-BR')}</p>
                      <p className="text-slate-300 text-xs mt-1 truncate max-w-[200px]">{order.Description || 'Sem descrição'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300 group-hover:bg-amber-500/20 group-hover:text-amber-400 group-hover:border-amber-500/30 transition-colors">
                        {order.Status}
                      </span>
                    </div>
                  </div>
                ))}

                <Button
                  variant="ghost"
                  className="w-full mt-4 text-slate-400 hover:text-white"
                  onClick={() => {
                    setOrdersList([]);
                    setError('');
                  }}
                >
                  Voltar e consultar outro CPF
                </Button>
              </div>
            )}
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Carregando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
