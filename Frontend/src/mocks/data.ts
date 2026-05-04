export interface Pedido {
  id: string;
  codigo: string;
  cliente: string;
  valor: number;
  status: 'novo' | 'separacao' | 'rota' | 'entregue';
  detalhes: string;
  data: string;
}

export const pedidosIniciais: Pedido[] = [
  {
    id: '1',
    codigo: 'PED-0099',
    cliente: 'Supermercado XYZ',
    valor: 450.00,
    status: 'novo',
    detalhes: 'Vários itens de padaria',
    data: new Date().toISOString()
  },
  {
    id: '2',
    codigo: 'PED-001',
    cliente: 'Supermercado ABC',
    valor: 450.00,
    status: 'separacao',
    detalhes: '200x Biscoito Polvilho 100g',
    data: new Date().toISOString()
  },
  {
    id: '3',
    codigo: 'PED-002',
    cliente: 'Padaria Central',
    valor: 800.00,
    status: 'rota',
    detalhes: '50x Pão de Queijo 1Kg',
    data: new Date().toISOString()
  },
  {
    id: '4',
    codigo: 'PED-003',
    cliente: 'Mercado da Esquina',
    valor: 120.00,
    status: 'entregue',
    detalhes: 'Pães diversos',
    data: new Date().toISOString()
  }
];

export interface Produto {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  estoque: number;
}

export const produtosIniciais: Produto[] = [
  { id: '1', nome: 'Biscoito Polvilho 100g', categoria: 'Secos', preco: 2.25, estoque: 1500 },
  { id: '2', nome: 'Pão de Queijo 1Kg', categoria: 'Congelados', preco: 16.00, estoque: 500 },
  { id: '3', nome: 'Pão Francês', categoria: 'Padaria', preco: 0.50, estoque: 2000 },
  { id: '4', nome: 'Bolo de Rolo', categoria: 'Confeitaria', preco: 25.00, estoque: 50 }
];
