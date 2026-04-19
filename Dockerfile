FROM node:22-alpine

WORKDIR /app

# Instala dependências primeiro (cache layer)
COPY package.json .
RUN npm install --omit=dev

# Copia o código
COPY src/ ./src/

# Cria diretório de logs
RUN mkdir -p logs

EXPOSE 3000

CMD ["node", "src/index.js"]
