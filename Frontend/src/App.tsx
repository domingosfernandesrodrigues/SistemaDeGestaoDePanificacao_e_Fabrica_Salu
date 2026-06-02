import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';
import { AuthGuard } from './components/auth/AuthGuard';
import { Layout } from './components/ui/Layout';
import { Dashboard } from './pages/Dashboard';
import { Produtos } from './pages/Produtos';
import { OrdensProducao } from './pages/OrdensProducao';
import { Ponto } from './pages/Ponto';
import AfastamentosRH from './pages/AfastamentosRH';
import { FolhaPagamento } from './pages/FolhaPagamento';
import { MeusContracheques } from './pages/MeusContracheques';
import Alimentacao from './pages/Alimentacao';
import { PlanejamentoFerias } from './pages/PlanejamentoFerias';
import { Vendas } from './pages/Vendas';
import { Frota, Trocas } from './pages/Logistica';
import { Compras } from './pages/Compras';
import { EntradaInsumos } from './pages/EntradaInsumos';
import { PortalCliente } from './pages/PortalCliente';
import { CrmReunioes } from './pages/CrmReunioes';
import { Clientes } from './pages/Clientes';
import { FichaTecnica } from './pages/FichaTecnica';
import Fornecedores from './pages/Fornecedores';
import Funcionarios from './pages/Funcionarios';
import Usuarios from './pages/Usuarios';
import Despesas from './pages/Despesas';
import { ConfiguracoesEmpresa } from './pages/ConfiguracoesEmpresa';
import { ContasBancarias } from './pages/ContasBancarias';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={
            localStorage.getItem('sgpf_token') 
              ? <Navigate to="/dashboard" replace /> 
              : <Login />
          } />
          
          {/* Rotas Exclusivas do Cliente (Portal B2B) */}
          <Route path="/portal" element={<PortalCliente />} />
          
          {/* Rotas Administrativas da Fábrica */}
          <Route 
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/crm" element={<CrmReunioes />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/entrada-insumos" element={<EntradaInsumos />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/fichas-tecnicas" element={<FichaTecnica />} />
            <Route path="/ordens-producao" element={<OrdensProducao />} />
            <Route path="/frota" element={<Frota />} />
            <Route path="/trocas" element={<Trocas />} />
            <Route path="/rh/ponto" element={<Ponto />} />
            <Route path="/rh/afastamentos" element={<AfastamentosRH />} />
            <Route path="/rh/ferias" element={<PlanejamentoFerias />} />
            <Route path="/rh/folha" element={<FolhaPagamento />} />
            <Route path="/rh/meus-contracheques" element={<MeusContracheques />} />
            <Route path="/rh/alimentacao" element={<Alimentacao />} />
            <Route path="/rh/funcionarios" element={<Funcionarios />} />
            <Route path="/financeiro/despesas" element={<Despesas />} />
            <Route path="/financeiro/contas" element={<ContasBancarias />} />
            <Route path="/fornecedores" element={<Fornecedores />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/configuracoes/empresa" element={<ConfiguracoesEmpresa />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
