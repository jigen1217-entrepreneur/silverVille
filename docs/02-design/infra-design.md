# Agent 4: Infrastructure Design

> **Agent**: infra-architect
> **Date**: 2026-03-12
> **Scope**: Docker Compose, AWS ECS Fargate, CI/CD, Expo EAS, env vars, monitoring

---

## 1. Docker Compose (Local Development)

```yaml
# docker-compose.yml (project root)
version: '3.9'

services:
  # ── Backend API Server ──
  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://silverville:silverville_dev@postgres:5432/silverville_dev
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-jwt-secret-do-not-use-in-prod
      JWT_REFRESH_SECRET: dev-refresh-secret-do-not-use-in-prod
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      AWS_S3_BUCKET: silverville-dev
      AWS_REGION: ap-northeast-2
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./server/src:/app/src   # Hot reload
    command: npm run dev
    restart: unless-stopped

  # ── PostgreSQL 16 ──
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: silverville
      POSTGRES_PASSWORD: silverville_dev
      POSTGRES_DB: silverville_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U silverville"]
      interval: 5s
      timeout: 3s
      retries: 5

  # ── Redis 7 ──
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    command: redis-server --appendonly yes

  # ── Prisma Studio (optional dev tool) ──
  prisma-studio:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "5555:5555"
    environment:
      DATABASE_URL: postgresql://silverville:silverville_dev@postgres:5432/silverville_dev
    depends_on:
      - postgres
    command: npx prisma studio
    profiles:
      - tools

volumes:
  pgdata:
  redisdata:
```

### Server Dockerfile

```dockerfile
# server/Dockerfile
FROM node:22-alpine AS base
WORKDIR /app

# Dependencies
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Prisma generate
COPY prisma ./prisma
RUN npx prisma generate

# Source
COPY . .

# Build
RUN npm run build

# Production stage
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/package.json ./

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

---

## 2. AWS ECS Fargate Production

### Architecture

```
                    Internet
                       |
                  CloudFront
                       |
              ALB (Application Load Balancer)
              /                    \
     ECS Service                ECS Service
     (api, min 2 tasks)        (cron, 1 task)
              \                    /
         ┌─────────────────────────┐
         │   VPC (Private Subnets)  │
         │                          │
         │  RDS PostgreSQL 16       │
         │  (db.t3.small, Multi-AZ) │
         │                          │
         │  ElastiCache Redis 7     │
         │  (cache.t3.micro)        │
         │                          │
         └──────────────────────────┘
                       |
                  S3 Bucket
              (silverville-media)
```

### ECS Task Definition

```json
{
  "family": "silverville-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "${ECR_REGISTRY}/silverville-api:${TAG}",
      "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -qO- http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      },
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3000" }
      ],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:ap-northeast-2:...silverville/database-url" },
        { "name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:ap-northeast-2:...silverville/redis-url" },
        { "name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:ap-northeast-2:...silverville/jwt-secret" },
        { "name": "JWT_REFRESH_SECRET", "valueFrom": "arn:aws:secretsmanager:ap-northeast-2:...silverville/jwt-refresh-secret" },
        { "name": "OPENAI_API_KEY", "valueFrom": "arn:aws:secretsmanager:ap-northeast-2:...silverville/openai-key" },
        { "name": "KAKAO_CLIENT_ID", "valueFrom": "arn:aws:secretsmanager:ap-northeast-2:...silverville/kakao-client-id" },
        { "name": "KAKAO_CLIENT_SECRET", "valueFrom": "arn:aws:secretsmanager:ap-northeast-2:...silverville/kakao-client-secret" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/silverville-api",
          "awslogs-region": "ap-northeast-2",
          "awslogs-stream-prefix": "api"
        }
      }
    }
  ]
}
```

### Auto-Scaling Policy

| Metric | Target | Scale Out | Scale In | Cooldown |
|--------|--------|-----------|----------|----------|
| CPU Utilization | 70% | +1 task | -1 task | 300s |
| Request Count (per target) | 1000/min | +1 task | -1 task | 300s |
| Min tasks | 2 | - | - | - |
| Max tasks | 6 | - | - | - |

---

## 3. GitHub Actions CI/CD Pipeline

### `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main, staging]

env:
  AWS_REGION: ap-northeast-2
  ECR_REPOSITORY: silverville-api

