# Usar la última versión estable de la imagen de Puppeteer
FROM ghcr.io/puppeteer/puppeteer:22.8.2

# Establecer el usuario para evitar problemas de permisos
USER root

# Crear y establecer el directorio de trabajo
WORKDIR /usr/src/app

# Copiar los archivos del proyecto
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto
EXPOSE 3000

# Cambiar al usuario no root para mayor seguridad
USER pptruser

# Comando para iniciar la aplicación
CMD ["npm", "start"]
