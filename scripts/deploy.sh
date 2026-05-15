#!/usr/bin/env bash
# Despliega la carpeta dist/ al servidor por rsync.
# Uso: npm run deploy
#      npm run deploy:quick   (sin tests)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKIP_TESTS=false
for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=true ;;
    -h|--help)
      echo "Uso: $0 [--skip-tests]"
      exit 0
      ;;
  esac
done

CONFIG="$ROOT/deploy.config.local"
if [[ ! -f "$CONFIG" ]]; then
  echo "❌ No existe deploy.config.local"
  echo ""
  echo "   cp deploy.config.example deploy.config.local"
  echo "   # Edita usuario, host y ruta si cambian"
  exit 1
fi

# shellcheck source=/dev/null
source "$CONFIG"

: "${DEPLOY_USER:?Falta DEPLOY_USER en deploy.config.local}"
: "${DEPLOY_HOST:?Falta DEPLOY_HOST en deploy.config.local}"
: "${DEPLOY_PATH:?Falta DEPLOY_PATH en deploy.config.local}"

if [[ ! -f "$ROOT/.env" ]]; then
  echo "❌ No existe .env (necesario para npm run build)."
  echo "   Copia las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY."
  exit 1
fi

if [[ ! -d "$ROOT/node_modules" ]]; then
  echo "→ Instalando dependencias..."
  npm install
fi

if [[ "$SKIP_TESTS" == false ]]; then
  echo "→ Ejecutando tests..."
  npm run test
else
  echo "→ Tests omitidos (--skip-tests)"
fi

echo "→ Generando build de producción..."
npm run build

DEST="${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"
echo "→ Subiendo dist/ a ${DEST}"
echo "   (te pedirá la contraseña SSH si no tienes clave configurada)"
echo ""

if [[ -n "${DEPLOY_SSH_PORT:-}" ]]; then
  rsync -avz --progress -e "ssh -p ${DEPLOY_SSH_PORT}" dist/ "$DEST"
else
  rsync -avz --progress dist/ "$DEST"
fi

# cPanel: archivos subidos como root provocan 403 si Apache corre como el usuario de la cuenta
if [[ -n "${DEPLOY_WEB_USER:-}" ]]; then
  echo "→ Ajustando propietario y permisos (${DEPLOY_WEB_USER})..."
  FIX_PERMS="chown -R '${DEPLOY_WEB_USER}:${DEPLOY_WEB_USER}' '${DEPLOY_PATH}' && \
     find '${DEPLOY_PATH}' -type d -exec chmod 755 {} + && \
     find '${DEPLOY_PATH}' -type f -exec chmod 644 {} +"
  if [[ -n "${DEPLOY_SSH_PORT:-}" ]]; then
    ssh -p "${DEPLOY_SSH_PORT}" "${DEPLOY_USER}@${DEPLOY_HOST}" "$FIX_PERMS"
  else
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "$FIX_PERMS"
  fi
fi

echo ""
echo "✅ Despliegue completado."
if [[ -n "${DEPLOY_URL:-}" ]]; then
  echo "   Web: ${DEPLOY_URL}"
  if [[ -n "${DEPLOY_ADMIN_URL:-}" ]]; then
    echo "   Admin: ${DEPLOY_ADMIN_URL}"
  fi
fi
