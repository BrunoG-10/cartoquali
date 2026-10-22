"""Gera a ficha de implantação com campos preenchíveis (AcroForm).

Uso: python docs/operacao/gerar-ficha-preenchivel.py
Saída: public/ficha-de-implantacao.pdf (baixada pelo botão "Baixar ficha" em /implantacoes)
Versão enviada ao cliente: só os dados do cadastro (cartório, atribuições, administrador, ponto/QR e privacidade).
Mesmo conteúdo de ficha-de-implantacao.html (versão para imprimir); mantenha os dois iguais.
"""

import re
import unicodedata
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parents[2] / "public" / "ficha-de-implantacao.pdf"
NAVY = colors.HexColor("#16294a")
GOLD = colors.HexColor("#b08d57")
GOLD_LIGHT = colors.HexColor("#c9a86a")
LINE = colors.HexColor("#9c968a")
SOFT = colors.HexColor("#f7f5f0")
MUTED = colors.HexColor("#5f5f5f")
RED = "#a33a2a"

PAGE_W, PAGE_H = A4
MARGIN = 15 * mm
WIDTH = PAGE_W - 2 * MARGIN
GAP = 8

body = ParagraphStyle("body", fontName="Helvetica", fontSize=9, leading=12)
hint = ParagraphStyle("hint", parent=body, fontSize=8, leading=10.5, textColor=MUTED, spaceAfter=5)
label = ParagraphStyle("label", fontName="Helvetica-Bold", fontSize=7.5, leading=9, textColor=colors.HexColor("#333333"))
cell = ParagraphStyle("cell", parent=body, fontSize=8, leading=10)
head = ParagraphStyle("head", parent=cell, fontName="Helvetica-Bold")

_names: set[str] = set()


def field_name(text: str) -> str:
    """Nome único e legível para cada campo (aparece ao exportar os dados do formulário)."""
    base = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    base = re.sub(r"[^A-Za-z0-9]+", "_", base).strip("_").lower()[:40] or "campo"
    name, n = base, 2
    while name in _names:
        name, n = f"{base}_{n}", n + 1
    _names.add(name)
    return name


def req(text: str) -> str:
    return f'{text} <font color="{RED}">*</font>'


class TextBox(Flowable):
    """Campo de texto preenchível, com rótulo opcional acima."""

    def __init__(self, title: str, width: float, lines: int = 1, show_label: bool = True, required=False):
        super().__init__()
        self.title, self.width, self.lines, self.show_label = title, width, lines, show_label
        self.label = Paragraph(req(title) if required else title, label) if show_label else None
        self.box_h = 15 if lines == 1 else 12 * lines + 4
        self.label_h = self.label.wrap(width, 100)[1] + 2 if self.label else 0
        self.height = self.box_h + self.label_h

    def wrap(self, *_):
        return self.width, self.height

    def draw(self):
        if self.label:
            self.label.drawOn(self.canv, 0, self.box_h + 2)
        self.canv.acroForm.textfield(
            name=field_name(self.title),
            tooltip=self.title,
            x=0,
            y=0,
            width=self.width,
            height=self.box_h,
            fontName="Helvetica",
            fontSize=9,
            borderWidth=0.6,
            borderColor=LINE,
            fillColor=colors.white,
            textColor=colors.black,
            fieldFlags="multiline" if self.lines > 1 else "",
            relative=True,
        )


class Check(Flowable):
    """Caixa de marcar preenchível com o texto ao lado."""

    def __init__(self, text: str, width: float, size: float = 9, show_text: bool = True):
        super().__init__()
        self.text, self.width, self.size = text, width, size
        self.para = (
            Paragraph(text, ParagraphStyle("ck", parent=body, fontSize=8.5, leading=10.5))
            if show_text
            else None
        )
        text_h = self.para.wrap(width - self.size - 6, 100)[1] if self.para else 0
        self.height = max(self.size + 2, text_h)

    def wrap(self, *_):
        return self.width, self.height

    def draw(self):
        top = self.height
        self.canv.acroForm.checkbox(
            name=field_name(self.text),
            tooltip=re.sub("<[^>]+>", "", self.text),
            x=0,
            y=top - self.size - 1,
            size=self.size,
            buttonStyle="check",
            borderWidth=0.6,
            borderColor=colors.HexColor("#555555"),
            fillColor=colors.white,
            textColor=NAVY,
            relative=True,
        )
        if self.para:
            self.para.drawOn(self.canv, self.size + 5, top - self.para.height)


