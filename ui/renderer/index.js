document.addEventListener("DOMContentLoaded", () => {
  // DOM 요소들
  const startScreen = document.getElementById("startScreen");
  const mainApp = document.getElementById("mainApp");
  const newProjectBtn = document.getElementById("newProjectBtn");
  const recentList = document.getElementById("recentList");
  
  const selectDirBtn = document.getElementById("selectDirBtn");
  const homeBtn = document.getElementById("homeBtn");
  const currentProjectEl = document.getElementById("currentProject");
  const navItems = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view");

  // 신호등 버튼들
  const closeBtn = document.getElementById("closeBtn");
  const minimizeBtn = document.getElementById("minimizeBtn");
  const maximizeBtn = document.getElementById("maximizeBtn");

  // 툴바 버튼들
  const initRepoBtn = document.getElementById("initRepoBtn");
  const scanBtn = document.getElementById("scanBtn");
  const refreshStatusBtn = document.getElementById("refreshStatusBtn");
  const addAllBtn = document.getElementById("addAllBtn");
  const commitBtn = document.getElementById("commitBtn");
  const refreshLogBtn = document.getElementById("refreshLogBtn");

  // 파일 관련 버튼들
  const restoreBtn = document.getElementById("restoreBtn");
  const openExplorerBtn = document.getElementById("openExplorerBtn");

  // 콘텐츠 영역들
  const statusContent = document.getElementById("statusContent");
  const fileList = document.getElementById("fileList");
  const historyContent = document.getElementById("historyContent");

  // 터미널 관련
  const terminal = document.getElementById("terminal");
  const clearTerminalBtn = document.getElementById("clearTerminalBtn");
  const terminalWrapper = document.getElementById("terminalWrapper");
  const toggleTerminalBtn = document.getElementById("toggleTerminalBtn");

  // 커밋 모달
  const commitModal = document.getElementById("commitModal");
  const commitMessageTextarea = document.getElementById("commitMessage");
  const cancelCommitBtn = document.getElementById("cancelCommitBtn");
  const confirmCommitBtn = document.getElementById("confirmCommitBtn");
  const modalCloseBtns = document.querySelectorAll(".modal-close");

  // 전역 상태
  let currentProjectPath = null;
  let selectedFilePath = null;
  let isTerminalCollapsed = false;

  // 신호등 버튼 이벤트
  closeBtn.addEventListener("click", async () => {
    // 메인 앱이 열려있으면 시작 화면으로 돌아가기
    if (mainApp.style.display !== "none") {
      await returnToStartScreen();
    } else {
      window.electronAPI.windowClose();
    }
  });

  minimizeBtn.addEventListener("click", () => {
    window.electronAPI.windowMinimize();
  });

  maximizeBtn.addEventListener("click", () => {
    window.electronAPI.windowMaximize();
  });

  // 시작 화면으로 돌아가기 함수
  async function returnToStartScreen() {
    // 상태 초기화
    currentProjectPath = null;
    selectedFilePath = null;
    
    // UI 초기화
    currentProjectEl.textContent = "프로젝트를 선택하세요";
    currentProjectEl.classList.add('empty');
    fileList.innerHTML = "";
    statusContent.innerHTML = "";
    historyContent.innerHTML = '<div class="empty-state">커밋 히스토리가 없습니다</div>';
    
    // 버튼 상태 초기화
    disableProjectButtons();
    restoreBtn.disabled = true;
    openExplorerBtn.disabled = true;
    initRepoBtn.style.display = "none";
    
    // 첫 번째 네비게이션 아이템 활성화
    showView('statusView');
    
    // 화면 전환
    startScreen.style.display = "flex";
    mainApp.style.display = "none";
    
    // 최근 프로젝트 목록 새로고침
    await loadStartScreen();
    
    appendTerminalLine("시작 화면으로 돌아갔습니다");
  }

  // 시작 화면 로드
  async function loadStartScreen() {
    try {
      const recentProjects = await window.electronAPI.getRecentProjects();
      renderRecentProjects(recentProjects);
    } catch (error) {
      console.error("최근 프로젝트 로드 실패:", error);
    }
  }

  // 최근 프로젝트 렌더링
  function renderRecentProjects(projects) {
    recentList.innerHTML = "";
    
    if (projects.length === 0) {
      recentList.innerHTML = `
        <div style="text-align: center; color: var(--macos-text-secondary); padding: 20px;">
          최근 프로젝트가 없습니다
        </div>
      `;
      return;
    }

    projects.forEach(project => {
      const item = document.createElement("div");
      item.className = "recent-item";
      item.innerHTML = `
        <div class="recent-info">
          <div class="recent-name">${project.name}</div>
          <div class="recent-path">${project.path}</div>
        </div>
        <button class="recent-remove" data-path="${project.path}">
          <i class="fas fa-times"></i>
        </button>
      `;
      
      // 프로젝트 클릭 이벤트
      item.querySelector(".recent-info").addEventListener("click", () => {
        openProject(project.path);
      });
      
      // 삭제 버튼 이벤트
      item.querySelector(".recent-remove").addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          const updatedProjects = await window.electronAPI.removeRecentProject(project.path);
          renderRecentProjects(updatedProjects);
        } catch (error) {
          console.error("프로젝트 삭제 실패:", error);
        }
      });
      
      recentList.appendChild(item);
    });
  }

  // 프로젝트 열기
  async function openProject(projectPath) {
    try {
      currentProjectPath = projectPath;
      currentProjectEl.textContent = projectPath;
      currentProjectEl.classList.remove('empty');
      
      // 최근 프로젝트에 추가
      await window.electronAPI.addRecentProject(projectPath);
      
      // 시작 화면 숨기고 메인 앱 표시
      startScreen.style.display = "none";
      mainApp.style.display = "flex";
      
      appendTerminalLine(`프로젝트 경로 선택됨: ${projectPath}`);

      // 저장소 여부 확인
      const isRepo = await window.electronAPI.checkDgitRepo(projectPath);
      if (isRepo) {
        appendTerminalLine(".dgit 저장소가 존재합니다.");
        enableProjectButtons();
        await updateProjectStatus();
        await loadFileList();
        await refreshCommitHistory();
      } else {
        appendTerminalLine(".dgit 저장소가 없습니다.");
        initRepoBtn.style.display = "inline-flex";
        disableProjectButtons();
      }

      // 프로젝트 바뀌면 파일 목록도 초기화 및 버튼 비활성화
      fileList.innerHTML = "";
      selectedFilePath = null;
      restoreBtn.disabled = true;
      openExplorerBtn.disabled = true;
    } catch (error) {
      appendTerminalLine(`에러: 프로젝트 열기 실패 - ${error.message || error}`);
    }
  }

  // 유틸리티 함수들
  function appendTerminalLine(message, type = 'info') {
    const time = new Date().toLocaleTimeString('ko-KR', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    
    const line = document.createElement("div");
    line.className = 'terminal-line';
    line.innerHTML = `<span class="timestamp">[${time}]</span> ${message}`;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
  }

  function clearTerminal() {
    terminal.innerHTML = "";
    appendTerminalLine("터미널이 초기화되었습니다");
  }

  function toggleTerminal() {
    isTerminalCollapsed = !isTerminalCollapsed;
    
    if (isTerminalCollapsed) {
      terminalWrapper.classList.add("terminal-hidden");
      toggleTerminalBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    } else {
      terminalWrapper.classList.remove("terminal-hidden");
      toggleTerminalBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
    }
  }

  function showView(viewName) {
    views.forEach((v) => v.classList.remove("active"));
    navItems.forEach((item) => item.classList.remove("active"));
    
    const target = document.getElementById(viewName);
    const navItem = document.querySelector(`[data-view="${viewName}"]`);
    
    if (target) target.classList.add("active");
    if (navItem) navItem.classList.add("active");
  }

  function enableProjectButtons() {
    scanBtn.disabled = false;
    refreshStatusBtn.disabled = false;
    addAllBtn.disabled = false;
    commitBtn.disabled = false;
  }

  function disableProjectButtons() {
    scanBtn.disabled = true;
    refreshStatusBtn.disabled = true;
    addAllBtn.disabled = true;
    commitBtn.disabled = true;
    initRepoBtn.style.display = "none";
  }

  function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'psd': return { class: 'psd', icon: 'fab fa-adobe' };
      case 'ai': return { class: 'ai', icon: 'fab fa-adobe' };
      case 'sketch': return { class: 'sketch', icon: 'fas fa-vector-square' };
      case 'fig': return { class: 'fig', icon: 'fab fa-figma' };
      case 'xd': return { class: 'xd', icon: 'fab fa-adobe' };
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg': return { class: 'image', icon: 'fas fa-image' };
      default: return { class: 'unknown', icon: 'fas fa-file' };
    }
  }

  function createFileItem(filename, status = null, details = null) {
    const fileIcon = getFileIcon(filename);
    const item = document.createElement('div');
    item.className = 'file-list-item';
    item.dataset.filename = filename;
    
    let statusBadge = '';
    if (status) {
      statusBadge = `<div class="file-status ${status}">${status}</div>`;
    }
    
    item.innerHTML = `
      <div class="file-icon ${fileIcon.class}">
        <i class="${fileIcon.icon}"></i>
      </div>
      <div class="file-info">
        <div class="file-name">${filename}</div>
        <div class="file-details">${details || '디자인 파일'}</div>
      </div>
      ${statusBadge}
    `;
    
    item.addEventListener('click', () => selectFile(item, filename));
    return item;
  }

  function selectFile(element, filename) {
    // 기존 선택 해제
    document.querySelectorAll('.file-list-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    // 새로운 파일 선택
    element.classList.add('selected');
    selectedFilePath = currentProjectPath ? `${currentProjectPath}/${filename}` : filename;
    
    // 버튼 활성화
    restoreBtn.disabled = false;
    openExplorerBtn.disabled = false;
    
    appendTerminalLine(`파일 선택: ${filename}`);
  }

  // 개선된 프로젝트 상태 업데이트 함수
  async function updateProjectStatus() {
    if (!currentProjectPath) return;
    
    try {
      // 파일 개수 가져오기
      const files = await window.electronAPI.getDirectoryContents(currentProjectPath);
      const designFiles = files.filter(file => 
        /\.(psd|ai|sketch|fig|xd|png|jpg|jpeg|svg|gif)$/i.test(file)
      );
      
      const statusCard = document.createElement('div');
      statusCard.className = 'setting-card';
      statusCard.innerHTML = `
        <div class="setting-card-header">
          <i class="fas fa-folder-open"></i>
          프로젝트 정보
        </div>
        <div class="setting-info">
          <div class="info-item" style="grid-column: 1 / -1; margin-bottom: 12px;">
            <div class="info-label">프로젝트 경로</div>
            <div class="info-value" style="font-family: 'SF Mono', Monaco, monospace; font-size: 11px; word-break: break-all; background: var(--macos-bg); padding: 6px 8px; border-radius: 4px; border: 1px solid var(--macos-border);">${currentProjectPath}</div>
          </div>
          <div class="info-item">
            <div class="info-label">상태</div>
            <div class="info-value">DGit 저장소</div>
          </div>
          <div class="info-item">
            <div class="info-label">전체 파일</div>
            <div class="info-value">${files.length}개</div>
          </div>
          <div class="info-item">
            <div class="info-label">디자인 파일</div>
            <div class="info-value">${designFiles.length}개</div>
          </div>
          <div class="info-item">
            <div class="info-label">업데이트</div>
            <div class="info-value">${new Date().toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      `;
      
      // DGit 상태 정보 가져오기 (별도 카드)
      let statusInfo = "상태 확인 중...";
      try {
        const status = await window.electronAPI.executeDgitCommand("status", [], currentProjectPath);
        statusInfo = status;
      } catch (statusError) {
        statusInfo = "상태 확인 실패";
      }
      
      const gitStatusCard = document.createElement('div');
      gitStatusCard.className = 'setting-card';
      gitStatusCard.style.marginTop = '16px';
      gitStatusCard.innerHTML = `
        <div class="setting-card-header">
          <i class="fas fa-info-circle"></i>
          DGit 상태
        </div>
        <div class="setting-info">
          <div class="info-item" style="grid-column: 1 / -1;">
            <div class="info-label">현재 상태</div>
            <div class="info-value" style="font-family: 'SF Mono', Monaco, monospace; font-size: 11px; white-space: pre-wrap; background: var(--macos-bg); padding: 8px; border-radius: 4px; border: 1px solid var(--macos-border); max-height: 150px; overflow-y: auto;">${statusInfo}</div>
          </div>
        </div>
      `;
      
      statusContent.innerHTML = '';
      statusContent.appendChild(statusCard);
      statusContent.appendChild(gitStatusCard);
      
    } catch (error) {
      console.error("프로젝트 상태 업데이트 실패:", error);
    }
  }

  // 파일 목록 로드 함수
  async function loadFileList() {
    if (!currentProjectPath) return;
    
    try {
      const files = await window.electronAPI.getDirectoryContents(currentProjectPath);
      fileList.innerHTML = '';
      
      if (files.length === 0) {
        fileList.innerHTML = `
          <div style="padding: 20px; text-align: center; color: var(--macos-text-secondary);">
            파일이 없습니다
          </div>
        `;
        return;
      }
      
      // 파일을 타입별로 분류하고 정렬
      const designFiles = files.filter(file => 
        /\.(psd|ai|sketch|fig|xd)$/i.test(file)
      );
      const imageFiles = files.filter(file => 
        /\.(png|jpg|jpeg|gif|svg)$/i.test(file)
      );
      const otherFiles = files.filter(file => 
        !/\.(psd|ai|sketch|fig|xd|png|jpg|jpeg|gif|svg)$/i.test(file)
      );
      
      // 디자인 파일 먼저 표시
      [...designFiles, ...imageFiles, ...otherFiles].forEach(filename => {
        const fileItem = createFileItem(filename);
        fileList.appendChild(fileItem);
      });
      
      appendTerminalLine(`${files.length}개의 파일을 발견했습니다 (디자인: ${designFiles.length}, 이미지: ${imageFiles.length}, 기타: ${otherFiles.length})`);
    } catch (error) {
      appendTerminalLine(`오류: 파일 목록 로드 실패 - ${error.message}`);
    }
  }

  // 커밋 히스토리 파싱 및 렌더링
  function parseCommitHistory(logOutput) {
    if (!logOutput || logOutput.trim() === '') {
      return [];
    }

    const commits = [];
    const lines = logOutput.split('\n');
    let currentCommit = null;

    for (const line of lines) {
      if (line.startsWith('commit ')) {
        if (currentCommit) {
          commits.push(currentCommit);
        }
        const hash = line.split(' ')[1];
        currentCommit = {
          hash: hash ? hash.substring(0, 8) : 'unknown',
          fullHash: hash || 'unknown',
          message: '',
          date: '',
          author: '',
          stats: { added: 0, modified: 0, deleted: 0 }
        };
      } else if (line.startsWith('Date: ') && currentCommit) {
        currentCommit.date = line.substring(6).trim();
      } else if (line.startsWith('Author: ') && currentCommit) {
        currentCommit.author = line.substring(8).trim();
      } else if (line.trim() && !line.startsWith(' ') && currentCommit && !currentCommit.message) {
        currentCommit.message = line.trim();
      }
    }

    if (currentCommit) {
      commits.push(currentCommit);
    }

    return commits;
  }

  function renderCommitHistory(commits) {
    if (commits.length === 0) {
      historyContent.innerHTML = `
        <div class="empty-state">
          커밋 히스토리가 없습니다<br>
          <small>첫 번째 커밋을 만들어보세요!</small>
        </div>
      `;
      return;
    }

    const commitList = document.createElement('div');
    commitList.className = 'commit-list';

    commits.forEach((commit, index) => {
      const commitItem = document.createElement('div');
      commitItem.className = 'commit-item';
      
      const relativeDate = getRelativeDate(commit.date);
      
      commitItem.innerHTML = `
        <div class="commit-header">
          <div class="commit-hash">${commit.hash}</div>
          <div class="commit-date">${relativeDate}</div>
        </div>
        <div class="commit-message">${commit.message || '커밋 메시지 없음'}</div>
        <div class="commit-stats">
          <div class="commit-stat added">
            <i class="fas fa-plus"></i>
            ${commit.stats.added} 추가
          </div>
          <div class="commit-stat modified">
            <i class="fas fa-edit"></i>
            ${commit.stats.modified} 수정
          </div>
          <div class="commit-stat deleted">
            <i class="fas fa-minus"></i>
            ${commit.stats.deleted} 삭제
          </div>
        </div>
      `;

      // 커밋 클릭 이벤트
      commitItem.addEventListener('click', () => {
        appendTerminalLine(`커밋 선택: ${commit.hash} - ${commit.message}`);
      });

      commitList.appendChild(commitItem);
    });

    historyContent.innerHTML = '';
    historyContent.appendChild(commitList);
  }

  function getRelativeDate(dateString) {
    if (!dateString) return '날짜 불명';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return '오늘';
      } else if (diffDays === 1) {
        return '어제';
      } else if (diffDays < 7) {
        return `${diffDays}일 전`;
      } else if (diffDays < 30) {
        return `${Math.floor(diffDays / 7)}주 전`;
      } else {
        return date.toLocaleDateString('ko-KR');
      }
    } catch (error) {
      return dateString;
    }
  }

  async function refreshCommitHistory() {
    if (!currentProjectPath) return;
    
    try {
      const log = await window.electronAPI.executeDgitCommand("log", [], currentProjectPath);
      const commits = parseCommitHistory(log);
      renderCommitHistory(commits);
      appendTerminalLine("커밋 히스토리 새로고침 완료");
    } catch (error) {
      appendTerminalLine(`에러: 히스토리 로드 실패 - ${error.message || error}`);
      historyContent.innerHTML = `
        <div class="empty-state">
          커밋 히스토리를 불러올 수 없습니다<br>
          <small>${error.message || error}</small>
        </div>
      `;
    }
  }

  // 디버그 정보 표시 함수
  async function showDebugInfo() {
    try {
      const dgitInfo = await window.electronAPI.getDgitInfo();
      
      const debugCard = document.createElement('div');
      debugCard.className = 'setting-card';
      debugCard.innerHTML = `
        <div class="setting-card-header">
          <i class="fas fa-bug"></i>
          디버그 정보
        </div>
        <div class="setting-info">
          <div class="info-item">
            <div class="info-label">DGit 경로</div>
            <div class="info-value" style="font-family: monospace; font-size: 11px; word-break: break-all;">${dgitInfo.path}</div>
          </div>
          <div class="info-item">
            <div class="info-label">DGit 버전</div>
            <div class="info-value">${dgitInfo.version}</div>
          </div>
          <div class="info-item">
            <div class="info-label">타입</div>
            <div class="info-value">${dgitInfo.type}</div>
          </div>
          <div class="info-item">
            <div class="info-label">플랫폼</div>
            <div class="info-value">${dgitInfo.platform} (${dgitInfo.arch})</div>
          </div>
          <div class="info-item">
            <div class="info-label">발견됨</div>
            <div class="info-value">${dgitInfo.found ? '✅ 예' : '❌ 아니오'}</div>
          </div>
        </div>
      `;
      
      // 설정 뷰에 디버그 정보 추가
      const settingsContent = document.querySelector('.settings-content');
      if (settingsContent) {
        // 기존 디버그 카드 제거
        const existingDebugCard = settingsContent.querySelector('.setting-card:last-child');
        if (existingDebugCard && existingDebugCard.innerHTML.includes('디버그 정보')) {
          existingDebugCard.remove();
        }
        settingsContent.appendChild(debugCard);
      }
      
    } catch (error) {
      appendTerminalLine(`디버그 정보 로드 실패: ${error.message}`);
    }
  }

  // 에러 메시지 파싱 함수
  function parseErrorMessage(error) {
    const errorStr = error.toString();
    
    if (errorStr.includes("nothing to commit")) {
      return "커밋할 변경사항이 없습니다. 먼저 파일을 수정하거나 '모든 파일 추가'를 클릭하세요.";
    }
    
    if (errorStr.includes("not a git repository") || errorStr.includes("not a dgit repository")) {
      return "DGit 저장소가 아닙니다. '저장소 초기화' 버튼을 클릭하세요.";
    }
    
    if (errorStr.includes("No such file or directory")) {
      return "DGit 실행 파일을 찾을 수 없습니다. DGit이 올바르게 설치되었는지 확인하세요.";
    }
    
    if (errorStr.includes("command not found")) {
      return "DGit 명령어를 찾을 수 없습니다. PATH에 DGit이 추가되었는지 확인하세요.";
    }
    
    return errorStr;
  }

  // 이벤트 리스너들
  
  // 시작 화면 이벤트
  newProjectBtn.addEventListener("click", async () => {
    try {
      const dirPath = await window.electronAPI.selectDirectory();
      if (dirPath) {
        await openProject(dirPath);
      }
    } catch (error) {
      appendTerminalLine(`에러: 프로젝트 선택 실패 - ${error.message || error}`);
    }
  });

  // 홈 버튼 이벤트
  homeBtn.addEventListener("click", () => {
    returnToStartScreen();
  });

  selectDirBtn.addEventListener("click", async () => {
    try {
      const dirPath = await window.electronAPI.selectDirectory();
      if (dirPath) {
        await openProject(dirPath);
      }
    } catch (error) {
      appendTerminalLine(`에러: 프로젝트 선택 실패 - ${error.message || error}`);
    }
  });

  initRepoBtn.addEventListener("click", async () => {
    if (!currentProjectPath) return alert("프로젝트를 먼저 선택하세요.");
    try {
      appendTerminalLine("DGit 저장소 초기화 중...");
      const result = await window.electronAPI.executeDgitCommand("init", [], currentProjectPath);
      appendTerminalLine(`저장소 초기화 성공: ${result}`);
      initRepoBtn.style.display = "none";
      enableProjectButtons();
      await updateProjectStatus();
    } catch (e) {
      const errorMsg = parseErrorMessage(e);
      appendTerminalLine(`저장소 초기화 실패: ${errorMsg}`);
    }
  });

  scanBtn.addEventListener("click", async () => {
    if (!currentProjectPath) return alert("프로젝트를 먼저 선택하세요.");
    try {
      appendTerminalLine("프로젝트 스캔 중...");
      const result = await window.electronAPI.executeDgitCommand("scan", [], currentProjectPath);
      appendTerminalLine(`스캔 완료: ${result}`);
    } catch (e) {
      const errorMsg = parseErrorMessage(e);
      appendTerminalLine(`스캔 실패: ${errorMsg}`);
    }
  });

  refreshStatusBtn.addEventListener("click", async () => {
    if (!currentProjectPath) return alert("프로젝트를 먼저 선택하세요.");
    try {
      appendTerminalLine("상태 새로고침 중...");
      const result = await window.electronAPI.executeDgitCommand("status", [], currentProjectPath);
      appendTerminalLine(`상태: ${result}`);
      await updateProjectStatus();
    } catch (e) {
      const errorMsg = parseErrorMessage(e);
      appendTerminalLine(`상태 확인 실패: ${errorMsg}`);
    }
  });

  addAllBtn.addEventListener("click", async () => {
    if (!currentProjectPath) return alert("프로젝트를 먼저 선택하세요.");
    try {
      appendTerminalLine("모든 파일 스테이징 중...");
      const result = await window.electronAPI.executeDgitCommand("add", ["."], currentProjectPath);
      appendTerminalLine(`파일 추가 완료: ${result || "모든 파일이 스테이징되었습니다"}`);
      // 상태 새로고침
      setTimeout(() => updateProjectStatus(), 500);
    } catch (e) {
      const errorMsg = parseErrorMessage(e);
      appendTerminalLine(`파일 추가 실패: ${errorMsg}`);
    }
  });

  commitBtn.addEventListener("click", () => {
    if (!currentProjectPath) return alert("프로젝트를 먼저 선택하세요.");
    commitMessageTextarea.value = "";
    commitModal.classList.add("active");
    commitMessageTextarea.focus();
  });

  function closeCommitModal() {
    commitModal.classList.remove("active");
  }

  cancelCommitBtn.addEventListener("click", closeCommitModal);
  modalCloseBtns.forEach((btn) => btn.addEventListener("click", closeCommitModal));

  // 개선된 커밋 확인 버튼
  confirmCommitBtn.addEventListener("click", async () => {
    const message = commitMessageTextarea.value.trim();
    if (!message) return alert("커밋 메시지를 입력하세요.");
    
    try {
      appendTerminalLine(`커밋 시도: "${message}"`);
      
      // 먼저 파일 추가 (자동으로)
      try {
        appendTerminalLine("파일을 자동으로 스테이징 중...");
        await window.electronAPI.executeDgitCommand("add", ["."], currentProjectPath);
        appendTerminalLine("파일 스테이징 완료");
      } catch (addError) {
        appendTerminalLine(`파일 추가 실패: ${addError}`);
      }
      
      // 상태 확인
      try {
        const status = await window.electronAPI.executeDgitCommand("status", [], currentProjectPath);
        appendTerminalLine(`현재 상태: ${status}`);
      } catch (statusError) {
        appendTerminalLine(`상태 확인 중 오류: ${statusError}`);
      }
      
      // 커밋 실행
      const result = await window.electronAPI.executeDgitCommand("commit", ["-m", message], currentProjectPath);
      appendTerminalLine(`커밋 성공: ${result}`);
      
      closeCommitModal();
      
      // 커밋 후 상태 새로고침
      setTimeout(async () => {
        await refreshCommitHistory();
        await updateProjectStatus();
      }, 500);
      
    } catch (e) {
      const errorMsg = parseErrorMessage(e);
      appendTerminalLine(`커밋 실패: ${errorMsg}`);
      
      if (errorMsg.includes("nothing")) {
        appendTerminalLine("💡 힌트: 변경사항이 없거나 이미 커밋된 상태입니다.");
      }
    }
  });

  refreshLogBtn.addEventListener("click", refreshCommitHistory);

  // 복원 모달 관련 요소들 추가 (DOM 요소 선언 부분에)
