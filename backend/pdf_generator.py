import io
import datetime
import re
import html
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        getattr(self, "_startPage")()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        page_num = int(getattr(self, "_pageNumber", 1))
        if page_num == 1:
            return  # Skip page number on cover page
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header
        self.drawString(54, 750, "Laporan Komputasi Metode Numerik — Regula Falsi")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 742, 558, 742)

        # Footer
        page_text = f"Halaman {page_num} dari {page_count}"
        self.drawRightString(558, 40, page_text)
        self.drawString(54, 40, "Teknologi Informasi - Universitas Negeri Yogyakarta")
        self.line(54, 52, 558, 52)

        self.restoreState()


def clean_markdown_for_pdf(text: str) -> str:
    # Escape raw text to prevent XMLSyntaxError (e.g. from '<' or '&' in AI output)
    text = html.escape(text)

    # Replace LaTeX block formulas
    text = re.sub(r"\$\$(.*?)\$\$", r"<br/><b>\1</b><br/>", text)

    # Replace LaTeX inline formulas
    text = re.sub(
        r"\$(.*?)\$", r'<font face="Helvetica-Oblique" color="#4f46e5">\1</font>', text
    )

    # Replace markdown bold
    text = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", text)

    # Replace markdown italic
    text = re.sub(r"\*(.*?)\*", r"<i>\1</i>", text)

    # Clean ATX Headers
    text = re.sub(
        r"### (.*?)(?:\n|$)",
        r'<br/><b><font size="11" color="#1e3a8a">\1</font></b><br/>',
        text,
    )
    text = re.sub(
        r"## (.*?)(?:\n|$)",
        r'<br/><b><font size="13" color="#1e3a8a">\1</font></b><br/>',
        text,
    )

    # Newlines
    text = text.replace("\n", "<br/>")
    return text


def parse_markdown_to_flowables(text: str, styles, ai_box_style) -> list:
    flowables = []

    # Custom heading styles
    heading_style = ParagraphStyle(
        "AI_Heading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1e3a8a"),
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True,
    )

    bullet_style = ParagraphStyle(
        "AI_Bullet",
        parent=ai_box_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4,
    )

    math_block_style = ParagraphStyle(
        "AI_MathBlock",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#4f46e5"),
        alignment=1,  # Center
        spaceBefore=8,
        spaceAfter=8,
        backColor=colors.HexColor("#f8fafc"),
        borderColor=colors.HexColor("#cbd5e1"),
        borderWidth=0.5,
        borderPadding=6,
    )

    # Split text into lines
    lines = text.split("\n")

    for line in lines:
        trimmed = line.strip()
        if not trimmed:
            flowables.append(Spacer(1, 4))
            continue

        # Escape XML special characters to prevent crashes
        safe_text = html.escape(trimmed)

        # 1. Block formula $$ ... $$
        if safe_text.startswith("$$") and safe_text.endswith("$$"):
            math_content = safe_text[2:-2].strip()
            flowables.append(Paragraph(math_content, math_block_style))
            continue

        # Helper to format inline styles (bold, italic, inline math)
        def format_inline(txt):
            # LaTeX inline formulas $ ... $
            txt = re.sub(
                r"\$(.*?)\$",
                r'<font face="Helvetica-Oblique" color="#4f46e5">\1</font>',
                txt,
            )
            # Markdown bold ** ... **
            txt = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", txt)
            # Markdown italic * ... *
            txt = re.sub(r"\*(.*?)\*", r"<i>\1</i>", txt)
            return txt

        # 2. ATX Headers
        if safe_text.startswith("###"):
            header_text = safe_text.replace("###", "").strip()
            flowables.append(Paragraph(format_inline(header_text), heading_style))
            continue
        elif safe_text.startswith("##"):
            header_text = safe_text.replace("##", "").strip()
            heading_medium = ParagraphStyle(
                "AI_Heading_Medium",
                parent=heading_style,
                fontSize=12,
                leading=16,
                spaceBefore=12,
            )
            flowables.append(Paragraph(format_inline(header_text), heading_medium))
            continue
        elif safe_text.startswith("#"):
            header_text = safe_text.replace("#", "").strip()
            heading_large = ParagraphStyle(
                "AI_Heading_Large",
                parent=heading_style,
                fontSize=14,
                leading=18,
                spaceBefore=15,
            )
            flowables.append(Paragraph(format_inline(header_text), heading_large))
            continue

        # 3. Bullet lists
        if safe_text.startswith("* ") or safe_text.startswith("- "):
            list_text = safe_text[2:].strip()
            flowables.append(
                Paragraph(f"&bull; {format_inline(list_text)}", bullet_style)
            )
            continue

        # 4. Numbered lists (e.g. 1. )
        num_match = re.match(r"^(\d+)\.\s(.*)", safe_text)
        if num_match:
            num = num_match.group(1)
            list_text = num_match.group(2).strip()
            flowables.append(
                Paragraph(f"<b>{num}.</b> {format_inline(list_text)}", bullet_style)
            )
            continue

        # 5. Blockquote
        if safe_text.startswith("&gt;") or safe_text.startswith(">"):
            quote_text = safe_text.replace("&gt;", "").replace(">", "").strip()
            quote_style = ParagraphStyle(
                "AI_Quote",
                parent=ai_box_style,
                leftIndent=15,
                textColor=colors.HexColor("#475569"),
                fontName="Helvetica-Oblique",
            )
            flowables.append(Paragraph(format_inline(quote_text), quote_style))
            continue

        # 6. Normal paragraph
        flowables.append(Paragraph(format_inline(safe_text), ai_box_style))

    return flowables


