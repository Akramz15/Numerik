from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import utils
import pandas as pd
import io


from typing import Optional
from supabase import create_client, Client

import os
import tempfile

# Muat variabel dari .env secara presisi dari direktori backend
current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(current_dir, ".env"), override=True)

# Force temporary files to use the D: drive because C: drive is 100% full on Windows/Local!
if os.name == "nt" and os.path.exists("d:/UNY"):
    temp_dir = "d:/UNY/Semester 4/Metode Numerik/regula-falsi-app/backend/temp"
    os.environ["TEMP"] = temp_dir
    os.environ["TMP"] = temp_dir
    os.environ["TMPDIR"] = temp_dir
    tempfile.tempdir = temp_dir
    os.makedirs(temp_dir, exist_ok=True)
else:
    # On Vercel or cloud Linux, use system /tmp
    temp_dir = tempfile.gettempdir()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Optional[Client] = None
if (
    SUPABASE_URL
    and SUPABASE_KEY
    and "YOUR_SUPABASE" not in SUPABASE_URL
    and "YOUR_SUPABASE" not in SUPABASE_KEY
):
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase client initialized successfully!")
    except Exception as e:
        print(f"Failed to initialize Supabase client: {str(e)}")
else:
    print(
        "Supabase credentials not configured yet. Running without Supabase integration."
    )

app = FastAPI(title="Regula Falsi API", version="1.0")

# Konfigurasi CORS agar frontend React (localhost:5173) bisa mengakses API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Di produksi, batasi ke URL frontend Anda
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SingleRootRequest(BaseModel):
    fungsi: str
    a: float
    b: float
    epsilon: float
    user_id: Optional[str] = None


class MultiRootRequest(BaseModel):
    fungsi: str
    range_min: float
    range_max: float
    epsilon: float
    step: float = 0.5
    user_id: Optional[str] = None


@app.get("/")
def read_root():
    return {"message": "Welcome to Regula Falsi API"}