jobs:
  # ── Lint & Type Check ──
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: server/package-lock.json
      - run: cd server && npm ci
      - run: cd server && npx tsc --noEmit
      - run: cd server && npm run lint

  # ── Unit Tests ──
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: silverville_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: server/package-lock.json
      - run: cd server && npm ci
      - run: cd server && npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/silverville_test
      - run: cd server && npm test -- --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/silverville_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret
          JWT_REFRESH_SECRET: test-refresh-secret

  # ── Build & Push Docker Image ──
  build:
    needs: [lint, test]
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      - uses: aws-actions/amazon-ecr-login@v2
        id: ecr-login
      - name: Build and push
        run: |
          TAG=${{ github.sha }}
          docker build -t ${{ steps.ecr-login.outputs.registry }}/${{ env.ECR_REPOSITORY }}:$TAG ./server
          docker push ${{ steps.ecr-login.outputs.registry }}/${{ env.ECR_REPOSITORY }}:$TAG

  # ── Deploy to Staging ──
  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster silverville-staging \
            --service silverville-api \
            --force-new-deployment

  # ── Deploy to Production (manual approval) ──
  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster silverville-production \
            --service silverville-api \
            --force-new-deployment
```

---

## 4. Expo EAS Build Configuration

### `eas.json`

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "http://localhost:3000/api"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging-api.silverville.app/api"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.silverville.app/api"
      },
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-services.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "team@silverville.app",
        "ascAppId": "123456789"
      }
    }
  }
}
```

---

## 5. Environment Variable Management

### Local Development

```bash
# server/.env (gitignored)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://silverville:silverville_dev@localhost:5432/silverville_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret-change-in-prod
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-prod
OPENAI_API_KEY=sk-...
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...
AWS_S3_BUCKET=silverville-dev
AWS_REGION=ap-northeast-2
SENTRY_DSN=...
```

### Production (AWS Secrets Manager)

| Secret Name | Contains |
|-------------|----------|
| `silverville/database-url` | PostgreSQL connection string |
| `silverville/redis-url` | Redis connection string |
| `silverville/jwt-secret` | JWT signing key (RS256 private key) |
| `silverville/jwt-refresh-secret` | Refresh token signing key |
| `silverville/openai-key` | OpenAI API key |
| `silverville/kakao-client-id` | KakaoTalk OAuth client ID |
| `silverville/kakao-client-secret` | KakaoTalk OAuth client secret |
| `silverville/fcm-server-key` | Firebase Cloud Messaging key |

### Secret Rotation

- JWT secrets: rotate quarterly
- API keys (OpenAI, Kakao): rotate on compromise
- Database password: rotate via RDS managed rotation (90-day cycle)

---

## 6. Monitoring & Alerting

### Sentry (Error Tracking)

```typescript
// Server
import * as Sentry from '@sentry/node';
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});

// Client (React Native)
import * as Sentry from '@sentry/react-native';
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableNativeFramesTracking: true,
});
```

### Datadog APM

```typescript
// Server entry point (before all imports)
import tracer from 'dd-trace';
tracer.init({
  service: 'silverville-api',
  env: process.env.NODE_ENV,
  version: process.env.npm_package_version,
});
```

### Alert Rules

| Alert | Condition | Channel | Severity |
|-------|-----------|---------|----------|
| Error spike | > 10 errors/min | Slack + PagerDuty | Critical |
| API latency | p95 > 2s for 5 min | Slack | Warning |
| CPU usage | > 80% for 10 min | Slack | Warning |
| DB connections | > 80% pool | Slack + PagerDuty | Critical |
| Disk usage | > 85% | Slack | Warning |
| Health check fail | 3 consecutive failures | PagerDuty | Critical |
| Daily active users | Drop > 20% day-over-day | Slack | Info |

### Health Check Endpoint

```typescript
// GET /health
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkPostgres(),
    redis: await checkRedis(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version,
  };

  const healthy = checks.database && checks.redis;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  });
});
```

---

## 7. Cost Estimate (Monthly)

| Resource | Staging | Production | Notes |
|----------|---------|------------|-------|
| ECS Fargate (API) | ~$15 (1 task, 0.5 vCPU) | ~$60 (2 tasks, 0.5 vCPU) | Auto-scale to 6 |
| RDS PostgreSQL | ~$15 (db.t3.micro) | ~$50 (db.t3.small, Multi-AZ) | |
| ElastiCache Redis | ~$12 (cache.t3.micro) | ~$12 (cache.t3.micro) | |
| S3 | ~$1 | ~$5 | Photo storage |
| CloudFront | ~$0 | ~$5 | CDN |
| Secrets Manager | ~$3 | ~$3 | Per-secret pricing |
| CloudWatch Logs | ~$2 | ~$10 | Log retention |
| **Total** | **~$48/month** | **~$145/month** | |