const restoreModal = document.getElementById("restoreModal");
const restoreFileName = document.getElementById("restoreFileName");
const versionList = document.getElementById("versionList");
const cancelRestoreBtn = document.getElementById("cancelRestoreBtn");
const confirmRestoreBtn = document.getElementById("confirmRestoreBtn");

let selectedVersion = null;
let currentRestoreFile = null;

// 복원 모달 닫기 함수
function closeRestoreModal() {
  restoreModal.classList.remove("active");
  selectedVersion = null;
  currentRestoreFile = null;
  versionList.innerHTML = "";
  confirmRestoreBtn.disabled = true;
}

// 복원 버튼 이벤트
restoreBtn.addEventListener("click", async () => {
  if (!currentProjectPath) return alert("프로젝트를 먼저 선택하세요.");
  if (!selectedFilePath) return alert("복원할 파일을 선택하세요.");

  try {
    const relativeFilePath = selectedFilePath.replace(currentProjectPath + "/", "");
    currentRestoreFile = relativeFilePath;
    
    // 커밋 히스토리에서 버전 목록 가져오기
    appendTerminalLine("사용 가능한 버전을 확인하는 중...");
    const log = await window.electronAPI.executeDgitCommand("log", [], currentProjectPath);
    const commits = parseCommitHistory(log);

    if (commits.length === 0) {
      appendTerminalLine("복원할 버전이 없습니다. 먼저 커밋을 만드세요.");
      return;
    }

    const availableVersions = commits.map((commit, index) => ({
      version: commits.length - index, // 최신이 가장 높은 번호
      hash: commit.hash,
      message: commit.message || '커밋 메시지 없음',
      date: getRelativeDate(commit.date)
    }));

    // 모달에 파일명과 버전 목록 표시
    restoreFileName.textContent = relativeFilePath;
    versionList.innerHTML = "";

    availableVersions.forEach(version => {
      const versionItem = document.createElement('div');
      versionItem.className = 'version-item';
      versionItem.dataset.version = version.version;
      
      versionItem.innerHTML = `
        <div class="version-info">
          <div class="version-number">버전 ${version.version}</div>
          <div class="version-message">${version.message}</div>
          <div class="version-date">${version.date}</div>
        </div>
        <div class="version-hash">${version.hash}</div>
      `;

      versionItem.addEventListener('click', () => {
        // 기존 선택 해제
        versionList.querySelectorAll('.version-item').forEach(item => {
          item.classList.remove('selected');
        });
        
        // 새로운 선택
        versionItem.classList.add('selected');
        selectedVersion = version.version;
        confirmRestoreBtn.disabled = false;
      });

      versionList.appendChild(versionItem);
    });

    // 모달 표시
    restoreModal.classList.add("active");
    
  } catch (e) {
    appendTerminalLine(`버전 목록 확인 실패: ${parseErrorMessage(e)}`);
  }
});

