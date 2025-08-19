# Etapa 1: Compilar el frontend de React
# Usamos una imagen "alpine" de Node.js porque es muy ligera.
FROM node:20-alpine AS builder

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de manifiesto del frontend para instalar dependencias primero.
# Esto aprovecha la caché de Docker y acelera las compilaciones futuras.
COPY frontend/package.json frontend/package-lock.json ./frontend/

# Entramos a la carpeta del frontend y ejecutamos npm install
WORKDIR /app/frontend
RUN npm install

# Copiamos el resto del código fuente del frontend
COPY frontend/ .

# Compilamos el frontend para producción.
# Esto generará una carpeta 'dist' con los archivos estáticos.
RUN npm run build


# Etapa 2: Crear la imagen final con la aplicación de Python
# Usamos una imagen "slim" de Python, que es más pequeña que la estándar.
FROM python:3.11-slim

# Establecemos el directorio de trabajo
WORKDIR /app

# Establecemos variables de entorno para Python
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Copiamos el archivo de requerimientos de Python e instalamos las dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el código del backend y los archivos de datos necesarios
COPY backend/ ./backend/
COPY "backend/Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx" ./backend/
COPY consumos_electrodomesticos.json ./

# Copiamos los archivos del frontend compilados desde la etapa 'builder'
# Los colocamos en una nueva carpeta 'dist' en nuestra imagen final
COPY --from=builder /app/frontend/dist ./dist

# Exponemos el puerto en el que correrá la aplicación
EXPOSE 8000

# El comando para iniciar la aplicación usando Gunicorn
# Inicia 2 'workers' para manejar las solicitudes.
# El punto de entrada es el objeto 'app' en el archivo 'backend.py' del módulo 'backend'.
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "backend.backend:app"]
