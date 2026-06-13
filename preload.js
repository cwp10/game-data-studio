const electron = require("electron");
const { contextBridge } = electron;

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  readClipboard: () => {
    try { return electron.clipboard.readText(); } catch { return ""; }
  },
  writeClipboard: (text) => {
    electron.clipboard.writeText(text);
  },
});
