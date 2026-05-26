import sympy as sp
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
)
import httpx
import os
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(current_dir, ".env"), override=True)


def evaluate_function(func_str, x_val):
    # Menggunakan sympy untuk mengubah string fungsi menjadi ekspresi matematika yang bisa dieksekusi
    # Mengganti karakter '^' dengan '**' untuk kegunaan matematika Python standar
    cleaned_func = func_str.replace("^", "**")
    x = sp.Symbol("x")
    transformations = standard_transformations + (implicit_multiplication_application,)
    expr = parse_expr(cleaned_func, transformations=transformations)
    return float(expr.subs(x, x_val))


def regula_falsi_single(func_str, a, b, epsilon, max_iter=100):
    try:
        # Pre-process string fungsi untuk kemudahan input (misal user ketik x^2 - 4)
        func_str_cleaned = func_str.replace("^", "**")

        fa = evaluate_function(func_str_cleaned, a)
        fb = evaluate_function(func_str_cleaned, b)

        # Cek jika batas adalah akar langsung
        if abs(fa) < 1e-12:
            return {
                "status": "success",
                "root": a,
                "iterations": [
                    {
                        "iterasi": 1,
                        "a": a,
                        "b": b,
                        "xr": a,
                        "fa": fa,
                        "fb": fb,
                        "fxr": fa,
                        "error": 0.0,
                    }
                ],
            }
        if abs(fb) < 1e-12:
            return {
                "status": "success",
                "root": b,
                "iterations": [
                    {
                        "iterasi": 1,
                        "a": a,
                        "b": b,
                        "xr": b,
                        "fa": fa,
                        "fb": fb,
                        "fxr": fb,
                        "error": 0.0,
                    }
                ],
            }

        # 1. Validasi Interval Otomatis
        if fa * fb > 0:
            return {
                "status": "error",
                "message": f"Interval tidak valid. f({a}) = {fa:.4f} dan f({b}) = {fb:.4f} memiliki tanda yang sama (tidak mengurung akar).",
            }

        iterations = []
        step = 1
        condition = True

        # Simpan nilai awal a dan b yang dapat bergeser
        current_a = a
        current_b = b
        current_fa = fa
        current_fb = fb

        xr = a  # Inisialisasi default agar terhindar dari linter warning

        while condition and step <= max_iter:
            # Rumus Regula Falsi
            # Menghindari pembagian dengan nol jika fa == fb
            if abs(current_fa - current_fb) < 1e-15:
                break

            xr = current_b - (current_fb * (current_a - current_b)) / (
                current_fa - current_fb
            )
            fxr = evaluate_function(func_str_cleaned, xr)

            error = abs(fxr)

            iterations.append(
                {
                    "iterasi": step,
                    "a": current_a,
                    "b": current_b,
                    "xr": xr,
                    "fa": current_fa,
                    "fb": current_fb,
                    "fxr": fxr,
                    "error": error,
                }
            )

            # Pengecekan toleransi epsilon
            if error <= epsilon:
                condition = False
            else:
                # Update interval
                if current_fa * fxr < 0:
                    current_b = xr
                    current_fb = fxr
                else:
                    current_a = xr
                    current_fa = fxr
            step += 1

        return {"status": "success", "root": xr, "iterations": iterations}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def regula_falsi_multi_root(func_str, range_min, range_max, epsilon, step=0.5):
    # Melakukan scanning untuk mencari sub-interval yang valid
    akar_ditemukan = []
    current = range_min
    func_str_cleaned = func_str.replace("^", "**")

    while current < range_max:
        a = current
        b = current + step
        if b > range_max:
            b = range_max

        try:
            fa = evaluate_function(func_str_cleaned, a)
            fb = evaluate_function(func_str_cleaned, b)

            # Terjadi perubahan tanda atau salah satu batas adalah akar
            if fa * fb <= 0 or abs(fa) < 1e-12 or abs(fb) < 1e-12:
                res = regula_falsi_single(func_str_cleaned, a, b, epsilon)
                if res["status"] == "success":
                    # Hindari akar duplikat
                    is_duplicate = False
                    for existing_root in akar_ditemukan:
                        if abs(existing_root["root"] - res["root"]) < 1e-4:
                            is_duplicate = True
                            break
                    if not is_duplicate:
                        akar_ditemukan.append(
                            {"interval": [a, b], "root": res["root"], "data": res}
                        )
        except Exception:
            pass
        current += step

    return {"status": "success", "roots": akar_ditemukan}