class SectionTitle(Flowable):
    def __init__(self, number, text: str):
        super().__init__()
        self.number, self.text = number, text
        self.width, self.height = WIDTH, 22

    def wrap(self, *_):
        return self.width, self.height

    def draw(self):
        c = self.canv
        if self.number:
            c.setFillColor(NAVY)
            c.circle(9, 9, 9, stroke=0, fill=1)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 9)
            c.drawCentredString(9, 6, str(self.number))
        c.setFillColor(NAVY)
        c.setFont("Times-Bold", 12.5)
        c.drawString(24 if self.number else 0, 5, self.text)


def row(*items: tuple[str, float, bool]):
    """Linha de campos: (rótulo, fração da largura, obrigatório)."""
    total = sum(frac for _, frac, _ in items)
    usable = WIDTH - GAP * (len(items) - 1)
    widths = [usable * frac / total for _, frac, _ in items]
    cells = [TextBox(t, w, required=r) for (t, _, r), w in zip(items, widths)]
    return grid([cells], [w + GAP for w in widths[:-1]] + [widths[-1]])


def grid(rows, col_widths, pad_bottom=6):
    t = Table(rows, colWidths=col_widths)
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), pad_bottom),
            ]
        )
    )
    t.hAlign = "LEFT"
    return t


def checks(texts, columns=2, pad_bottom=3):
    col_w = WIDTH / columns
    items = [Check(text, col_w - 8) for text in texts]
    rows = [items[i : i + columns] for i in range(0, len(items), columns)]
    rows[-1] += [""] * (columns - len(rows[-1]))
    return grid(rows, [col_w] * columns, pad_bottom)




def section(number, title, *content):
    """O título fica junto do primeiro bloco (e do segundo, quando o primeiro é a explicação)."""
    keep = 2 if isinstance(content[0], Paragraph) and len(content) > 1 else 1
    return [KeepTogether([SectionTitle(number, title), *content[:keep]]), *content[keep:], Spacer(1, 3)]



def header_footer(c, doc):
    c.saveState()
    if doc.page == 1:
        x, y = MARGIN, PAGE_H - MARGIN - 34
        c.setFillColor(NAVY)
        c.circle(x + 17, y + 17, 17, stroke=0, fill=1)
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.1)
        c.circle(x + 17, y + 17, 13.3, stroke=1, fill=0)
        c.setStrokeColor(GOLD_LIGHT)
        c.setLineWidth(3)
        c.setLineCap(1)
        c.setLineJoin(1)
        p = c.beginPath()
        p.moveTo(x + 11.3, y + 16.6)
        p.lineTo(x + 15.7, y + 12.2)
        p.lineTo(x + 24.2, y + 21)
        c.drawPath(p, stroke=1, fill=0)
        c.setFillColor(NAVY)
        c.setFont("Times-Bold", 18)
        c.drawString(x + 44, y + 16, "Ficha de implantação")
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 9)
        c.drawString(x + 44, y + 3, "CartoQuali · gestão da qualidade do atendimento em cartórios")
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.5)
        c.line(MARGIN, y - 7, PAGE_W - MARGIN, y - 7)
    c.setFont("Helvetica", 7.5)
    c.setFillColor(MUTED)
    c.drawString(MARGIN, 10 * mm, "CartoQuali · solução independente, sem vínculo com ANOREG, PQTA ou CNJ · cartoquali@gmail.com")
    c.drawRightString(PAGE_W - MARGIN, 10 * mm, f"Página {doc.page}")
    c.restoreState()


