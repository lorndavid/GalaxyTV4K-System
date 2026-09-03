#!/usr/bin/env bash
# =================================================================
# Galaxy TV4K - Production Deployment & Update Script for Debian 12
# =================================================================
set -e

echo "🚀 [1/5] Pulling latest updates from GitHub..."
git pull origin main

echo "📦 [2/6] Building and restarting Docker containers..."
docker compose -f docker-compose.prod.yml up -d --build --force-recreate

echo "🔄 [3/6] Syncing database schema with Prisma..."
docker compose -f docker-compose.prod.yml exec backend npx prisma db push

echo "🌱 [4/6] Seeding official employee accounts and departments..."
docker compose -f docker-compose.prod.yml exec backend npm run db:seed || true

echo "🧹 [5/6] Cleaning old dangling Docker images..."
docker image prune -f

echo "✅ [6/6] Deployment successfully finished! Services are running."
docker compose -f docker-compose.prod.yml ps
