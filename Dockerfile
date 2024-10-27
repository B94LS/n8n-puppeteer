FROM ghcr.io/puppeteer/puppeteer:22.8.2

USER root

# Verificar que Chrome está instalado y mostrar su versión
RUN google-chrome-stable --version

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
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Crear y dar permisos al directorio de cache
RUN mkdir -p /home/pptruser/.cache/puppeteer && \
    chown -R pptruser:pptruser /home/pptruser/.cache

# Cambiar al usuario no root
USER pptruser

# Comando para iniciar la aplicación
CMD ["npm", "start"]
