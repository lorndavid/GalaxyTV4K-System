#!/usr/bin/env bash
# =================================================================
# Galaxy TV4K - Production Deployment & Update Script for Debian 12
# =================================================================
set -e

echo "🚀 [1/5] Pulling latest updates from GitHub..."
git pull origin main

echo "📦 [2/5] Building and restarting Docker containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "🔄 [3/5] Syncing database schema with Prisma..."
docker compose -f docker-compose.prod.yml exec backend npx prisma db push

echo "🧹 [4/5] Cleaning old dangling Docker images..."
docker image prune -f

echo "✅ [5/5] Deployment successfully finished! Services are running."
docker compose -f docker-compose.prod.yml ps
