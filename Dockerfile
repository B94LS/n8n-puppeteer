# Actualizamos a la última imagen base estable de Puppeteer
FROM ghcr.io/puppeteer/puppeteer:22.8.2

# Establecemos el directorio de trabajo
WORKDIR /usr/src/app

# Copiamos package.json y package-lock.json
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos el código fuente
COPY . .

# Exponemos el puerto que usará la aplicación
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "index.js"]
