const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  executeDgitCommand: (command, args, workingDir) =>
    ipcRenderer.invoke("execute-dgit-command", command, args, workingDir),
  checkDgitRepo: (dirPath) => ipcRenderer.invoke("check-dgit-repo", dirPath),
  getDirectoryContents: (dirPath) => ipcRenderer.invoke("get-directory-contents", dirPath),
  openInExplorer: (fullFilePath) => ipcRenderer.invoke("open-in-explorer", fullFilePath),
  getDgitInfo: () => ipcRenderer.invoke("get-dgit-info"),
  
  // 신호등 버튼 제어
  windowClose: () => ipcRenderer.invoke("window-close"),
  windowMinimize: () => ipcRenderer.invoke("window-minimize"),
  windowMaximize: () => ipcRenderer.invoke("window-maximize"),
  
  // 최근 프로젝트 관리
  getRecentProjects: () => ipcRenderer.invoke("get-recent-projects"),
  addRecentProject: (projectPath) => ipcRenderer.invoke("add-recent-project", projectPath),
  removeRecentProject: (projectPath) => ipcRenderer.invoke("remove-recent-project", projectPath),
});