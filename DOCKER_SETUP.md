# Rodar o Projeto com Docker 🐳

Você pode rodar o projeto **sem instalar Node.js** usando Docker!

## Pré-requisitos

- **Docker**: [Instale aqui](https://www.docker.com/products/docker-desktop)
- **Docker Compose**: Geralmente vem com Docker Desktop

## Como Usar

### 1. **Verificar se Docker está instalado**

```powershell
docker --version
docker-compose --version
```

### 2. **Rodar o servidor de desenvolvimento**

```powershell
cd "c:\Users\jmarc\OneDrive\Área de Trabalho\GlowUp Car\glow-report"
docker-compose up
```

A aplicação estará disponível em: **http://localhost:5173**

### 3. **Rodar os testes**

```powershell
docker-compose run tests npm test
```

### 4. **Instalar novas dependências (dentro do container)**

```powershell
docker-compose exec app npm install nome-do-pacote
```

### 5. **Parar o servidor**

```powershell
docker-compose down
```

## Arquivos Criados

- **`Dockerfile`** - Define como construir a imagem Docker
- **`docker-compose.yml`** - Orquestra os serviços (app + testes)
- **`.dockerignore`** - Arquivos que não devem ir para o container

## Vantagens

✅ Sem instalar Node.js na máquina  
✅ Ambiente isolado e reproducível  
✅ Funciona em qualquer máquina com Docker  
✅ Fácil para deploy  

## Troubleshooting

**Porta 5173 já em uso?**
```powershell
docker-compose down
```

**Limpar tudo e começar do zero?**
```powershell
docker-compose down -v
docker system prune
```

**Ver logs em tempo real?**
```powershell
docker-compose logs -f app
```

---

**Agora você pode desenvolver sem instalar nada! 🎉**
