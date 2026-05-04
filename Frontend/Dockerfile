# Estágio 1: Build da aplicação Node (Vite + React)
FROM node:22-alpine AS build
WORKDIR /app

# Copia e instala as dependências
COPY package.json package-lock.json ./
RUN npm install

# Copia o resto do código fonte e faz o build
COPY . ./
RUN npm run build

# Estágio 2: Hospedagem com Nginx
FROM nginx:alpine

# Copia a pasta dist do Vite para a pasta estática do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Sobrescreve o default.conf para suportar SPA (Single Page Application routing)
RUN echo "server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
