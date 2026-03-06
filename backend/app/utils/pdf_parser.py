import PyPDF2
from pathlib import Path
from typing import Optional

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text from a PDF file.

    Args:
        pdf_path: Path to the PDF file

    Returns:
        Extracted text from the PDF

    Raises:
        FileNotFoundError: If PDF file doesn't exist
        PyPDF2.PdfReadError: If PDF is corrupted or unreadable
    """
    pdf_file = Path(pdf_path)

    if not pdf_file.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    text = []

    with open(pdf_file, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)

        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text.append(page.extract_text())

    return "\n".join(text)


def extract_text_by_page(pdf_path: str) -> list[str]:
    """
    Extract text from a PDF file, returning text per page.

    Args:
        pdf_path: Path to the PDF file

    Returns:
        List of text strings, one per page
    """
    pdf_file = Path(pdf_path)

    if not pdf_file.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    pages_text = []

    with open(pdf_file, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)

        for page in pdf_reader.pages:
            pages_text.append(page.extract_text())

    return pages_text