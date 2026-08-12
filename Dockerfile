FROM php:8.2-apache

RUN docker-php-ext-install pdo pdo_sqlite

RUN a2enmod rewrite

# Copiar todo el código al contenedor
COPY . /var/www/html/

# Configurar DocumentRoot a public/
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Configurar un alias para que /api apunte a /var/www/html/api
RUN echo "Alias /api /var/www/html/api" >> /etc/apache2/apache2.conf
RUN echo "<Directory /var/www/html/api>" >> /etc/apache2/apache2.conf
RUN echo "    Options Indexes FollowSymLinks" >> /etc/apache2/apache2.conf
RUN echo "    AllowOverride All" >> /etc/apache2/apache2.conf
RUN echo "    Require all granted" >> /etc/apache2/apache2.conf
RUN echo "</Directory>" >> /etc/apache2/apache2.conf

# Instalar Composer y dependencias
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
RUN composer install --no-dev

EXPOSE 80

CMD ["apache2-foreground"]
