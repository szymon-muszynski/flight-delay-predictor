FROM node:18-slim
WORKDIR /app

# Najpierw kopiujemy tylko pliki z listą bibliotek
COPY package.json ./

# Instalujemy biblioteki WEWNĄTRZ kontenera
RUN npm install

# Dopiero teraz kopiujemy resztę plików (src, public itd.)
COPY . .

EXPOSE 3000
CMD ["npm", "start"]