def generate_ai_explanation(func_str, a, b, fa, fb, xr, fxr, epsilon):
    api_key = os.environ.get("GROQ_API_KEY")

    # 1. Narasi lokal deterministic sebagai fallback jika API Key tidak ada atau error
    fallback_narration = f"""### 💡 Langkah Kerja Aritmatika Manual (Iterasi 1):

1. **Inisialisasi Selang**:
   Diuji selang awal $[a, b] = [{a:.5f}, {b:.5f}]$ dengan toleransi error $\\epsilon = {epsilon}$.

2. **Evaluasi Batas Selang**:
   Substitusi batas atas dan batas bawah ke dalam fungsi $f(x) = {func_str}$:
   * $f(a) = f({a:.5f}) = {fa:.5f}$
   * $f(b) = f({b:.5f}) = {fb:.5f}$

3. **Verifikasi Teorema Nilai Antara**:
   Perkalian tanda $f(a) \\cdot f(b) = ({fa:.5f}) \\cdot ({fb:.5f}) = {fa*fb:.5f}$.
   Karena $f(a) \\cdot f(b) < 0$, maka tanda berlawanan. Teorema ini menjamin adanya setidaknya satu akar nyata di dalam selang $[{a:.5f}, {b:.5f}]$.

4. **Komputasi Akar Regula Falsi ($x_r$)**:
   Menggunakan garis potong secant untuk mencari hampiran akar pertama:
   $$x_r = b - \\frac{{f(b) \\cdot (a - b)}}{{f(a) - f(b)}}$$
   $$x_r = {b:.5f} - \\frac{{{fb:.5f} \\cdot ({a:.5f} - {b:.5f})}}{{{fa:.5f} - {fb:.5f}}} = {xr:.5f}$$

5. **Evaluasi Toleransi**:
   Didapatkan nilai fungsi hampiran $f(x_r) = f({xr:.5f}) = {fxr:.5f}$.
   Error hampiran saat ini adalah $|f(x_r)| = {abs(fxr):.5f}$. Langkah selanjutnya akan mempersempit selang berdasarkan tanda dari $f(x_r)$."""

    if (
        not api_key
        or "YOUR_" in api_key
        or api_key == "YOUR_GROQ_API_KEY_HERE"
        or api_key.strip() == ""
    ):
        return fallback_narration

    try:
        # Prompt untuk Groq Llama 3.1
        prompt = f"""
        Anda adalah asisten akademis Metode Numerik profesional. Jelaskan komputasi langkah pertama metode Regula Falsi dengan sangat rapi, ringkas, dan indah.
        
        DATA RIIL & VALID (GUNAKAN ANGKA INI SECARA AKURAT, JANGAN DIUBAH ATAU DIHITUNG ULANG):
        - Fungsi f(x): {func_str}
        - Batas Bawah a: {a}
        - Batas Atas b: {b}
        - f(a): {fa}
        - f(b): {fb}
        - Nilai hampiran akar xr: {xr}
        - f(xr): {fxr}
        - Toleransi Epsilon: {epsilon}
        
        ATURAN FORMAT (WAJIB):
        1. JANGAN PERNAH gunakan garis bawah '===' atau '---' untuk membuat judul. Selalu gunakan tag modern seperti '###' atau '####' untuk judul bagian.
        2. Berikan penjelasan yang padat dan langsung fokus ke langkah-langkah numerik. Hindari basa-basi pendahuluan atau kesimpulan yang terlalu panjang dan bertele-tele.
        3. Gunakan notasi matematika LaTeX standard yang rapi ($...$ untuk inline, $$...$$ untuk block rumus).
        4. Tuliskan dalam Bahasa Indonesia yang formal, sopan, dan mudah dipahami mahasiswa.
        5. Susun penjelasan dalam 4 langkah utama yang ringkas:
           - ### 1. Batas & Evaluasi Selang
           - ### 2. Cek Teorema Nilai Antara ($f(a) \\cdot f(b) < 0$)
           - ### 3. Rumus & Substitusi Regula Falsi ($x_r$)
           - ### 4. Evaluasi Hasil & Nilai Error
        """

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {
                    "role": "system",
                    "content": "Anda adalah asisten virtual akademis metode numerik yang profesional dan komunikatif.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }

        response = httpx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=15.0,
        )

        if response.status_code == 200:
            res_json = response.json()
            return res_json["choices"][0]["message"]["content"]
        else:
            return fallback_narration
    except Exception:
        return fallback_narration


