#!/usr/bin/env python3
"""
Elmansheya API Gateway (FastAPI Entrypoint)
Seamless backwards-compatible runner for systemd and local development.
"""
import os
import sys
import uvicorn

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    host = os.environ.get('HOST', '0.0.0.0')
    print(f'[Gateway:FastAPI] Starting Elmansheya Gateway on {host}:{port}...')
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level="info",
        access_log=True,
    )
