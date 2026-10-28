#!/usr/bin/env bash
# Exporta informe.html a PDF con Chrome/Chromium en modo headless (sin encabezado ni pie del navegador).
# Uso: docs/informe/exportar-pdf.sh [ruta-de-chrome]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME="${1:-${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}}"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=5000 \
  --print-to-pdf="$DIR/informe.pdf" "file://$DIR/informe.html" 2>/dev/null
echo "PDF generado: $DIR/informe.pdf"
