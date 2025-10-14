# Gunakan image PHP + Apache
FROM php:8.3-apache

# Install ekstensi PHP yang dibutuhkan
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Aktifkan mod_rewrite agar routing bisa fleksibel
RUN a2enmod rewrite

# Copy source code ke dalam container
COPY ./php/src /var/www/html

# Set direktori kerja default
WORKDIR /var/www/html

# Buka port 80 di dalam container
EXPOSE 80

# Jalankan Apache
CMD ["apache2-foreground"]
