# Kalkulator Metode Numerik - Regula Falsi 🧮

Aplikasi web interaktif untuk memecahkan persamaan non-linear menggunakan pendekatan **Metode Numerik Regula Falsi (False Position Method)**. Aplikasi ini dirancang khusus untuk mempermudah pemahaman mahasiswa mengenai iterasi numerik, lengkap dengan visualisasi tabel, dan penjelasan kecerdasan buatan (AI).

## ✨ Fitur Utama
- **MathLive Virtual Keyboard**: Input persamaan matematika persis seperti kalkulator saintifik profesional ($x^2$, $\frac{a}{b}$, dll).
- **Tabel Iterasi Interaktif**: Menampilkan proses perhitungan langkah demi langkah secara mendetail.
- **AI Groq Integration**: Menghasilkan kesimpulan dan penjelasan otomatis menggunakan AI yang sangat cepat.
- **Eksport Laporan**: Unduh hasil iterasi dalam format **Excel (.xlsx)** atau **PDF**.
- **Multi-Root Scanner**: Mampu memindai dan menemukan banyak akar sekaligus dalam satu rentang yang luas.

## 🛠️ Teknologi yang Digunakan
- **Frontend**: React 19, Vite, Tailwind CSS, MathLive
- **Backend**: Python, FastAPI, SymPy (untuk komputasi simbolik matematika)
- **Database**: Supabase (PostgreSQL) untuk riwayat kalkulasi
- **AI**: Groq API

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

Ikuti langkah-langkah di bawah ini untuk menjalankan aplikasi di komputer lokal Anda dari awal (setelah di-download/clone).

### 1. Persiapan Awal (Prerequisites)
Pastikan komputer Anda sudah terinstal:
- **Node.js** (v18 atau lebih baru) untuk menjalankan Frontend.
- **Python** (v3.10 atau lebih baru) untuk menjalankan Backend.
- Akun **Supabase** dan **Groq API** untuk fitur riwayat dan analisis AI.

---

### 2. Konfigurasi Backend (Python / FastAPI)

Buka terminal dan masuk ke direktori `backend`:
```bash
cd backend
```

**Buat Virtual Environment & Install Dependensi:**
```bash
# Pengguna Mac/Linux:
python -m venv venv
source venv/bin/activate

# Pengguna Windows:
python -m venv venv
venv\Scripts\activate

# Install semua library yang dibutuhkan
pip install -r requirements.txt
```

**Atur Environment Variables:**
Buat file bernama `.env` di dalam folder `backend` dan isi dengan konfigurasi berikut:
```env
SUPABASE_URL=url_supabase_anda
SUPABASE_KEY=anon_key_supabase_anda
GROQ_API_KEY=api_key_groq_anda
```

**Jalankan Server Backend:**
```bash
uvicorn main:app --reload --port 8000
```
*(Backend akan berjalan dan dapat diakses API-nya di `http://localhost:8000`)*

---

### 3. Konfigurasi Frontend (React / Vite)

Buka terminal baru (biarkan terminal backend tetap berjalan) dan masuk ke direktori `frontend`:
```bash
cd frontend
```

**Install Dependensi:**
```bash
npm install
```

**Jalankan Server Frontend:**
```bash
npm run dev
```
*(Aplikasi web akan terbuka secara otomatis dan dapat diakses di `http://localhost:5173`)*

---

## 🔄 Alur Kerja (Flowchart) Metode Regula Falsi

Berikut adalah diagram alir (*flowchart*) dari logika algoritma komputasi di dalam sistem *backend*:

![Flowchart Regula Falsi](./frontend/public/Metode%20Numerik_Regula%20Falsi.drawio.png)
