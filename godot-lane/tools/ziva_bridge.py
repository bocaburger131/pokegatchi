#!/usr/bin/env python3
"""
Minimal local bridge client for the Ziva Installer test API.

Usage examples:
  python3 tools/ziva_bridge.py ready
  python3 tools/ziva_bridge.py state
  python3 tools/ziva_bridge.py install
  python3 tools/ziva_bridge.py installed
  python3 tools/ziva_bridge.py screenshot

Requires:
  1) Godot project opened
  2) Ziva Installer plugin enabled
  3) Godot launched with env var: ZIVA_INSTALLER_TEST_API=1
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8099"


def call(method: str, path: str) -> dict:
    req = urllib.request.Request(f"{BASE}{path}", method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            try:
                return json.loads(raw)
            except Exception:
                return {"raw": raw, "status": resp.status}
    except urllib.error.URLError as e:
        return {
            "ok": False,
            "error": "connection_failed",
            "detail": str(e),
            "hint": "Open Godot with ZIVA_INSTALLER_TEST_API=1 so test API listens on 127.0.0.1:8099",
        }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("command", choices=["ready", "state", "install", "restart", "installed", "screenshot"])
    args = p.parse_args()

    routes = {
        "ready": ("GET", "/ready"),
        "state": ("GET", "/state"),
        "install": ("POST", "/install"),
        "restart": ("POST", "/restart"),
        "installed": ("GET", "/ziva-installed"),
        "screenshot": ("GET", "/screenshot"),
    }

    method, path = routes[args.command]
    data = call(method, path)
    print(json.dumps(data, indent=2))
    return 0 if data and data.get("error") is None else 1


if __name__ == "__main__":
    raise SystemExit(main())
