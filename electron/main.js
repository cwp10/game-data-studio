const { app, BrowserWindow, shell, globalShortcut } = require("electron");
const path = require("node:path");
const { spawn } = require("node:child_process");
const http = require("node:http");

app.setName("Game Data Studio");
app.commandLine.appendSwitch("disable-http-cache");

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
  const { existsSync } = require("node:fs");

  if (!existsSync(path.join(standalonePath, "server.js"))) {
    console.error("standalone server.js not found:", standalonePath);
    return false;
  }

  // standalone 서버를 메인 프로세스에서 직접 실행 (fork/spawn 없이 가장 안정적)
  const prevCwd = process.cwd();
  try {
    process.chdir(standalonePath);
    process.env.PORT = String(PORT);
    process.env.HOSTNAME = "127.0.0.1";
    process.env.GDS_DATA_DIR = dataDir;
    process.env.NODE_ENV = "production";
    require(standalonePath + "/server.js");
  } catch (e) {
    if (e.code === "EADDRINUSE") {
      // 포트가 이미 사용 중이면 기존 서버 활용
      console.log("Port already in use, using existing server");
    } else {
      console.error("Failed to start standalone server:", e);
      process.chdir(prevCwd);
      return false;
    }
  }
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
  if (serverProc) serverProc.kill();
  globalShortcut.unregisterAll();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
