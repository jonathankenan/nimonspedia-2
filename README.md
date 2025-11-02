
# Nimonspedia 🍌🛒

## Deskripsi Aplikasi Web
Nimonspedia adalah platform marketplace web yang memungkinkan pembeli dan penjual untuk melakukan transaksi produk secara online. Fitur utama meliputi:
- Registrasi dan login sebagai pembeli atau penjual
- Dashboard pembeli dan penjual
- Manajemen produk oleh penjual
- Keranjang belanja dan riwayat pesanan pembeli
- Manajemen pesanan oleh penjual
- Filter dan pencarian produk

## Requirement
- Docker
- PHP 8.x
- MySQL 8.x
- Web Browser

## Cara Instalasi
1. Clone repository ini:
	```bash
	git clone <repo-url>
	cd milestone-1-tugas-besar-if-3110-web-based-development-k03-04
	```
2. Pastikan Docker sudah terinstall di komputer Anda.

## Cara Menjalankan Server
1. Jalankan perintah berikut di root folder:
	```bash
	docker compose up --build -d
	```
2. Buka browser dan akses:
	```
	http://localhost:8080
	```
3. Untuk query SQL manual:
	```bash
	docker exec -it nimonspedia_db mysql -u user -p -D nimonspedia -e "SELECT * FROM users;"
	# password: password
	```

## Tangkapan Layar Tampilan Aplikasi

### Landing Page
![Landing Page](screenshots/landing.png)

### Register & Login
![Login](screenshots/login.png)
![Register](screenshots/register.png)
![Register as Buyer](screenshots/register-buyer.png)
![Register as Seller](screenshots/register-seller.png)

### Dashboard Buyer
![Dashboard Buyer](screenshots/buyer-dashboard.png)

### Detail Produk
![Detail Produk](screenshots/produk-view.png)

### Detail Toko
![Detail Toko](screenshots/store-view.png)

### Keranjang (Buyer)
![Keranjang](screenshots/keranjang.png)

### Checkout (Buyer)
![Checkout](screenshots/checkout.png)

### Riwayat Pesanan (Buyer)
![Riwayat Pesanan](screenshots/order-history.png)

### Top Up (Buyer)
![Top Up](screenshots/topup.png)

### Profil Buyer
![Profil Buyer](screenshots/buyer-profile.png)

### Dashboard Seller
![Dashboard Seller](screenshots/seller-dashboard.png)

### Kelola Produk (Seller)
![Kelola Produk](screenshots/kelola-produk.png)

### Edit Produk (Seller)
![Edit Produk](screenshots/edit-produk.png)

### Hapus Produk (Seller)
![Hapus Produk](screenshots/hapus-produk.png)

### Lihat Pesanan (Seller)
![Lihat Pesanan](screenshots/lihat-pesanan.png)

### Detail Pesanan (Seller)
![Detail Pesanan](screenshots/detail-pesanan.png)

### Tambah Produk (Seller)
![Tambah Produk](screenshots/tambah-produk.png)


## Pembagian Tugas
| Nama Anggota         | NIM         | Kontribusi Utama                                    |
|---------------------|-------------|----------------------------------------------------|
| Samantha Laqueenna Ginting             | 13523138  | Seller, UIUX           |
| Jonathan Kenan Budianto             | 13523139  | Buyer            |
| Theo Kurniady              | 13523154  | Autentikasi, Database, Integrasi        |