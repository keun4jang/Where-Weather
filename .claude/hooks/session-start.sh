#!/bin/bash
set -euo pipefail

# 클로드 코드 웹 환경에서만 실행
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "=== Where Weather: 세션 시작 설정 ==="

# Node.js 의존성 설치
if [ -f "$CLAUDE_PROJECT_DIR/package.json" ]; then
  echo "[1/3] npm 의존성 설치 중..."
  cd "$CLAUDE_PROJECT_DIR"
  npm install
  echo "✓ npm 의존성 설치 완료"
fi

# Git hooks 설정
if [ -d "$CLAUDE_PROJECT_DIR/.githooks" ]; then
  echo "[2/3] Git hooks 설정 중..."
  cd "$CLAUDE_PROJECT_DIR"
  git config core.hooksPath .githooks
  chmod +x .githooks/pre-commit 2>/dev/null || true
  echo "✓ Git hooks 설정 완료"
fi

# 생성된 파일 확인 및 생성
echo "[3/3] 생성된 파일 확인 중..."
cd "$CLAUDE_PROJECT_DIR"

if [ ! -f "src/generated/appVersion.ts" ]; then
  mkdir -p src/generated
  VERSION=$(node -e "const p = require('./package.json'); console.log(p.version)" 2>/dev/null || echo "0.1.0")
  cat > src/generated/appVersion.ts << EOF
// Auto-generated - do not edit manually
export const APP_VERSION = "${VERSION}";
export const APP_VERSION_LABEL = "v${VERSION}";
EOF
  echo "✓ appVersion.ts 생성 완료"
fi

if [ ! -f "public/version.json" ]; then
  mkdir -p public
  VERSION=$(node -e "const p = require('./package.json'); console.log(p.version)" 2>/dev/null || echo "0.1.0")
  cat > public/version.json << EOF
{
  "version": "${VERSION}",
  "label": "v${VERSION}",
  "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
  echo "✓ version.json 생성 완료"
fi

echo ""
echo "=== Where Weather 세션 준비 완료 ==="
