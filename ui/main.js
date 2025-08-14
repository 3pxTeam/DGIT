const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const os = require("os");

let mainWindow;

// 번들된 dgit 바이너리 경로 찾기
function getBundledDgitPath() {
  const platform = process.platform;
  let dgitName = "dgit";
  
  if (platform === "win32") {
    dgitName = "dgit.exe";
  }
  
  // 개발 모드에서는 상대 경로
  if (process.env.NODE_ENV === "development" || !app.isPackaged) {
    return path.join(__dirname, "..", "dgit", "dgit");
  }
  
  // 프로덕션 모드에서는 resources 폴더의 dgit
  const resourcesPath = process.resourcesPath || path.join(__dirname, "..");
  return path.join(resourcesPath, "dgit");
}

// dgit 명령어가 실제로 작동하는지 테스트
function testDgitCommand(dgitPath) {
  try {
    const { execSync } = require('child_process');
    // --version 또는 help 명령어로 테스트
    try {
      execSync(`"${dgitPath}" --version`, { timeout: 5000, stdio: 'pipe' });
      return true;
    } catch (versionError) {
      // --version이 실패하면 help로 시도
      execSync(`"${dgitPath}" help`, { timeout: 5000, stdio: 'pipe' });
      return true;
    }
  } catch (error) {
    console.log(`    testDgitCommand failed for ${dgitPath}:`, error.message);
    return false;
  }
}

// 시스템에 설치된 dgit 찾기 (백업 방법)
function findSystemDgit() {
  const possiblePaths = [
    // 로그 기준으로 실제 경로 추가
    path.join(os.homedir(), "Desktop", "DGIT", "dgit", "dgit"),
    // 상대 경로로 DGIT 폴더의 dgit 찾기 (ui 폴더 기준)
    path.join(__dirname, "..", "dgit", "dgit"),
    path.join(__dirname, "..", "dgit"),
    // 현재 작업 디렉토리 기준
    path.join(process.cwd(), "dgit", "dgit"),
    path.join(process.cwd(), "..", "dgit", "dgit"),
    // PATH에서 찾기
    "dgit", 
    // 기타 가능한 경로들
    path.join(os.homedir(), "dgit", "dgit"),
    path.join(os.homedir(), "Desktop", "dgit", "dgit"),
    path.join(os.homedir(), "Downloads", "dgit", "dgit"),
    path.join("/usr/local/bin", "dgit"),
    path.join("/opt/dgit", "dgit"),
    path.join(os.homedir(), ".local", "bin", "dgit"),
  ];

  console.log("Searching for dgit in the following paths:");
  
  for (const dgitPath of possiblePaths) {
    try {
      console.log(`  Checking: ${dgitPath}`);
      
      if (dgitPath === "dgit") {
        // PATH에서 확인하는 경우는 실제로 실행해서 확인
        if (testDgitCommand("dgit")) {
          console.log(`  ✓ Found working dgit in PATH`);
          return "dgit";
        } else {
          console.log(`  ✗ dgit in PATH doesn't work`);
          continue;
        }
      } else if (fs.existsSync(dgitPath)) {
        console.log(`  ✓ Found dgit file at: ${dgitPath}`);
        // 파일이 실제로 실행 가능한지 확인
        if (testDgitCommand(dgitPath)) {
          console.log(`  ✓ dgit is executable at: ${dgitPath}`);
          return dgitPath;
        } else {
          console.log(`  ✗ dgit file exists but not executable at: ${dgitPath}`);
        }
      }
    } catch (error) {
      console.log(`  ✗ Error checking ${dgitPath}:`, error.message);
      continue;
    }
  }
  
  console.log("  ✗ DGit not found in any location");
  return null;
}

// DGit 경로 초기화 및 권한 설정
function initializeDgit() {
  // 먼저 번들된 dgit 확인
  const bundledPath = getBundledDgitPath();
  
  if (fs.existsSync(bundledPath)) {
    console.log(`Bundled DGit found at: ${bundledPath}`);
    
    // Unix 계열에서 실행 권한 부여
    if (process.platform !== "win32") {
      try {
        fs.chmodSync(bundledPath, "755");
      } catch (error) {
        console.error("DGit 실행 권한 설정 실패:", error);
      }
    }
    return bundledPath;
  }
  
  // 번들된 dgit이 없으면 시스템에서 찾기
  console.log("Bundled DGit not found, searching system...");
  const systemPath = findSystemDgit();
  
  if (systemPath) {
    console.log(`Using system DGit: ${systemPath}`);
    return systemPath;
  }
  
  console.log("DGit not found anywhere");
  return null;
}

