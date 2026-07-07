const { app, BrowserWindow, shell, globalShortcut } = require("electron");
const path = require("node:path");
const { spawn } = require("node:child_process");
const http = require("node:http");

app.setName("Game Data Studio");
app.commandLine.appendSwitch("disable-http-cache");

// GUI 런처(Finder/Dock)에서 실행되면 PATH가 최소화되어(Homebrew 등) node를 못 찾으므로 보강.
// 이 PATH는 spawn 한 Next 서버 프로세스에도 그대로 상속된다.
process.env.PATH = `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ""}`;

const PORT = 3001;
const URL = `http://127.0.0.1:${PORT}`;

let mainWindow = null;
let serverProc = null;

function isUp() {
  return new Promise((resolve) => {
    // 포트 응답만 확인하면 서버가 아직 초기화 중일 수 있어 흰 화면이 뜸.
    // /api/projects 가 유효한 JSON 을 반환할 때만 true — DB·라우트 모두 준비된 상태.
    const req = http.get(`${URL}/api/projects`, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try { JSON.parse(body); resolve(true); }
        catch { resolve(false); }
      });
      res.on("error", () => resolve(false));
    });
    req.on("error", () => resolve(false));
    req.setTimeout(3000, () => { req.destroy(); resolve(false); });
  });
}

async function waitForServer(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isUp()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  mainWindow.loadURL(URL);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    if (mainWindow) mainWindow.webContents.toggleDevTools();
  });
}

async function startProductionServer() {
  const standalonePath = path.join(process.resourcesPath, ".next", "standalone");
  const dataDir = path.join(process.resourcesPath, "data");
  const serverJs = path.join(standalonePath, "server.js");
  const { existsSync } = require("node:fs");

  if (!existsSync(serverJs)) {
    console.error("standalone server.js not found:", standalonePath);
    return false;
  }

  // 시스템 node 자식 프로세스로 실행 (Electron 프로세스 안에서 require 하지 않음).
  // better-sqlite3 등 네이티브 모듈이 시스템 Node ABI로 빌드돼 있어 Electron 자체 ABI로
  // 재빌드할 필요가 없다 — Electron 최신 버전과 better-sqlite3 프리빌드 바이너리 호환 문제 회피.
  serverProc = spawn("node", [serverJs], {
    cwd: standalonePath,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      GDS_DATA_DIR: dataDir,
      NODE_ENV: "production",
    },
    stdio: "inherit",
  });
  return true;
}

app.whenReady().then(async () => {
  if (app.isPackaged) {
    // 프로덕션: standalone 서버 직접 실행
    await startProductionServer();
    const ok = await waitForServer(15000);
    if (!ok) { app.quit(); return; }
  } else {
    // 개발: 빌드 후 CSS 해시가 바뀌므로, 기존 서버를 재사용하지 않고 항상 교체한다.
    const { execSync } = require("node:child_process");
    try {
      const pids = execSync(`lsof -ti:${PORT}`, { encoding: "utf8" }).trim();
      if (pids) {
        execSync(`kill -9 ${pids}`);
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch {}
    const PROJECT_DIR = path.resolve(__dirname, "..");
    const { existsSync } = require("node:fs");
    const hasBuild = existsSync(path.join(PROJECT_DIR, ".next", "BUILD_ID"));
    const script = hasBuild ? "start" : "dev";
    serverProc = spawn("npm", ["run", script], {
      cwd: PROJECT_DIR,
      shell: true,
      stdio: "inherit",
      env: { ...process.env, PORT: String(PORT) },
    });
    const ok = await waitForServer();
    if (!ok) { app.quit(); return; }
  }

  createWindow();
});

app.on("window-all-closed", () => {
  // macOS 관례: 창을 닫아도 서버는 살려두고 dock에 남긴다(재활성화 시 재사용).
  globalShortcut.unregisterAll();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProc) serverProc.kill();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
