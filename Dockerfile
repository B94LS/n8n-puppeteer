FROM ghcr.io/puppeteer/puppeteer:22.8.2

USER root

# Crear y establecer el directorio de trabajo
WORKDIR /usr/src/app

# Copiar los archivos del proyecto
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Asegurarnos de que el puerto 3000 está expuesto
EXPOSE 3000

# Establecer las variables de entorno
ENV PORT=3000
ENV HOST=0.0.0.0

# Cambiar al usuario no root para mayor seguridad
USER pptruser

# Comando para iniciar la aplicación
CMD ["npm", "start"]
