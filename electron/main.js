const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const isDev = !app.isPackaged;
const NEXT_PORT = 3001;

let mainWindow = null;
let nextProcess = null;

function waitForNext(url, retries = 30) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      http.get(url, (res) => {
        if (res.statusCode < 500) resolve();
        else if (n > 0) setTimeout(() => attempt(n - 1), 500);
        else reject(new Error("Next.js did not start in time"));
      }).on("error", () => {
        if (n > 0) setTimeout(() => attempt(n - 1), 500);
        else reject(new Error("Next.js not reachable"));
      });
    };
    attempt(retries);
  });
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

  const url = isDev
    ? `http://localhost:${NEXT_PORT}`
    : `file://${path.join(__dirname, "../out/index.html")}`;

  mainWindow.loadURL(url);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(async () => {
  if (isDev) {
    // Next.js dev server 실행
    nextProcess = spawn("pnpm", ["dev"], {
      cwd: path.join(__dirname, ".."),
      shell: true,
      stdio: "inherit",
    });
    await waitForNext(`http://localhost:${NEXT_PORT}`);
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (nextProcess) nextProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
