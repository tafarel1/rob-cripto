#!/usr/bin/env python3
"""
Atualizador de paths absolutos para migração do smc_sentinel.

- Substitui ocorrências de:
  V:\\development\\smc_sentinel
por:
  V:\\development\\smc_sentinel

- Aplica somente em arquivos de texto conhecidos.
- Gera log das alterações em migration_log.txt.
"""
from __future__ import annotations
import os
import sys
from pathlib import Path

OLD = r"V:\\development\\smc_sentinel"
NEW = r"V:\\development\\smc_sentinel"

TEXT_EXTS = {
    ".py", ".ps1", ".bat", ".cmd", ".txt", ".md", ".toml", ".json", ".ini", ".conf", ".yml", ".yaml"
}

EXCLUDE_DIRS = {".git", ".venv", "__pycache__", ".pytest_cache"}
LOG_FILE = "migration_log.txt"


def is_text_file(p: Path) -> bool:
    if p.suffix.lower() in TEXT_EXTS:
        return True
    try:
        with p.open("rb") as f:
            chunk = f.read(1024)
        return b"\0" not in chunk
    except Exception:
        return False


def update_paths(root: Path) -> int:
    changed = 0
    log_lines = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            p = Path(dirpath) / fn
            if not is_text_file(p):
                continue
            try:
                content = p.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            if OLD in content:
                new_content = content.replace(OLD, NEW)
                if new_content != content:
                    p.write_text(new_content, encoding="utf-8")
                    changed += 1
                    rel = p.relative_to(root)
                    log_lines.append(f"[UPDATED] {rel}")
    if log_lines:
        with (root / LOG_FILE).open("a", encoding="utf-8") as log:
            log.write("\n".join(log_lines) + "\n")
    return changed


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent
    count = update_paths(target)
    print(f"Atualização de paths concluída. Arquivos modificados: {count}")