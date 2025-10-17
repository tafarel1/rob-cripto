from __future__ import annotations

import asyncio
import json
import os
import datetime
from pathlib import Path
from typing import Protocol, Any


class EventSink(Protocol):
    async def write(self, event: dict[str, Any]) -> None: ...
    async def aclose(self) -> None: ...


class ConsoleSink:
    def __init__(self) -> None:
        pass

    async def write(self, event: dict[str, Any]) -> None:
        # Evita bloquear o loop; serialização em thread
        line = await asyncio.to_thread(json.dumps, event, separators=(",", ":"), ensure_ascii=False)
        print(line, flush=False)

    async def aclose(self) -> None:
        return None


class JSONLinesSink:
    def __init__(self, path: str | os.PathLike, rotate_daily: bool = False) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.rotate_daily = rotate_daily or ("{date}" in str(self.path))
        self._lock = asyncio.Lock()
        # Caminho atual resolvido (com data se aplicável)
        resolved_path, cur_date = self._resolve_path()
        self._current_path = resolved_path
        self._current_date = cur_date
        self._fp = open(self._current_path, "a", encoding="utf-8")

    def _resolve_path(self) -> tuple[Path, str]:
        today = datetime.date.today().strftime("%Y-%m-%d")
        if self.rotate_daily:
            s = str(self.path)
            if "{date}" in s:
                new_path = Path(s.format(date=today))
            else:
                p = self.path
                new_name = f"{p.stem}-{today}{p.suffix}"
                new_path = p.with_name(new_name)
        else:
            new_path = self.path
        new_path.parent.mkdir(parents=True, exist_ok=True)
        return new_path, today

    async def _rotate_if_needed(self) -> None:
        if not self.rotate_daily:
            return
        new_path, today = self._resolve_path()
        if new_path != self._current_path:
            # Troca de arquivo sob lock
            if not self._fp.closed:
                await asyncio.to_thread(self._fp.flush)
                await asyncio.to_thread(self._fp.close)
            self._current_path = new_path
            self._current_date = today
            self._fp = open(self._current_path, "a", encoding="utf-8")

    async def write(self, event: dict[str, Any]) -> None:
        line = await asyncio.to_thread(json.dumps, event, separators=(",", ":"), ensure_ascii=False)
        async with self._lock:
            await self._rotate_if_needed()
            await asyncio.to_thread(self._fp.write, line + "\n")
            await asyncio.to_thread(self._fp.flush)

    async def aclose(self) -> None:
        if not self._fp.closed:
            await asyncio.to_thread(self._fp.flush)
            await asyncio.to_thread(self._fp.close)