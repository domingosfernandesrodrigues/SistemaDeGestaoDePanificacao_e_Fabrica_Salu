# Base SDK para build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copia os arquivos de solução e projetos para restore em cache
COPY *.sln ./
COPY SGPF.Domain/*.csproj SGPF.Domain/
COPY SGPF.Application/*.csproj SGPF.Application/
COPY SGPF.Infrastructure/*.csproj SGPF.Infrastructure/
COPY SGPF.WebApi/*.csproj SGPF.WebApi/

RUN dotnet restore

# Copia todo o código fonte e faz o build e publish
COPY . ./
WORKDIR /src/SGPF.WebApi
RUN dotnet publish -c Release -o /app/publish

# Imagem de runtime otimizada
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Instalar dependências para o QuestPDF (fontes e bibliotecas de desenho) se necessário
# RUN apt-get update && apt-get install -y libfontconfig1

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:80
EXPOSE 80

ENTRYPOINT ["dotnet", "SGPF.WebApi.dll"]
