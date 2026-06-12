const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const { spawn } = require("node:child_process");
const http = require("node:http");

app.setName("Game Data Studio");

const PROJECT_DIR = path.resolve(__dirname, "..");
const PORT = 3001;
const URL = `http://127.0.0.1:${PORT}`;

let mainWindow = null;
let serverProc = null;

function isUp() {
  return new Promise((resolve) => {
    const req = http.get(URL, (res) => { res.destroy(); resolve(true); });
    req.on("error", () => resolve(false));
    req.setTimeout(800, () => { req.destroy(); resolve(false); });
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
}

app.whenReady().then(async () => {
  // 서버가 이미 떠 있으면(dev 모드) 그냥 사용
  if (await isUp()) {
    createWindow();
    return;
  }

  // next build가 있으면 next start, 없으면 next dev
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
  createWindow();
});

app.on("window-all-closed", () => {
  if (serverProc) serverProc.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
