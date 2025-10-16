FROM php:8.3-apache

RUN docker-php-ext-install mysqli && docker-php-ext-enable mysqli

# Set DocumentRoot ke folder public
RUN sed -i 's|/var/www/html|/var/www/html/public|g' /etc/apache2/sites-available/000-default.conf

# Aktifkan mod_rewrite + izinkan .htaccess
RUN a2enmod rewrite \
    && echo '<Directory /var/www/html/public>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-available/nimonspedia.conf \
    && a2enconf nimonspedia

# Nonaktifkan opcache supaya reload realtime
RUN echo "opcache.enable=0" >> /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini

EXPOSE 80
CMD ["apache2-foreground"]
