# Usamos una imagen base con Node.js y las dependencias necesarias para Puppeteer
FROM ghcr.io/puppeteer/puppeteer:21.5.2

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