@app.post("/api/calculate-single")
def calculate_single_root(req: SingleRootRequest):
    result = utils.regula_falsi_single(req.fungsi, req.a, req.b, req.epsilon)
    if isinstance(result, dict) and result.get("status") == "error":
        raise HTTPException(status_code=400, detail=str(result.get("message", "Error")))

    # Generate penjelasan AI untuk iterasi pertama
    iterations = result.get("iterations") if isinstance(result, dict) else None
    if isinstance(iterations, list) and len(iterations) > 0:
        first = iterations[0]
        if isinstance(first, dict):
            a_val = float(first.get("a", req.a))
            b_val = float(first.get("b", req.b))
            fa_val = float(first.get("fa", 0.0))
            fb_val = float(first.get("fb", 0.0))
            xr_val = float(first.get("xr", 0.0))
            fxr_val = float(first.get("fxr", 0.0))

            ai_exp = utils.generate_ai_explanation(
                req.fungsi, a_val, b_val, fa_val, fb_val, xr_val, fxr_val, req.epsilon
            )
            result["ai_explanation"] = ai_exp
    else:
        if isinstance(result, dict):
            result["ai_explanation"] = (
                "Perhitungan selesai secara instan pada batas interval."
            )

    if isinstance(result, dict) and result.get("status") == "success" and supabase:
        try:
            import uuid
            from pdf_generator import generate_regula_falsi_pdf

            # Type-safe extraction to satisfy linter
            root_val = result.get("root", 0.0)
            root_float = float(root_val) if isinstance(root_val, (int, float)) else 0.0

            iter_val = result.get("iterations", [])
            iterations_list = list(iter_val) if isinstance(iter_val, list) else []

            ai_exp_val = result.get("ai_explanation", "")
            ai_explanation_str = ai_exp_val if isinstance(ai_exp_val, str) else ""

            pdf_bytes = generate_regula_falsi_pdf(
                fungsi=req.fungsi,
                a=req.a,
                b=req.b,
                epsilon=req.epsilon,
                root=root_float,
                iterations=iterations_list,
                ai_explanation=ai_explanation_str,
            )
            pdf_filename = f"single_{uuid.uuid4().hex[:8]}.pdf"

            supabase.storage.from_("reports").upload(
                path=pdf_filename,
                file=pdf_bytes,
                file_options={"content-type": "application/pdf"},
            )
            pdf_public_url = supabase.storage.from_("reports").get_public_url(
                pdf_filename
            )

            # Generate and upload Excel too
            from excel_generator import generate_single_excel

            excel_bytes = generate_single_excel(
                fungsi=req.fungsi,
                a=req.a,
                b=req.b,
                epsilon=req.epsilon,
                root=root_float,
                iterations=iterations_list,
            )
            excel_filename = f"single_{uuid.uuid4().hex[:8]}.xlsx"
            supabase.storage.from_("reports").upload(
                path=excel_filename,
                file=excel_bytes,
                file_options={
                    "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                },
            )
            excel_public_url = supabase.storage.from_("reports").get_public_url(
                excel_filename
            )

            combined_url = f"{pdf_public_url}|{excel_public_url}"

            supabase.table("history").insert(
                {
                    "file_name": f"single_root_{req.fungsi}",
                    "report_url": combined_url,
                    "total_equations": 1,
                    "success_count": 1,
                    "fail_count": 0,
                    "user_id": req.user_id,
                }
            ).execute()
        except Exception as upload_e:
            print(
                f"Failed to auto-upload single root calculation to Supabase: {str(upload_e)}"
            )

    return result


@app.post("/api/calculate-multi")
def calculate_multi_root(req: MultiRootRequest):
    result = utils.regula_falsi_multi_root(
        req.fungsi, req.range_min, req.range_max, req.epsilon, req.step
    )
    if isinstance(result, dict) and result.get("status") == "error":
        raise HTTPException(status_code=400, detail=str(result.get("message", "Error")))

    # Generate penjelasan AI untuk masing-masing akar yang terdeteksi
    roots = result.get("roots") if isinstance(result, dict) else None
    if isinstance(roots, list):
        for root_item in roots:
            if isinstance(root_item, dict):
                data = root_item.get("data")
                if isinstance(data, dict):
                    iterations = data.get("iterations")
                    if isinstance(iterations, list) and len(iterations) > 0:
                        first = iterations[0]
                        if isinstance(first, dict):
                            a_val = float(first.get("a", req.range_min))
                            b_val = float(first.get("b", req.range_max))
                            fa_val = float(first.get("fa", 0.0))
                            fb_val = float(first.get("fb", 0.0))
                            xr_val = float(first.get("xr", 0.0))
                            fxr_val = float(first.get("fxr", 0.0))

                            ai_exp = utils.generate_ai_explanation(
                                req.fungsi,
                                a_val,
                                b_val,
                                fa_val,
                                fb_val,
                                xr_val,
                                fxr_val,
                                req.epsilon,
                            )
                            root_item["ai_explanation"] = ai_exp
                        else:
                            root_item["ai_explanation"] = (
                                "Gagal memproses penjelasan: iterasi tidak valid."
                            )
                    else:
                        root_item["ai_explanation"] = (
                            "Perhitungan selesai secara instan."
                        )
                else:
                    root_item["ai_explanation"] = "Tidak ada data iterasi."

    if isinstance(roots, list) and len(roots) > 0 and supabase:
        try:
            import uuid
            from pdf_generator import generate_batch_pdf

            pdf_results = []
            for idx, r in enumerate(roots):
                if isinstance(r, dict):
                    data = r.get("data", {})
                    interval_vals = r.get("interval", [req.range_min, req.range_max])
                    pdf_results.append(
                        {
                            "no": idx + 1,
                            "fungsi": req.fungsi,
                            "a": (
                                float(interval_vals[0])
                                if len(interval_vals) > 0
                                else req.range_min
                            ),
                            "b": (
                                float(interval_vals[1])
                                if len(interval_vals) > 1
                                else req.range_max
                            ),
                            "epsilon": req.epsilon,
                            "status": "success",
                            "root": float(r.get("root", 0.0)),
                            "iterations": (
                                data.get("iterations", [])
                                if isinstance(data, dict)
                                else []
                            ),
                            "ai_explanation": r.get("ai_explanation", ""),
                        }
                    )

            ai_summary = utils.generate_batch_ai_summary(
                pdf_results, len(pdf_results), 0
            )
            pdf_bytes = generate_batch_pdf(pdf_results, ai_summary)
            pdf_filename = f"multi_{uuid.uuid4().hex[:8]}.pdf"

            supabase.storage.from_("reports").upload(
                path=pdf_filename,
                file=pdf_bytes,
                file_options={"content-type": "application/pdf"},
            )
            pdf_public_url = supabase.storage.from_("reports").get_public_url(
                pdf_filename
            )

            # Generate and upload Excel too
            from excel_generator import generate_batch_excel

            excel_bytes = generate_batch_excel(pdf_results)
            excel_filename = f"multi_{uuid.uuid4().hex[:8]}.xlsx"
            supabase.storage.from_("reports").upload(
                path=excel_filename,
                file=excel_bytes,
                file_options={
                    "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                },
            )
            excel_public_url = supabase.storage.from_("reports").get_public_url(
                excel_filename
            )

            combined_url = f"{pdf_public_url}|{excel_public_url}"

            supabase.table("history").insert(
                {
                    "file_name": f"multi_root_{req.fungsi}",
                    "report_url": combined_url,
                    "total_equations": len(pdf_results),
                    "success_count": len(pdf_results),
                    "fail_count": 0,
                    "user_id": req.user_id,
                }
            ).execute()
        except Exception as upload_e:
            print(
                f"Failed to auto-upload multi root calculation to Supabase: {str(upload_e)}"
            )

    return result


@app.post("/api/upload-excel")
async def upload_excel(
    file: UploadFile = File(...), user_id: Optional[str] = Form(None)
):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))

        # Clean column names
        df.columns = [c.strip().lower() for c in df.columns]

        # Check required columns
        required_cols = ["fungsi", "a", "b", "epsilon"]
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"File Excel kekurangan kolom: {', '.join(missing)}",
            )

        results = []
        success_count = 0
        fail_count = 0
        row_no = 0

        for _, row in df.iterrows():
            row_no += 1
            fungsi = str(row["fungsi"]).strip()

            # Clean Indonesian separators
            a_val_str = str(row["a"]).replace(",", ".")
            b_val_str = str(row["b"]).replace(",", ".")
            eps_val_str = str(row["epsilon"]).replace(",", ".")

            try:
                a = float(a_val_str)
                b = float(b_val_str)
                epsilon = float(eps_val_str)
            except ValueError:
                results.append(
                    {
                        "no": row_no,
                        "fungsi": fungsi,
                        "a": a_val_str,
                        "b": b_val_str,
                        "epsilon": eps_val_str,
                        "status": "error",
                        "message": "Batas interval atau epsilon bukan desimal angka yang valid.",
                    }
                )
                fail_count += 1
                continue

            res = utils.regula_falsi_single(fungsi, a, b, epsilon)

            if isinstance(res, dict) and res.get("status") == "success":
                root_val = res.get("root", 0.0)
                root_float = (
                    float(root_val) if isinstance(root_val, (int, float)) else 0.0
                )

                results.append(
                    {
                        "no": row_no,
                        "fungsi": fungsi,
                        "a": a,
                        "b": b,
                        "epsilon": epsilon,
                        "status": "success",
                        "root": root_float,
                        "iterations_count": len(res.get("iterations", [])),
                        "iterations": res.get("iterations", []),
                    }
                )
                success_count += 1
            else:
                results.append(
                    {
                        "no": row_no,
                        "fungsi": fungsi,
                        "a": a,
                        "b": b,
                        "epsilon": epsilon,
                        "status": "error",
                        "message": str(
                            res.get("message", "Terjadi kesalahan kalkulasi.")
                        ),
                    }
                )
                fail_count += 1

        ai_summary = utils.generate_batch_ai_summary(results, success_count, fail_count)

        pdf_public_url = ""
        if supabase:
            try:
                import uuid
                from pdf_generator import generate_batch_pdf

                pdf_bytes = generate_batch_pdf(results, ai_summary)
                pdf_filename = f"report_{uuid.uuid4().hex[:8]}.pdf"

                # Upload bytes directly to Supabase storage
                supabase.storage.from_("reports").upload(
                    path=pdf_filename,
                    file=pdf_bytes,
                    file_options={"content-type": "application/pdf"},
                )

                # Get public url
                pdf_public_url = supabase.storage.from_("reports").get_public_url(
                    pdf_filename
                )

                # Generate and upload Excel too
                from excel_generator import generate_batch_excel

                excel_bytes = generate_batch_excel(results)
                excel_filename = f"report_{uuid.uuid4().hex[:8]}.xlsx"
                supabase.storage.from_("reports").upload(
                    path=excel_filename,
                    file=excel_bytes,
                    file_options={
                        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    },
                )
                excel_public_url = supabase.storage.from_("reports").get_public_url(
                    excel_filename
                )

                combined_url = f"{pdf_public_url}|{excel_public_url}"

                # Try to save to history table
                try:
                    supabase.table("history").insert(
                        {
                            "file_name": file.filename,
                            "report_url": combined_url,
                            "total_equations": len(df),
                            "success_count": success_count,
                            "fail_count": fail_count,
                            "user_id": user_id,
                        }
                    ).execute()
                except Exception as db_e:
                    print(
                        f"Failed to insert database log in history table: {str(db_e)}"
                    )
            except Exception as upload_e:
                print(f"Failed to upload batch PDF to Supabase: {str(upload_e)}")

        return {
            "status": "success",
            "total_uploaded": len(df),
            "success_count": success_count,
            "fail_count": fail_count,
            "results": results,
            "ai_summary": ai_summary,
            "download_url": pdf_public_url,
        }

    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Gagal membaca file Excel: {str(e)}"
        )