// 복원 취소 버튼
cancelRestoreBtn.addEventListener("click", closeRestoreModal);

// 복원 확인 버튼
confirmRestoreBtn.addEventListener("click", async () => {
  if (!selectedVersion || !currentRestoreFile) return;

  try {
    const confirmed = confirm(
      `"${currentRestoreFile}" 파일을 버전 ${selectedVersion}으로 복원하시겠습니까?\n\n⚠️ 현재 변경사항은 모두 사라집니다.`
    );
    
    if (!confirmed) return;

    appendTerminalLine(`파일 복원 시도: v${selectedVersion} → ${currentRestoreFile}`);
    
    // DGit restore 명령어 실행
    const result = await window.electronAPI.executeDgitCommand("restore", [selectedVersion.toString(), currentRestoreFile], currentProjectPath);
    appendTerminalLine(`복원 성공: ${result || "파일이 복원되었습니다"}`);
    
    closeRestoreModal();
    
    // 파일 목록 새로고침
    await loadFileList();
    
  } catch (e) {
    const errorMsg = parseErrorMessage(e);
    appendTerminalLine(`복원 실패: ${errorMsg}`);
  }
});

// 복원 모달 외부 클릭 시 닫기
restoreModal.addEventListener("click", (e) => {
  if (e.target === restoreModal) {
    closeRestoreModal();
  }
});

