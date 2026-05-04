# Estimativa de Custos de Infraestrutura e Projeto

## 1. Servidores e Hospedagem (Nuvem)
- **Backend (.NET 10 API):** Hospedagem em serviços de container (ex: Azure Container Apps ou AWS ECS) para escalabilidade.
- **Frontend (React/Vite):** Hospedagem de arquivos estáticos (ex: Vercel, Netlify ou AWS S3 + CloudFront).

## 2. Banco de Dados
- **Relacional (SQL Server):** Instância na nuvem (ex: Azure SQL Database ou AWS RDS). O custo varia conforme a capacidade de processamento (vCores) e armazenamento.

## 3. Serviços Adicionais
- **Armazenamento (Blob/S3):** Para guardar PDFs (holerites, notas fiscais) e imagens.
- **Notificações:** Serviço de disparo de e-mails (ex: SendGrid, AWS SES) para envio de relatórios e acessos.

## 4. Orçamento Mensal Estimado
- **Ambiente de Desenvolvimento/Homologação:** Utilização máxima de tiers gratuitos (Free Tier).
- **Ambiente de Produção (Estimativa Inicial):** US$ 50 a US$ 150/mês, dependendo do tráfego e volume de notas processadas.