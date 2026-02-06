# Usar Node Alpine (mais leve e confiável)
FROM node:20-alpine

WORKDIR /app

# Copiar package.json
COPY package.json ./

# Instalar dependências com npm
RUN npm install

# Copiar o resto do projeto
COPY . .

EXPOSE 3000

# Comando para iniciar o dev server
CMD ["npm", "run", "dev"]