// 모달 닫기 버튼들
document.querySelectorAll("#restoreModal .modal-close").forEach(btn => {
  btn.addEventListener("click", closeRestoreModal);
});

  openExplorerBtn.addEventListener("click", async () => {
    if (!selectedFilePath) return alert("Finder에서 열 파일을 선택하세요.");

    try {
      const result = await window.electronAPI.openInExplorer(selectedFilePath);
      appendTerminalLine(result);
    } catch (e) {
      appendTerminalLine(`Finder에서 열기 실패: ${e}`);
    }
  });

  clearTerminalBtn.addEventListener("click", clearTerminal);
  toggleTerminalBtn.addEventListener("click", toggleTerminal);

  // 네비게이션 이벤트
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const viewName = item.dataset.view;
      showView(viewName);
      
      // 파일 뷰로 전환 시 파일 목록 로드
      if (viewName === 'filesView' && currentProjectPath) {
        loadFileList();
      }
      
      // 설정 뷰로 전환 시 디버그 정보 표시
      if (viewName === 'settingsView') {
        setTimeout(showDebugInfo, 100);
      }
    });
  });

  // 모달 외부 클릭 시 닫기
  commitModal.addEventListener("click", (e) => {
    if (e.target === commitModal) {
      closeCommitModal();
    }
  });

  // macOS 스타일 키보드 단축키
  document.addEventListener("keydown", (e) => {
    if (e.metaKey) { // macOS Command 키
      switch (e.key) {
        case 'o':
          e.preventDefault();
          if (startScreen.style.display !== "none") {
            newProjectBtn.click();
          } else {
            selectDirBtn.click();
          }
          break;
        case 'r':
          e.preventDefault();
          if (!refreshStatusBtn.disabled) {
            refreshStatusBtn.click();
          }
          break;
        case 'w': // Command+W로 시작 화면 돌아가기
          e.preventDefault();
          if (mainApp.style.display !== "none") {
            returnToStartScreen();
          }
          break;
        case 'Enter':
          if (commitModal.classList.contains('active')) {
            e.preventDefault();
            confirmCommitBtn.click();
          }
          break;
        case 'a': // Command+A로 모든 파일 추가
          if (!addAllBtn.disabled && mainApp.style.display !== "none") {
            e.preventDefault();
            addAllBtn.click();
          }
          break;
        case 's': // Command+S로 커밋 (저장 의미)
          if (!commitBtn.disabled && mainApp.style.display !== "none") {
            e.preventDefault();
            commitBtn.click();
          }
          break;
      }
    }
    
    if (e.key === 'Escape') {
      if (commitModal.classList.contains('active')) {
        closeCommitModal();
      } else if (mainApp.style.display !== "none") {
        // Escape로도 시작 화면 돌아가기
        returnToStartScreen();
      }
    }

    // Enter 키로 커밋 모달에서 커밋 실행
    if (e.key === 'Enter' && commitModal.classList.contains('active') && !e.shiftKey) {
      e.preventDefault();
      confirmCommitBtn.click();
    }
  });

  // 터미널 헤더 클릭으로 토글
  document.getElementById('terminalHeader').addEventListener('click', toggleTerminal);

  // 초기화
  loadStartScreen();
  appendTerminalLine("DGit macOS 버전이 시작되었습니다");
  appendTerminalLine("⌘+O로 프로젝트를 선택하여 시작하세요");
  appendTerminalLine("키보드 단축키: ⌘+A(파일추가), ⌘+S(커밋), ⌘+R(새로고침), ⌘+W(홈으로)");
});