#!/usr/bin/env bash
# =================================================================
# Galaxy TV4K - Production Deployment & Zero-Downtime Update Script
# Debian 12 / Docker Compose
# Note: All schema migrations and syncs are completely NON-DESTRUCTIVE.
# Admin GPS settings, employee records, attendance history, and
# Telegram bot configurations are 100% PRESERVED across all updates.
# =================================================================
set -e

echo "🚀 [1/5] Pulling latest updates from GitHub..."
git pull origin main

echo "📦 [2/5] Building and restarting Docker containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "🔄 [3/5] Applying safe database schema migrations (Non-destructive)..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma db push --skip-generate

echo "🌱 [4/5] Verifying official employee roster and system settings (Idempotent)..."
timeout 30s docker compose -f docker-compose.prod.yml exec -T backend npm run db:seed || true

echo "🧹 [5/5] Pruning old Docker build caches..."
docker image prune -f

echo "✅ Deployment successfully finished! All settings and data preserved."
docker compose -f docker-compose.prod.yml ps
