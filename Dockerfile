# Usa la imagen oficial de PHP CLI (sin Apache)
FROM php:8.2-cli

# Instala dependencias del sistema y la extensión SQLite
RUN apt-get update && apt-get install -y \
        libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/* \
    && docker-php-ext-install pdo pdo_sqlite

# Copia todo el código del proyecto
COPY . /app
WORKDIR /app

# Crea el directorio para la base de datos persistente
RUN mkdir -p /data && chmod 777 /data

# Expone el puerto 80 (Render asignará uno dinámico)
EXPOSE 80

# Inicia el servidor PHP con el router
CMD php -S 0.0.0.0:$PORT router.php