@app.get("/api/download-template")
def download_template():
    data = {
        "Fungsi": ["x^3 - x - 1", "cos(x) - x", "x^2 - 4"],
        "a": [1.0, 0.0, -3.0],
        "b": [2.0, 1.0, -1.0],
        "epsilon": [0.0001, 0.00001, 0.001],
    }
    df = pd.DataFrame(data)

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Template Regula Falsi")

    output.seek(0)

    headers = {
        "Content-Disposition": 'attachment; filename="template_regula_falsi.xlsx"'
    }
    return StreamingResponse(
        output,
        headers=headers,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


class ExportPDFRequest(BaseModel):
    fungsi: str
    a: float
    b: float
    epsilon: float
    root: float
    iterations: list
    ai_explanation: str


@app.post("/api/export-pdf")
def export_pdf(req: ExportPDFRequest):
    try:
        import datetime
        from pdf_generator import generate_regula_falsi_pdf

        pdf_bytes = generate_regula_falsi_pdf(
            fungsi=req.fungsi,
            a=req.a,
            b=req.b,
            epsilon=req.epsilon,
            root=req.root,
            iterations=req.iterations,
            ai_explanation=req.ai_explanation,
        )

        filename = (
            f"laporan_regula_falsi_{int(datetime.datetime.now().timestamp())}.pdf"
        )
        headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
        return StreamingResponse(
            io.BytesIO(pdf_bytes), headers=headers, media_type="application/pdf"
        )
    except Exception as e:
        import traceback

        with open("pdf_error_log.txt", "w") as f:
            f.write(traceback.format_exc())
        raise HTTPException(
            status_code=400, detail=f"Gagal menghasilkan laporan PDF: {str(e)}"
        )


class ExportBatchPDFRequest(BaseModel):
    results: list
    ai_summary: str


@app.post("/api/export-batch-pdf")
def export_batch_pdf(req: ExportBatchPDFRequest):
    try:
        import datetime
        from pdf_generator import generate_batch_pdf

        pdf_bytes = generate_batch_pdf(req.results, req.ai_summary)

        filename = (
            f"laporan_batch_regula_falsi_{int(datetime.datetime.now().timestamp())}.pdf"
        )
        headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
        return StreamingResponse(
            io.BytesIO(pdf_bytes), headers=headers, media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Gagal menghasilkan laporan PDF Batch: {str(e)}"
        )


class ExportBatchExcelRequest(BaseModel):
    results: list


@app.post("/api/export-batch-excel")
def export_batch_excel(req: ExportBatchExcelRequest):
    try:
        import datetime
        from excel_generator import generate_batch_excel

        excel_bytes = generate_batch_excel(req.results)

        filename = (
            f"hasil_batch_regula_falsi_{int(datetime.datetime.now().timestamp())}.xlsx"
        )
        headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
        return StreamingResponse(
            io.BytesIO(excel_bytes),
            headers=headers,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Gagal menghasilkan berkas Excel Batch: {str(e)}"
        )


class ExportSingleExcelRequest(BaseModel):
    fungsi: str
    a: float
    b: float
    epsilon: float
    root: float
    iterations: list


@app.post("/api/export-single-excel")
def export_single_excel(req: ExportSingleExcelRequest):
    try:
        import datetime
        from excel_generator import generate_single_excel

        excel_bytes = generate_single_excel(
            fungsi=req.fungsi,
            a=req.a,
            b=req.b,
            epsilon=req.epsilon,
            root=req.root,
            iterations=req.iterations,
        )

        filename = f"hasil_regula_falsi_{int(datetime.datetime.now().timestamp())}.xlsx"
        headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
        return StreamingResponse(
            io.BytesIO(excel_bytes),
            headers=headers,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Gagal menghasilkan berkas Excel: {str(e)}"
        )


@app.get("/api/history")
def get_history(user_id: Optional[str] = None):
    if not supabase:
        return []
    if not user_id:
        return []
    try:
        res = (
            supabase.table("history")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Gagal mengambil riwayat: {str(e)}"
        )


@app.delete("/api/history/{item_id}")
def delete_history_item(item_id: int):
    if not supabase:
        raise HTTPException(status_code=400, detail="Database tidak terhubung.")
    try:
        # Fetch item first to read URLs
        res = supabase.table("history").select("*").eq("id", item_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Riwayat tidak ditemukan.")

        item = res.data[0]
        report_url = ""
        if isinstance(item, dict):
            val = item.get("report_url")
            if isinstance(val, str):
                report_url = val

        # Parse and extract file names from URL to delete from storage
        files_to_delete = []
        if isinstance(report_url, str) and report_url:
            parts = report_url.split("|")
            for url in parts:
                if "/reports/" in url:
                    filename = url.split("/reports/")[-1]
                    if filename:
                        files_to_delete.append(filename)

        # Delete files from Supabase storage "reports" bucket
        if files_to_delete:
            try:
                supabase.storage.from_("reports").remove(files_to_delete)
                print(
                    f"Successfully deleted associated storage files: {files_to_delete}"
                )
            except Exception as storage_e:
                print(f"Failed to delete associated storage files: {str(storage_e)}")

        # Delete database row
        supabase.table("history").delete().eq("id", item_id).execute()
        return {
            "status": "success",
            "message": "Riwayat dan berkas terkait berhasil dihapus secara permanen",
        }
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Gagal menghapus riwayat: {str(e)}"
        )