const DGIT_PATH = initializeDgit();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "DGit - Design File Version Control",
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: -100, y: -100 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
    },
  });

  // 올바른 경로로 수정 - renderer 폴더의 index.html
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  // 개발 모드에서만 개발자 도구 열기
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // 🎯 윈도우 로드 완료 후 아이콘 설정
  mainWindow.webContents.once('did-finish-load', () => {
    if (process.platform === "darwin") {
      // ICNS 대신 PNG 사용
      const pngIconPath = path.join(__dirname, "assets", "icon.png");
      console.log("🔍 PNG 아이콘 경로:", pngIconPath);
      console.log("🔍 PNG 파일 존재:", fs.existsSync(pngIconPath));
      
      if (fs.existsSync(pngIconPath)) {
        try {
          app.dock.setIcon(pngIconPath);
          console.log("✅ PNG 독 아이콘 설정 완료!");
        } catch (error) {
          console.log("❌ PNG 독 아이콘 설정 실패:", error.message);
        }
      }
    }
  });

  // 윈도우 설정
  if (process.platform === "win32") {
    const iconPath = path.join(__dirname, "assets", "icon.ico");
    if (fs.existsSync(iconPath)) {
      mainWindow.setIcon(iconPath);
    }
  }
}

// 신호등 버튼 작동을 위한 IPC 핸들러 추가
ipcMain.handle("window-close", () => {
  // 메인 앱이 열려있으면 시작 화면으로 돌아가기
  mainWindow.webContents.executeJavaScript(`
    const startScreen = document.getElementById("startScreen");
    const mainApp = document.getElementById("mainApp");
    if (mainApp.style.display !== "none") {
      startScreen.style.display = "flex";
      mainApp.style.display = "none";
      // 상태 초기화
      window.currentProjectPath = null;
      document.getElementById("currentProject").textContent = "프로젝트를 선택하세요";
      document.getElementById("currentProject").classList.add("empty");
    } else {
      window.close();
    }
  `).catch(() => {
    // JavaScript 실행 실패시 그냥 종료
    mainWindow.close();
  });
});

ipcMain.handle("window-minimize", () => {
  mainWindow.minimize();
});

