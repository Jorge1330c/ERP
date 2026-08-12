FROM php:8.2-apache

# 1. Instalar dependencias del sistema (incluyendo SQLite)
RUN apt-get update && apt-get install -y \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Instalar extensiones PHP (ahora sí funcionará)
RUN docker-php-ext-install pdo pdo_sqlite

# 3. Habilitar mod_rewrite
RUN a2enmod rewrite

# 4. Copiar todo el código al contenedor
COPY . /var/www/html/

# 5. Configurar DocumentRoot a public/
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# 6. (Opcional) Si mantienes api/ fuera de public/, agrega alias
# Si moviste api/ dentro de public/, comenta o elimina estas líneas
RUN echo "Alias /api /var/www/html/api" >> /etc/apache2/apache2.conf
RUN echo "<Directory /var/www/html/api>" >> /etc/apache2/apache2.conf
RUN echo "    Options Indexes FollowSymLinks" >> /etc/apache2/apache2.conf
RUN echo "    AllowOverride All" >> /etc/apache2/apache2.conf
RUN echo "    Require all granted" >> /etc/apache2/apache2.conf
RUN echo "</Directory>" >> /etc/apache2/apache2.conf

# 7. Instalar Composer y dependencias PHP
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
RUN composer install --no-dev

EXPOSE 80

CMD ["apache2-foreground"]