def generate_regula_falsi_pdf(
    fungsi: str,
    a: float,
    b: float,
    epsilon: float,
    root: float,
    iterations: list,
    ai_explanation: str,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=72,
        bottomMargin=72,
    )

    styles = getSampleStyleSheet()

    # Custom Styles
    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#1e3a8a"),
        spaceAfter=15,
    )

    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#475569"),
        spaceAfter=30,
    )

    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#1e3a8a"),
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "Body_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155"),
    )

    ai_box_style = ParagraphStyle(
        "AIBox",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#1e293b"),
    )

    story = []

    # ==================== PAGE 1: COVER ====================
    story.append(Spacer(1, 40))
    story.append(
        Paragraph(
            "LAPORAN PRAKTIKUM METODE NUMERIK",
            ParagraphStyle(
                "Upper",
                fontName="Helvetica-Bold",
                fontSize=10,
                leading=12,
                textColor=colors.HexColor("#4f46e5"),
                spaceAfter=15,
            ),
        )
    )
    story.append(
        Paragraph("KOMPUTASI PENCARIAN AKAR PERSAMAAN NON-LINIER", title_style)
    )
    story.append(
        Paragraph(
            "Implementasi Komparatif Metode Regula Falsi Menggunakan Mesin Numerik Python &amp; Narasi Pembelajaran Asisten AI Llama 3.1",
            subtitle_style,
        )
    )

    story.append(Spacer(1, 50))

    metadata_data = [
        [
            Paragraph("<b>MATA KULIAH</b>", body_style),
            Paragraph(": Metode Numerik", body_style),
        ],
        [
            Paragraph("<b>PROGRAM STUDI</b>", body_style),
            Paragraph(": Teknologi Informasi - Semester 4", body_style),
        ],
        [
            Paragraph("<b>INSTITUSI</b>", body_style),
            Paragraph(": Universitas Negeri Yogyakarta", body_style),
        ],
        [
            Paragraph("<b>METODE</b>", body_style),
            Paragraph(": Regula Falsi (Secant Palsu)", body_style),
        ],
        [
            Paragraph("<b>PERSAMAAN</b>", body_style),
            Paragraph(f": f(x) = {fungsi}", body_style),
        ],
        [
            Paragraph("<b>SELANG AWAL</b>", body_style),
            Paragraph(f": [{a}, {b}]", body_style),
        ],
        [
            Paragraph("<b>TOLERANSI</b>", body_style),
            Paragraph(f": epsilon = {epsilon}", body_style),
        ],
        [
            Paragraph("<b>HASIL AKAR</b>", body_style),
            Paragraph(f": {root:.7f}", body_style),
        ],
        [
            Paragraph("<b>TANGGAL UJI</b>", body_style),
            Paragraph(f": {datetime.date.today().strftime('%d %B %Y')}", body_style),
        ],
    ]

    meta_table = Table(metadata_data, colWidths=[130, 370])
    meta_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
            ]
        )
    )
    story.append(meta_table)

    story.append(Spacer(1, 80))
    story.append(
        Paragraph(
            "LABORATORIUM KOMPUTASI TEKNOLOGI INFORMASI<br/>UNIVERSITAS NEGERI YOGYAKARTA<br/>2026",
            ParagraphStyle(
                "Center",
                fontName="Helvetica-Bold",
                fontSize=10,
                leading=14,
                textColor=colors.HexColor("#475569"),
                alignment=1,
            ),
        )
    )

    story.append(PageBreak())

    # ==================== PAGE 2: ANALISIS AI ====================
    story.append(Paragraph("ANALISIS ALUR &amp; TINJAUAN ASISTEN VIRTUAL AI", h1_style))
    story.append(
        Paragraph(
            "Berikut adalah ulasan manual, landasan teori matematis, dan ringkasan konvergensi persamaan yang diformulasikan oleh model AI Llama 3.1 secara cerdas berdasarkan hasil iterasi:",
            body_style,
        )
    )
    story.append(Spacer(1, 10))

    ai_flowables = parse_markdown_to_flowables(ai_explanation, styles, ai_box_style)
    story.extend(ai_flowables)

    story.append(PageBreak())

    # ==================== PAGE 3: TABEL ITERASI NUMERIK ====================
    story.append(Paragraph("TABEL ITERASI &amp; LAJU KONVERGENSI NUMERIK", h1_style))
    story.append(
        Paragraph(
            f"Tabel komputasi presisi tinggi Python untuk penyelesaian f(x) = {fungsi} pada interval [{a}, {b}] dengan toleransi kesalahan epsilon = {epsilon}:",
            body_style,
        )
    )
    story.append(Spacer(1, 12))

    table_header = [
        Paragraph(
            "<b>Iterasi</b>",
            ParagraphStyle(
                "HCol",
                fontName="Helvetica-Bold",
                fontSize=9,
                textColor=colors.white,
                alignment=1,
            ),
        ),
        Paragraph(
            "<b>a</b>",
            ParagraphStyle(
                "HCol", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white
            ),
        ),
        Paragraph(
            "<b>b</b>",
            ParagraphStyle(
                "HCol", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white
            ),
        ),
        Paragraph(
            "<b>xr</b>",
            ParagraphStyle(
                "HCol", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white
            ),
        ),
        Paragraph(
            "<b>f(a)</b>",
            ParagraphStyle(
                "HCol", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white
            ),
        ),
        Paragraph(
            "<b>f(b)</b>",
            ParagraphStyle(
                "HCol", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white
            ),
        ),
        Paragraph(
            "<b>f(xr)</b>",
            ParagraphStyle(
                "HCol", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white
            ),
        ),
        Paragraph(
            "<b>Error</b>",
            ParagraphStyle(
                "HCol", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white
            ),
        ),
    ]

    table_rows = [table_header]

    for row in iterations:
        table_rows.append(
            [
                Paragraph(
                    str(row["iterasi"]),
                    ParagraphStyle(
                        "RowCol", fontName="Helvetica", fontSize=8, alignment=1
                    ),
                ),
                Paragraph(
                    f"{row['a']:.5f}",
                    ParagraphStyle("RowCol", fontName="Helvetica", fontSize=8),
                ),
                Paragraph(
                    f"{row['b']:.5f}",
                    ParagraphStyle("RowCol", fontName="Helvetica", fontSize=8),
                ),
                Paragraph(
                    f"<b>{row['xr']:.5f}</b>",
                    ParagraphStyle(
                        "RowCol",
                        fontName="Helvetica-Bold",
                        fontSize=8,
                        textColor=colors.HexColor("#2563eb"),
                    ),
                ),
                Paragraph(
                    f"{row['fa']:.5f}",
                    ParagraphStyle("RowCol", fontName="Helvetica", fontSize=8),
                ),
                Paragraph(
                    f"{row['fb']:.5f}",
                    ParagraphStyle("RowCol", fontName="Helvetica", fontSize=8),
                ),
                Paragraph(
                    f"{row['fxr']:.5f}",
                    ParagraphStyle("RowCol", fontName="Helvetica", fontSize=8),
                ),
                Paragraph(
                    f"{row['error']:.5f}",
                    ParagraphStyle("RowCol", fontName="Helvetica", fontSize=8),
                ),
            ]
        )

    iter_table = Table(table_rows, colWidths=[45, 65, 65, 65, 65, 65, 65, 65])

    table_styles = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]

    for r_idx in range(1, len(table_rows)):
        if r_idx % 2 == 0:
            table_styles.append(
                ("BACKGROUND", (0, r_idx), (-1, r_idx), colors.HexColor("#f8fafc"))
            )

    iter_table.setStyle(TableStyle(table_styles))
    story.append(iter_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()


def generate_batch_pdf(results: list, ai_summary: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=72,
        bottomMargin=72,
    )

    styles = getSampleStyleSheet()

    # Custom Styles
    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1e3a8a"),
        spaceAfter=15,
    )

    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#475569"),
        spaceAfter=30,
    )

    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1e3a8a"),
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "Body_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
    )

    ai_box_style = ParagraphStyle(
        "AIBox",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
    )

    story = []

    # ==================== PAGE 1: COVER ====================
    story.append(Spacer(1, 40))
    story.append(
        Paragraph(
            "LAPORAN PRAKTIKUM METODE NUMERIK",
            ParagraphStyle(
                "Upper",
                fontName="Helvetica-Bold",
                fontSize=10,
                leading=12,
                textColor=colors.HexColor("#4f46e5"),
                spaceAfter=15,
            ),
        )
    )
    story.append(Paragraph("KOMPUTASI BATCH PERSAMAAN NON-LINIER", title_style))
    story.append(
        Paragraph(
            "Pemrosesan Paralel Presisi Tinggi Berbasis Python &amp; Evaluasi Tinjauan Asisten AI Llama 3.1",
            subtitle_style,
        )
    )

    story.append(Spacer(1, 50))

    total_uploaded = len(results)
    success_count = sum(1 for r in results if r.get("status") == "success")
    fail_count = total_uploaded - success_count

    metadata_data = [
        [
            Paragraph("<b>MATA KULIAH</b>", body_style),
            Paragraph(": Metode Numerik", body_style),
        ],
        [
            Paragraph("<b>PROGRAM STUDI</b>", body_style),
            Paragraph(": Teknologi Informasi - Semester 4", body_style),
        ],
        [
            Paragraph("<b>INSTITUSI</b>", body_style),
            Paragraph(": Universitas Negeri Yogyakarta", body_style),
        ],
        [
            Paragraph("<b>MODE PROSES</b>", body_style),
            Paragraph(": AI Batch Excel Solver", body_style),
        ],
        [
            Paragraph("<b>TOTAL UNGGAHAN</b>", body_style),
            Paragraph(f": {total_uploaded} Persamaan", body_style),
        ],
        [
            Paragraph("<b>SUKSES KONVERGEN</b>", body_style),
            Paragraph(f": {success_count} Persamaan", body_style),
        ],
        [
            Paragraph("<b>GAGAL VALIDASI</b>", body_style),
            Paragraph(f": {fail_count} Persamaan", body_style),
        ],
        [
            Paragraph("<b>TANGGAL UJI</b>", body_style),
            Paragraph(f": {datetime.date.today().strftime('%d %B %Y')}", body_style),
        ],
    ]

    meta_table = Table(metadata_data, colWidths=[130, 370])
    meta_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
            ]
        )
    )
    story.append(meta_table)

    story.append(Spacer(1, 80))
    story.append(
        Paragraph(
            "LABORATORIUM KOMPUTASI TEKNOLOGI INFORMASI<br/>UNIVERSITAS NEGERI YOGYAKARTA<br/>2026",
            ParagraphStyle(
                "Center",
                fontName="Helvetica-Bold",
                fontSize=10,
                leading=14,
                textColor=colors.HexColor("#475569"),
                alignment=1,
            ),
        )
    )

    story.append(PageBreak())

    # ==================== PAGE 2: AI REVIEW ====================
    story.append(Paragraph("TINJAUAN &amp; EVALUASI ASISTEN BATCH AI", h1_style))
    story.append(
        Paragraph(
            "Berikut adalah ulasan evaluasi global, komparasi efisiensi konvergensi, dan saran optimasi yang diformulasikan oleh model AI Llama 3.1 berdasarkan seluruh batch data:",
            body_style,
        )
    )
    story.append(Spacer(1, 10))

    ai_flowables = parse_markdown_to_flowables(ai_summary, styles, ai_box_style)
    story.extend(ai_flowables)

    story.append(PageBreak())

    # ==================== PAGE 3: EXECUTIVE SUMMARY TABLE ====================
    story.append(Paragraph("RINGKASAN EKSEKUTIF HASIL BATCH", h1_style))
    story.append(
        Paragraph(
            "Daftar lengkap seluruh persamaan fungsi non-linier yang diproses dalam batch beserta status konvergensinya:",
            body_style,
        )
    )
    story.append(Spacer(1, 12))

    summary_header = [
        Paragraph(
            "<b>No</b>",
            ParagraphStyle(
                "HCol",
                fontName="Helvetica-Bold",
                fontSize=8,
                textColor=colors.white,
                alignment=1,
            ),
        ),
        Paragraph(
            "<b>Fungsi</b>",
            ParagraphStyle(
                "HCol", fontName="Helvetica-Bold", fontSize=8, textColor=colors.white
            ),
        ),
        Paragraph(
            "<b>Selang [a, b]</b>",
            ParagraphStyle(
                "HCol", fontName="Helvetica-Bold", fontSize=8, textColor=colors.white
            ),
        ),
        Paragraph(
            "<b>Epsilon</b>",
            ParagraphStyle(
                "HCol", fontName="Helvetica-Bold", fontSize=8, textColor=colors.white
            ),
        ),
        Paragraph(
            "<b>Status</b>",
            ParagraphStyle(
                "HCol", fontName="Helvetica-Bold", fontSize=8, textColor=colors.white
            ),
        ),
        Paragraph(
            "<b>Akar Akhir</b>",
            ParagraphStyle(
                "HCol", fontName="Helvetica-Bold", fontSize=8, textColor=colors.white
            ),
        ),
        Paragraph(
            "<b>Iterasi</b>",
            ParagraphStyle(
                "HCol",
                fontName="Helvetica-Bold",
                fontSize=8,
                textColor=colors.white,
                alignment=1,
            ),
        ),
    ]

    summary_rows = [summary_header]

    for r in results:
        status_text = (
            "<b><font color='#16a34a'>SUKSES</font></b>"
            if r.get("status") == "success"
            else "<b><font color='#dc2626'>GAGAL</font></b>"
        )
        root_val = r.get("root", 0.0)
        root_text = f"{root_val:.6f}" if r.get("status") == "success" else "-"
        iter_text = str(r.get("iterations_count", "-"))

        summary_rows.append(
            [
                Paragraph(
                    str(r.get("no")),
                    ParagraphStyle(
                        "RowCol", fontName="Helvetica", fontSize=8, alignment=1
                    ),
                ),
                Paragraph(
                    str(r.get("fungsi")),
                    ParagraphStyle("RowCol", fontName="Helvetica-Bold", fontSize=8),
                ),
                Paragraph(
                    f"[{r.get('a')}, {r.get('b')}]",
                    ParagraphStyle("RowCol", fontName="Helvetica", fontSize=8),
                ),
                Paragraph(
                    str(r.get("epsilon")),
                    ParagraphStyle("RowCol", fontName="Helvetica", fontSize=8),
                ),
                Paragraph(
                    status_text,
                    ParagraphStyle("RowCol", fontName="Helvetica", fontSize=8),
                ),
                Paragraph(
                    root_text,
                    ParagraphStyle("RowCol", fontName="Helvetica-Bold", fontSize=8),
                ),
                Paragraph(
                    iter_text,
                    ParagraphStyle(
                        "RowCol", fontName="Helvetica", fontSize=8, alignment=1
                    ),
                ),
            ]
        )

    summary_table = Table(summary_rows, colWidths=[25, 110, 85, 75, 60, 105, 40])

    summary_styles = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]

    for r_idx in range(1, len(summary_rows)):
        if r_idx % 2 == 0:
            summary_styles.append(
                ("BACKGROUND", (0, r_idx), (-1, r_idx), colors.HexColor("#f8fafc"))
            )

    summary_table.setStyle(TableStyle(summary_styles))
    story.append(summary_table)

    # ==================== PAGE 4+: APPENDICES (DETAILED ITERATIONS) ====================
    for r in results:
        if r.get("status") != "success":
            continue

        story.append(PageBreak())

        no = r.get("no")
        fungsi = r.get("fungsi")
        story.append(Paragraph(f"LAMPIRAN SOAL #{no}: DETAIL ITERASI", h1_style))
        story.append(
            Paragraph(
                f"Tabel konvergensi iterasi lengkap presisi tinggi untuk persamaan <b>f(x) = {fungsi}</b> pada selang [{r.get('a')}, {r.get('b')}] dengan akar akhir <b>{r.get('root'):.7f}</b>:",
                body_style,
            )
        )
        story.append(Spacer(1, 10))

        table_header = [
            Paragraph(
                "<b>Iter</b>",
                ParagraphStyle(
                    "HCol",
                    fontName="Helvetica-Bold",
                    fontSize=7.5,
                    textColor=colors.white,
                    alignment=1,
                ),
            ),
            Paragraph(
                "<b>a</b>",
                ParagraphStyle(
                    "HCol",
                    fontName="Helvetica-Bold",
                    fontSize=7.5,
                    textColor=colors.white,
                ),
            ),
            Paragraph(
                "<b>b</b>",
                ParagraphStyle(
                    "HCol",
                    fontName="Helvetica-Bold",
                    fontSize=7.5,
                    textColor=colors.white,
                ),
            ),
            Paragraph(
                "<b>xr</b>",
                ParagraphStyle(
                    "HCol",
                    fontName="Helvetica-Bold",
                    fontSize=7.5,
                    textColor=colors.white,
                ),
            ),
            Paragraph(
                "<b>f(a)</b>",
                ParagraphStyle(
                    "HCol",
                    fontName="Helvetica-Bold",
                    fontSize=7.5,
                    textColor=colors.white,
                ),
            ),
            Paragraph(
                "<b>f(b)</b>",
                ParagraphStyle(
                    "HCol",
                    fontName="Helvetica-Bold",
                    fontSize=7.5,
                    textColor=colors.white,
                ),
            ),
            Paragraph(
                "<b>f(xr)</b>",
                ParagraphStyle(
                    "HCol",
                    fontName="Helvetica-Bold",
                    fontSize=7.5,
                    textColor=colors.white,
                ),
            ),
            Paragraph(
                "<b>Error</b>",
                ParagraphStyle(
                    "HCol",
                    fontName="Helvetica-Bold",
                    fontSize=7.5,
                    textColor=colors.white,
                ),
            ),
        ]

        table_rows = [table_header]

        for row in r.get("iterations", []):
            table_rows.append(
                [
                    Paragraph(
                        str(row["iterasi"]),
                        ParagraphStyle(
                            "RowCol", fontName="Helvetica", fontSize=7, alignment=1
                        ),
                    ),
                    Paragraph(
                        f"{row['a']:.5f}",
                        ParagraphStyle("RowCol", fontName="Helvetica", fontSize=7),
                    ),
                    Paragraph(
                        f"{row['b']:.5f}",
                        ParagraphStyle("RowCol", fontName="Helvetica", fontSize=7),
                    ),
                    Paragraph(
                        f"<b>{row['xr']:.5f}</b>",
                        ParagraphStyle(
                            "RowCol",
                            fontName="Helvetica-Bold",
                            fontSize=7,
                            textColor=colors.HexColor("#2563eb"),
                        ),
                    ),
                    Paragraph(
                        f"{row['fa']:.5f}",
                        ParagraphStyle("RowCol", fontName="Helvetica", fontSize=7),
                    ),
                    Paragraph(
                        f"{row['fb']:.5f}",
                        ParagraphStyle("RowCol", fontName="Helvetica", fontSize=7),
                    ),
                    Paragraph(
                        f"{row['fxr']:.5f}",
                        ParagraphStyle("RowCol", fontName="Helvetica", fontSize=7),
                    ),
                    Paragraph(
                        f"{row['error']:.5f}",
                        ParagraphStyle("RowCol", fontName="Helvetica", fontSize=7),
                    ),
                ]
            )

        iter_table = Table(table_rows, colWidths=[35, 66, 66, 66, 66, 66, 66, 69])

        table_styles = [
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.HexColor("#0f172a"),
            ),  # Slate-900 header
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ]

        for r_idx in range(1, len(table_rows)):
            if r_idx % 2 == 0:
                table_styles.append(
                    ("BACKGROUND", (0, r_idx), (-1, r_idx), colors.HexColor("#f8fafc"))
                )

        iter_table.setStyle(TableStyle(table_styles))
        story.append(iter_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()