ipcMain.handle("window-maximize", () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle("open-in-explorer", async (_, fullFilePath) => {
  try {
    await shell.showItemInFolder(fullFilePath);
    return "Finder에서 열기 성공";
  } catch (err) {
    throw new Error("Finder에서 열기 실패: " + err.message);
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers

ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  return result.filePaths[0] || null;
});

// 개선된 DGit 명령어 실행 핸들러
ipcMain.handle("execute-dgit-command", async (_, command, args, workingDir) => {
  return new Promise((resolve, reject) => {
    if (!DGIT_PATH) {
      reject("DGit 실행 파일을 찾을 수 없습니다.\n\n해결 방법:\n1. DGit을 시스템에 설치하고 PATH에 추가\n2. 또는 DGit GUI와 함께 번들된 바이너리 사용");
      return;
    }

    // 명령어 인수 처리 개선
    const processedArgs = args.map(arg => {
      // 이미 따옴표로 감싸진 인수는 그대로 유지
      if (arg.startsWith('"') && arg.endsWith('"')) {
        return arg;
      }
      // 공백이 포함된 인수는 따옴표로 감싸기
      if (arg.includes(' ')) {
        return `"${arg}"`;
      }
      return arg;
    });

    // 커밋 메시지 특별 처리
    let fullCommand;
    if (command === 'commit' && args.includes('-m')) {
      const messageIndex = args.indexOf('-m') + 1;
      const message = args[messageIndex];
      const otherArgs = args.slice(0, messageIndex);
      fullCommand = `"${DGIT_PATH}" ${command} ${otherArgs.join(" ")} -m "${message}"`;
    } else {
      fullCommand = `"${DGIT_PATH}" ${command} ${processedArgs.join(" ")}`;
    }
    console.log(`Executing: ${fullCommand} in ${workingDir}`);
    
    // 환경 변수 설정 추가
    const options = {
      cwd: workingDir,
      env: {
        ...process.env,
        // DGit이 필요로 할 수 있는 환경 변수들
        LC_ALL: 'en_US.UTF-8',
        LANG: 'en_US.UTF-8'
      },
      encoding: 'utf8',
      timeout: 30000 // 30초 타임아웃
    };
    
    exec(fullCommand, options, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command failed: ${fullCommand}`);
        console.error(`Error: ${error.message}`);
        console.error(`Stderr: ${stderr}`);
        
        // DGit이 설치되지 않은 경우 친화적인 메시지
        if (error.message.includes("No such file or directory") || 
            error.message.includes("command not found") ||
            error.message.includes("ENOENT")) {
          reject("DGit이 설치되어 있지 않거나 경로를 찾을 수 없습니다.\n\nDGit을 설치하거나 PATH에 추가해주세요.");
        } else if (error.message.includes("timeout")) {
          reject("명령어 실행 시간이 초과되었습니다. 다시 시도해주세요.");
        } else {
          // stderr가 있으면 그것을 우선 사용, 없으면 error.message 사용
          const errorMsg = stderr?.trim() || error.message || '알 수 없는 오류가 발생했습니다.';
          reject(errorMsg);
        }
      } else {
        const output = stdout?.trim() || "명령이 성공적으로 실행되었습니다.";
        resolve(output);
      }
    });
  });
});

ipcMain.handle("check-dgit-repo", async (_, dirPath) => {
  return fs.existsSync(path.join(dirPath, ".dgit"));
});

ipcMain.handle("get-directory-contents", async (_, dirPath) => {
  try {
    const files = fs.readdirSync(dirPath);
    // 숨김 파일과 시스템 파일 필터링
    return files.filter(file => 
      !file.startsWith('.') && 
      !file.startsWith('~') &&
      !file.toLowerCase().includes('thumbs.db')
    );
  } catch (error) {
    console.error('디렉토리 읽기 실패:', error);
    return [];
  }
});

// 개선된 DGit 정보 핸들러
ipcMain.handle("get-dgit-info", async () => {
  const bundledPath = getBundledDgitPath();
  const isBundled = fs.existsSync(bundledPath);
  
  // 실제 dgit 경로에서 버전 정보 가져오기
  let version = "알 수 없음";
  if (DGIT_PATH) {
    try {
      const { execSync } = require('child_process');
      try {
        const versionOutput = execSync(`"${DGIT_PATH}" --version`, { 
          timeout: 5000, 
          stdio: 'pipe',
          encoding: 'utf8'
        });
        version = versionOutput.trim();
      } catch (versionError) {
        // --version이 실패하면 help로 시도
        const helpOutput = execSync(`"${DGIT_PATH}" help`, { 
          timeout: 5000, 
          stdio: 'pipe',
          encoding: 'utf8'
        });
        version = "설치됨 (버전 확인 불가)";
      }
    } catch (error) {
      console.log("DGit 버전 확인 실패:", error.message);
    }
  }
  
  return {
    path: DGIT_PATH || "DGit을 찾을 수 없음",
    found: !!DGIT_PATH,
    bundled: isBundled,
    bundledPath: bundledPath,
    type: isBundled && DGIT_PATH === bundledPath ? "번들됨" : "시스템",
    version: version,
    platform: process.platform,
    arch: process.arch
  };
});

// 최근 프로젝트 관리
const recentProjectsPath = path.join(os.homedir(), '.dgit-gui', 'recent-projects.json');

function ensureConfigDir() {
  const configDir = path.dirname(recentProjectsPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

function getRecentProjects() {
  try {
    ensureConfigDir();
    if (fs.existsSync(recentProjectsPath)) {
      const data = fs.readFileSync(recentProjectsPath, 'utf8');
      const projects = JSON.parse(data);
      // 존재하지 않는 경로 필터링
      return projects.filter(project => fs.existsSync(project.path));
    }
  } catch (error) {
    console.error('Error reading recent projects:', error);
  }
  return [];
}

function saveRecentProjects(projects) {
  try {
    ensureConfigDir();
    fs.writeFileSync(recentProjectsPath, JSON.stringify(projects, null, 2));
  } catch (error) {
    console.error('Error saving recent projects:', error);
  }
}

ipcMain.handle("get-recent-projects", async () => {
  return getRecentProjects();
});

ipcMain.handle("add-recent-project", async (_, projectPath) => {
  const projects = getRecentProjects();
  const existingIndex = projects.findIndex(p => p.path === projectPath);
  
  const projectData = {
    path: projectPath,
    name: path.basename(projectPath),
    lastOpened: new Date().toISOString()
  };
  
  if (existingIndex >= 0) {
    projects[existingIndex] = projectData;
  } else {
    projects.unshift(projectData);
  }
  
  // 최대 10개만 저장
  const limitedProjects = projects.slice(0, 10);
  saveRecentProjects(limitedProjects);

  return limitedProjects;
});

ipcMain.handle("remove-recent-project", async (_, projectPath) => {
  const projects = getRecentProjects();
  const filteredProjects = projects.filter(p => p.path !== projectPath);
  saveRecentProjects(filteredProjects);
  return filteredProjects;
});