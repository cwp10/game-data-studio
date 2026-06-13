#!/bin/bash
# 프로젝트 디렉토리에서 직접 실행되는 .app 래퍼 생성
PROJ_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP="$PROJ_DIR/Game Data Studio.app"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
mkdir -p "$APP/Contents/Resources"

# Info.plist
cat > "$APP/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>Game Data Studio</string>
  <key>CFBundleIdentifier</key>
  <string>com.mancheolsoft.game-data-studio.dev</string>
  <key>CFBundleName</key>
  <string>Game Data Studio</string>
  <key>CFBundleDisplayName</key>
  <string>Game Data Studio</string>
  <key>CFBundleVersion</key>
  <string>1.0.0</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>NSSupportsAutomaticGraphicsSwitching</key>
  <true/>
</dict>
</plist>
PLIST

# 실행 스크립트
cat > "$APP/Contents/MacOS/Game Data Studio" << 'SCRIPT'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJ_DIR="$(cd "$SCRIPT_DIR/../../../" && pwd)"
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
fi
ELECTRON="$PROJ_DIR/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
if [ ! -f "$ELECTRON" ]; then
  osascript -e 'display alert "Electron을 찾을 수 없습니다" message "npm install을 실행하세요." as critical'
  exit 1
fi
cd "$PROJ_DIR"
exec "$ELECTRON" "$PROJ_DIR"
SCRIPT

chmod +x "$APP/Contents/MacOS/Game Data Studio"

# 아이콘
if [ -f "$PROJ_DIR/icon-assets/AppIcon.icns" ]; then
  cp "$PROJ_DIR/icon-assets/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"
fi

touch "$APP"
xattr -cr "$APP"

echo "✓ Game Data Studio.app 생성 완료: $APP"