def build():
    intro = Table(
        [[Paragraph(
            "Esta ficha reúne tudo o que precisamos para colocar o CartoQuali em funcionamento no seu cartório. "
            "Preencha os campos diretamente neste PDF, salve e devolva para <b>cartoquali@gmail.com</b>. "
            f'Campos com <font color="{RED}">*</font> são obrigatórios.<br/>'
            "Os dados são usados apenas para a implantação e a prestação do serviço, conforme a Lei Geral de "
            "Proteção de Dados (LGPD) e a Política de Privacidade disponível em cartoquali.com.br/privacidade.",
            body,
        )]],
        colWidths=[WIDTH],
    )
    intro.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SOFT),
        ("LINEBEFORE", (0, 0), (0, -1), 2.5, GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))

    story = [Spacer(1, 40), intro, Spacer(1, 8)]
    story.extend(section(1, "Dados do cartório",
        Paragraph("Razão social e CNPJ são cadastrados pelo suporte; depois da implantação, a alteração é feita somente a pedido.", hint),
        row(("Razão social", 4, True), ("CNPJ", 2, True)),
        row(("Nome fantasia (como aparece para o cidadão na pesquisa)", 4, True), ("Tipo de serventia", 2, True)),
        row(("Responsável pela serventia (titular, interino ou substituto)", 4, True), ("Telefone", 2, False)),
        row(("E-mail institucional", 1, False)),
        row(("CEP", 2, False), ("Logradouro", 5, False), ("Número", 1, False), ("Complemento", 2, False)),
        row(("Bairro", 4, False), ("Cidade", 5, True), ("UF", 1, True)),
    ))
    story.extend(section(2, "Atribuições *",
        Paragraph("Marque todas as atribuições da serventia (Lei 8.935/1994, art. 5º). Elas definem os serviços que o cidadão poderá escolher na pesquisa.", hint),
        checks([
            "Tabelionato de Notas", "Tabelionato de Protesto", "Registro de Imóveis",
            "Registro Civil das Pessoas Naturais",
            "Registro de Títulos e Documentos e Civil de Pessoas Jurídicas",
            "Registro de Contratos Marítimos", "Registro de Distribuição",
        ]),
    ))
    story.extend(section(3, "Administrador do sistema *",
        Paragraph("Pessoa que vai gerenciar o CartoQuali no cartório. Ela recebe por e-mail um convite para criar a senha, válido por 24 horas (podemos reenviar). Use um e-mail de uso individual, não compartilhado.", hint),
        row(("Nome completo do administrador", 4, True), ("Telefone / WhatsApp do administrador", 2, False)),
        row(("E-mail do administrador", 1, True)),
    ))
    story.extend(section(4, "Ponto de atendimento e QR Code *",
        Paragraph("Um único QR Code atende o cartório inteiro: o cidadão escolhe o serviço na própria pesquisa. Informe onde o cartaz ficará.", hint),
        row(("Nome do ponto (ex.: Atendimento principal)", 1, True), ("Localização (ex.: recepção, térreo)", 1, True)),
        row(("Onde os cartazes serão fixados (balcão, sala de espera, guichês)", 4, False), ("Quantidade de cartazes", 2, False)),
    ))
    story.extend(section(5, "Privacidade (LGPD)",
        Paragraph("O cartório é o controlador dos dados das avaliações; o CartoQuali atua como operador. Indique quem responde por privacidade no cartório.", hint),
        row(("Encarregado de dados (DPO) ou contato de privacidade", 1, False), ("E-mail do encarregado", 1, False)),
    ))

    doc = SimpleDocTemplate(
        str(OUT), pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=16 * mm,
        title="Ficha de implantação — CartoQuali", author="CartoQuali", subject="Dados para implantação do CartoQuali",
    )
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(OUT, "campos:", len(_names))


if __name__ == "__main__":
    build()
