# Usa la imagen oficial de PHP 8.2 con Apache
FROM php:8.2-apache

# Instala la extensión PDO para SQLite
RUN docker-php-ext-install pdo pdo_sqlite

# Habilita el módulo mod_rewrite de Apache
RUN a2enmod rewrite

# Copia todo el código del proyecto al contenedor
COPY . /var/www/html/

# Crea el directorio donde guardaremos la base de datos persistentemente
RUN mkdir -p /data && chmod 777 /data

# Configura Apache para que permita .htaccess (necesario para nuestras reglas)
RUN sed -i '/<Directory \/var\/www\/html>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

# Exponer el puerto 80 (Render asignará uno dinámico)
EXPOSE 80
