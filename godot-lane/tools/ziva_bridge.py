#!/usr/bin/env python3
"""
Local bridge client for the Ziva Installer test API.

Examples:
  python3 tools/ziva_bridge.py doctor
  python3 tools/ziva_bridge.py ready
  python3 tools/ziva_bridge.py state
  python3 tools/ziva_bridge.py install
  python3 tools/ziva_bridge.py installed
  python3 tools/ziva_bridge.py screenshot

WSL tip:
  If Godot runs on Windows, localhost may not be reachable from WSL.
  This script auto-tries likely hosts (127.0.0.1 + Windows host gateway).
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import urllib.error
import urllib.request

DEFAULT_PORT = int(os.getenv("ZIVA_BRIDGE_PORT", "8099"))
DEFAULT_SCHEME = "http"
DEFAULT_HOST = os.getenv("ZIVA_BRIDGE_HOST", "")


def windows_host_gateway() -> str | None:
    """WSL2 usually exposes Windows host via nameserver in /etc/resolv.conf."""
    try:
        text = Path("/etc/resolv.conf").read_text(encoding="utf-8", errors="ignore")
        for line in text.splitlines():
            if line.strip().startswith("nameserver "):
                return line.split()[1].strip()
    except Exception:
        return None
    return None


def candidate_bases(host: str | None, port: int) -> list[str]:
    if host:
        return [f"{DEFAULT_SCHEME}://{host}:{port}"]

    cands: list[str] = [f"{DEFAULT_SCHEME}://127.0.0.1:{port}"]
    gw = windows_host_gateway()
    if gw and gw != "127.0.0.1":
        cands.append(f"{DEFAULT_SCHEME}://{gw}:{port}")
    return cands


def try_call(method: str, path: str, bases: list[str], timeout: int = 5) -> dict:
    last_err: str | None = None
    for base in bases:
        url = f"{base}{path}"
        req = urllib.request.Request(url, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
                try:
                    payload = json.loads(raw)
                except Exception:
                    payload = {"raw": raw, "status": resp.status}
                return {"ok": True, "base": base, "response": payload}
        except urllib.error.URLError as e:
            last_err = f"{base}: {e}"

    return {
        "ok": False,
        "error": "connection_failed",
        "detail": last_err or "unknown",
        "tried": bases,
        "hint": "Launch Godot with ZIVA_INSTALLER_TEST_API=1 and ensure Ziva Installer plugin is enabled.",
    }


def doctor(bases: list[str]) -> dict:
    checks = {}
    for base in bases:
        res = try_call("GET", "/ready", [base], timeout=2)
        checks[base] = res.get("ok", False)
    return {
        "ok": any(checks.values()),
        "checks": checks,
        "wsl_windows_gateway": windows_host_gateway(),
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument(
        "command",
        choices=["doctor", "ready", "state", "install", "restart", "installed", "screenshot"],
    )
    p.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help="API host override (example: 127.0.0.1 or Windows host IP).",
    )
    p.add_argument(
        "--port",
        default=DEFAULT_PORT,
        type=int,
        help="API port override (default: env ZIVA_BRIDGE_PORT or 8099).",
    )
    args = p.parse_args()

    host = args.host.strip() or None
    bases = candidate_bases(host, args.port)

    if args.command == "doctor":
        data = doctor(bases)
        print(json.dumps(data, indent=2))
        return 0 if data.get("ok") else 1

    routes = {
        "ready": ("GET", "/ready"),
        "state": ("GET", "/state"),
        "install": ("POST", "/install"),
        "restart": ("POST", "/restart"),
        "installed": ("GET", "/ziva-installed"),
        "screenshot": ("GET", "/screenshot"),
    }

    method, path = routes[args.command]
    result = try_call(method, path, bases)
    print(json.dumps(result, indent=2))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