def generate_batch_ai_summary(results, success_count, fail_count):
    api_key = os.environ.get("GROQ_API_KEY")

    # 1. Fallback lokal ringkasan batch
    fallback_summary = f"""### 📊 Analisis Batch Akademis:

*   **Total Unggahan**: {success_count + fail_count} persamaan matematika.
*   **Sukses Konvergen**: {success_count} persamaan berhasil diselesaikan hingga memenuhi batas toleransi error $\\epsilon$.
*   **Gagal Validasi**: {fail_count} persamaan mengalami kegagalan (biasanya akibat interval $[a, b]$ tebakan awal tidak memenuhi Teorema Nilai Antara $f(a) \\cdot f(b) > 0$).

### 💡 Rekomendasi Evaluasi:
Untuk persamaan yang berstatus **gagal**, disarankan untuk meninjau kembali representasi grafis fungsi atau menggunakan tab **Multiple Roots Scan** di aplikasi web untuk melacak sub-interval valid yang mengurung akar secara akurat."""

    if (
        not api_key
        or "YOUR_" in api_key
        or api_key == "YOUR_GROQ_API_KEY_HERE"
        or api_key.strip() == ""
    ):
        return fallback_summary

    try:
        # Prompt ringkasan batch untuk Groq Llama 3.1
        prompt = f"""
        Anda adalah asisten virtual akademis khusus Metode Numerik. Tugas Anda adalah memberikan analisis ringkasan dan ulasan edukatif terhadap kumpulan soal (batch) metode Regula Falsi yang diunggah oleh mahasiswa melalui file Excel.
        
        DATA RINGKASAN BATCH:
        - Total Persamaan: {success_count + fail_count}
        - Sukses: {success_count}
        - Gagal: {fail_count}
        
        DETAIL PERSAMAAN:
        {[{'no': r['no'], 'fungsi': r['fungsi'], 'status': r['status'], 'root': r.get('root', 'N/A'), 'iter': r.get('iterations_count', 'N/A')} for r in results[:10]]}
        
        PETUNJUK FORMAT:
        - Buat analisis akademis singkat, mendidik, dan formal dalam Bahasa Indonesia.
        - Gunakan Heading Markdown seperti '###' (JANGAN gunakan '===' atau '---').
        - Berikan ulasan singkat mengenai persamaan mana yang paling cepat konvergen (jumlah iterasi terkecil) dan berikan saran solusi praktis untuk persamaan yang gagal.
        - Jangan berikan ulasan per baris satu-persatu, melainkan berikan ringkasan ulasan global yang elegan.
        """

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {
                    "role": "system",
                    "content": "Anda adalah asisten virtual akademis metode numerik yang profesional dan komunikatif.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }

        response = httpx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=15.0,
        )

        if response.status_code == 200:
            res_json = response.json()
            return res_json["choices"][0]["message"]["content"]
        else:
            return fallback_summary
    except Exception:
        return fallback_summary
