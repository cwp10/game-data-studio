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

  // 개발/운영 모두 로컬 Next.js 서버를 로드한다.
  // 이 앱은 API 라우트(SQLite·MCP·claude)가 필요해 정적 export 로는 동작하지 않는다.
  mainWindow.loadURL(`http://localhost:${NEXT_PORT}`);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(async () => {
  // dev: next dev / 운영: next start (둘 다 npm, 정적 export 아님)
  const appRoot = path.join(__dirname, "..");
  nextProcess = spawn("npm", ["run", isDev ? "dev" : "start"], {
    cwd: appRoot,
    shell: true,
    stdio: "inherit",
    // spawn된 서버가 claude 를 찾을 수 있도록 PATH 보강
    env: { ...process.env, PATH: `${process.env.PATH || ""}:${path.join(require("os").homedir(), ".local/bin")}:/opt/homebrew/bin:/usr/local/bin` },
  });
  await waitForNext(`http://localhost:${NEXT_PORT}`);
  createWindow();
});

app.on("window-all-closed", () => {
  if (nextProcess) nextProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
