import shutil
import subprocess
import tempfile
from pathlib import Path


def libreoffice_available() -> bool:
    """Return True if 'soffice' (LibreOffice) is available in PATH."""
    from shutil import which
    return which("soffice") is not None or which("libreoffice") is not None


def recalc_with_libreoffice(xlsx_path: str) -> None:
    """
    Recalculate formulas using LibreOffice headless by re-saving the file.
    This overwrites the original file with a newly calculated version.
    """
    xlsx = Path(xlsx_path)
    if not xlsx.exists():
        raise FileNotFoundError(f"Excel not found: {xlsx}")

    # choose executable name present in PATH
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        raise RuntimeError("LibreOffice/soffice not found in PATH")

    # temp dir to place recalculated output
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)

        # LibreOffice tends to write to outdir using the same filename
        # We convert xlsx->xlsx to force a recalc and re-save
        cmd = [
            soffice,
            "--headless",
            "--calc",
            "--convert-to", "xlsx",
            "--outdir", str(tmpdir),
            str(xlsx)
        ]
        # run conversion
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if proc.returncode != 0:
            raise RuntimeError(f"LibreOffice convert failed: {proc.stderr or proc.stdout}")

        # find the produced file (same basename)
        out_file = tmpdir / xlsx.name
        if not out_file.exists():
            # some versions add .xlsx extension twice; fallback glob
            candidates = list(tmpdir.glob("*.xlsx"))
            if not candidates:
                raise RuntimeError("LibreOffice did not produce an output xlsx")
            out_file = candidates[0]

        # overwrite original with recalculated file
        shutil.copyfile(out_file, xlsx)
