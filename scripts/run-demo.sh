#!/usr/bin/env bash
# UIDrift demo runner — one command for local development, Docker, or seeding a production database.
#
#   ./scripts/run-demo.sh local      # Mongo + Redis in Docker (or your own), API + web on your machine
#   ./scripts/run-demo.sh docker     # everything in Docker (production build)
#   ./scripts/run-demo.sh seed       # (re)create demo users and reports in the configured database
#   ./scripts/run-demo.sh seed-prod  # same, against production (needs MONGODB_URI, REDIS_URL, JWT_SECRET)
#   ./scripts/run-demo.sh stop       # stop the Docker services
#
# No LLM or API key is needed for any of this. Users can add their own key per audit in the app.
set -euo pipefail
cd "$(dirname "$0")/.."

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
die() { printf '\033[31mError:\033[0m %s\n' "$*" >&2; exit 1; }

secret() { node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"; }

need_node() {
  command -v node >/dev/null || die "Node.js 20+ is required (https://nodejs.org)."
  local major; major=$(node -p 'process.versions.node.split(".")[0]')
  [ "$major" -ge 20 ] || die "Node.js 20+ is required (found $(node -v))."
}

need_docker() {
  command -v docker >/dev/null || die "Docker is required for this mode (https://docs.docker.com/get-docker/)."
  docker info >/dev/null 2>&1 || die "Docker is installed but not running."
}

print_logins() {
  bold "Demo logins"
  info "demo@uidrift.dev      Demo@12345      full history, website + code audits"
  info "designer@uidrift.dev  Designer@12345  one source-code audit"
  info "manager@uidrift.dev   Manager@12345   one website audit"
}

write_env_files() {
  if [ ! -f server/.env ]; then
    cat > server/.env <<ENV
PORT=4000
NODE_ENV=development
MONGODB_URI=${MONGODB_URI:-mongodb://127.0.0.1:27017/uidrift}
REDIS_URL=${REDIS_URL:-redis://127.0.0.1:6379}
JWT_SECRET=$(secret)
CLIENT_URL=http://localhost:3000
RUN_WORKER_INLINE=true
SCAN_RATE_LIMIT_PER_HOUR=30
LOG_LEVEL=info
ENV
    info "Created server/.env"
  fi
  if [ ! -f web/.env.local ]; then
    printf 'API_URL=http://localhost:4000\n' > web/.env.local
    info "Created web/.env.local"
  fi
}

case "${1:-help}" in
  local)
    need_node
    bold "1/4 Databases"
    if [ -z "${MONGODB_URI:-}" ] || [ -z "${REDIS_URL:-}" ]; then
      need_docker
      docker compose up -d mongo redis
      info "MongoDB on :27017 and Redis on :6379 (Docker)"
    else
      info "Using MONGODB_URI and REDIS_URL from your environment"
    fi
    bold "2/4 Install"
    write_env_files
    npm install --no-audit --no-fund
    bold "3/4 Seed demo data"
    for i in 1 2 3 4 5 6 7 8 9 10; do npm run seed --silent && break || { info "Waiting for MongoDB…"; sleep 3; }; done
    print_logins
    bold "4/4 Start"
    info "API http://localhost:4000 · App http://localhost:3000 (Ctrl+C to stop)"
    trap 'kill 0' INT TERM EXIT
    npm run dev:api &
    npm run dev:web &
    wait
    ;;
  docker)
    need_docker
    if [ ! -f .env ] || ! grep -q '^JWT_SECRET=' .env; then echo "JWT_SECRET=$(secret)" >> .env; info "Created .env with a random JWT_SECRET"; fi
    bold "Building and starting containers…"
    docker compose up -d --build
    bold "Seeding demo data…"
    for i in 1 2 3 4 5 6 7 8 9 10; do docker compose run --rm seed && break || { info "Waiting for MongoDB…"; sleep 3; }; done
    print_logins
    bold "Open http://localhost:3000"
    ;;
  seed)
    need_node
    [ -f server/.env ] || write_env_files
    npm run seed -- "${@:2}"
    ;;
  seed-prod)
    need_node
    for v in MONGODB_URI JWT_SECRET; do [ -n "${!v:-}" ] || die "Set $v to your production value first."; done
    NODE_ENV=production npm run seed -- --force "${@:2}"
    ;;
  stop)
    need_docker
    docker compose down
    ;;
  *)
    sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
    ;;
esac
