# Usar una imagen base más completa que incluye las dependencias necesarias
FROM ghcr.io/puppeteer/puppeteer:21.5.2

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
