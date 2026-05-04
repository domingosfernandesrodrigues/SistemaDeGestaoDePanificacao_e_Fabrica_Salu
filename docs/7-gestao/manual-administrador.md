# Manual do Administrador SGP-F

Bem-vindo ao Sistema de Gestão de Panificação e Fábrica (SGP-F).

## 1. Visão Geral
O SGP-F é um ERP completo projetado em 5 módulos integrados:
1. **Engenharia e Produtos**: Base de Cadastro e Fichas Técnicas (BOM).
2. **Produção (Chão de Fábrica)**: Ordens de Produção (OP) e Movimentação de Estoque.
3. **Gestão de Pessoas (RH)**: Controle de Ponto, Horas Extras e Holerites.
4. **Logística e Vendas**: Pedidos B2B, Gestão de Vans (Abastecimento/Manutenção) e Trocas (Avarias).
5. **Financeiro e DRE**: Controle automático de Contas a Pagar/Receber e Demonstrativo de Resultado (BI).

## 2. Operação Diária

### 2.1 Iniciando a Produção
- Acesse o painel `/ordens-producao`.
- Crie uma nova OP com o produto desejado.
- Mova para **"Iniciar Produção"**: O sistema reservará imediatamente a matéria-prima no estoque.
- Ao concluir fisicamente, mova para **"Finalizar Produção"**: O sistema fará a conversão do Custo Real e jogará o novo "Produto Acabado" para o seu saldo de venda.

### 2.2 Controle de Ponto
- A página `/rh/ponto` deve ficar aberta num terminal/tablet na entrada da fábrica.
- Os operadores registram a entrada e saída. Ao final do mês, o Gestor vai em `/rh/folha` e clica em **"Fechar Folha"** para deduzir impostos, somar Horas Extras e gerar um "Contas a Pagar".

### 2.3 Vendas e Expedição
- Os pedidos B2B entram pelo comercial. A tela `/vendas` mapeia o fluxo.
- Ao **"Confirmar Entrega"**, o estoque do pão/biscoito é baixado permanentemente e um título é emitido para o Contas a Receber.

## 3. Gestão Financeira
Toda despesa operacional (Compras, Folha, Oficina de Vans) deságua em "Contas a Pagar". Toda receita deságua em "Contas a Receber".
O painel Dashboard extrai essas informações e compõe a sua **DRE**.

## 4. Deploy (Docker)
Este projeto está Dockerizado. Para publicar na AWS, Azure ou em uma VPS Linux:
1. Tenha o Docker Compose instalado.
2. Na raiz do projeto, rode:
```bash
docker-compose up -d --build
```
3. O servidor subirá na porta `5173` para a interface web. A API escutará na `5137` e o Banco de Dados estará blindado na rede interna do Docker.
