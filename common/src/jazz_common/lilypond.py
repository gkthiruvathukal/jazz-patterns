"""Helpers for compiling generated LilyPond source to PDF/MIDI."""

import shutil
import subprocess
from pathlib import Path


def _tail(text: str, n: int = 30) -> str:
    lines = (text or "").splitlines()
    return "\n".join(lines[-n:])


def compile_with_lilypond(ly_path: Path, want_pdf: bool, want_midi: bool):
    lilypond_exe = shutil.which("lilypond")
    result = {
        "pdf_ok": False,
        "midi_ok": False,
        "pdf_path": None,
        "midi_path": None,
        "stdout_tail": "",
        "stderr_tail": "",
        "cmd": None,
    }
    if lilypond_exe is None:
        result["stderr_tail"] = "ERROR: lilypond not found in PATH."
        return result

    base = ly_path.parent / ly_path.stem
    cmd = [lilypond_exe, "-o", str(base), str(ly_path)]
    result["cmd"] = " ".join(cmd)

    try:
        cp = subprocess.run(cmd, check=True, text=True, capture_output=True)
        result["stdout_tail"] = _tail(cp.stdout)
        result["stderr_tail"] = _tail(cp.stderr)
    except subprocess.CalledProcessError as exc:
        result["stdout_tail"] = _tail(exc.stdout)
        result["stderr_tail"] = _tail(exc.stderr or f"Exited with {exc.returncode}")

    pdf_path = base.with_suffix(".pdf")
    midi_path = base.with_suffix(".midi")
    mid_path = base.with_suffix(".mid")

    if want_pdf and pdf_path.exists():
        result["pdf_ok"] = True
        result["pdf_path"] = str(pdf_path)
    if want_midi and (midi_path.exists() or mid_path.exists()):
        result["midi_ok"] = True
        result["midi_path"] = str(midi_path if midi_path.exists() else mid_path)

    return result
