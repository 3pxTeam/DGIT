const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * DGit CLI 연동 클래스
 * DGit 명령어들을 래핑하고 Electron 앱에서 사용할 수 있도록 함
 */
class DGitIntegration {
    constructor() {
        this.dgitPath = this.findDGitPath();
        this.isAvailable = false;
        this.version = null;
        this.init();
    }

    /**
     * DGit CLI 초기화 및 사용 가능 여부 확인
     */
    async init() {
        try {
            // DGit은 --version 플래그를 지원하지 않으므로 help 명령으로 테스트
            const result = await this.executeCommand('help');
            this.isAvailable = true;
            this.version = 'DGit CLI Available';
            console.log(`DGit CLI found at ${this.dgitPath}`);
        } catch (error) {
            console.warn('DGit CLI not available:', error.message);
            this.isAvailable = false;
        }
    }

    /**
     * DGit CLI 경로 찾기
     * 여러 가능한 위치에서 DGit 실행파일을 찾음
     */
    findDGitPath() {
        const possiblePaths = [
            // 프로젝트 내 DGit 바이너리 (현재 프로젝트 구조)
            path.join(__dirname, '..', 'dgit', 'dgit-mac'),
            path.resolve(__dirname, '../dgit/dgit-mac'),
            path.join(__dirname, '..', 'dgit', 'dgit'),
            path.resolve(__dirname, '../dgit/dgit'),
            
            // 번들된 바이너리 (앱과 함께 패키징된 경우)
            path.join(process.resourcesPath, 'bin', 'dgit'),
            path.join(__dirname, 'bin', 'dgit'),
            
            // 사용자 데스크탑의 DGIT 폴더
            path.join(os.homedir(), 'Desktop', 'DGIT-MAC-master', 'dgit', 'dgit'),
            path.join(os.homedir(), 'Desktop', 'DGIT', 'dgit', 'dgit'),
            path.join(os.homedir(), 'Desktop', 'DGIT', 'dgit'),
            
            // 일반적인 설치 경로들
            '/usr/local/bin/dgit',
            '/opt/homebrew/bin/dgit',
            path.join(os.homedir(), '.local', 'bin', 'dgit'),
            path.join(os.homedir(), 'bin', 'dgit'),
            
            // Windows 경로들
            'C:\\Program Files\\DGit\\dgit.exe',
            'C:\\Program Files (x86)\\DGit\\dgit.exe',
            path.join(os.homedir(), 'AppData', 'Local', 'DGit', 'dgit.exe'),
            
            // PATH에서 찾기 (기본값)
            'dgit'
        ];
        
        // 실제로 존재하는 경로 찾기
        for (const dgitPath of possiblePaths) {
            try {
                if (dgitPath !== 'dgit' && fs.existsSync(dgitPath)) {
                    // 실행 권한 확인 (Unix 계열)
                    if (process.platform !== 'win32') {
                        const stats = fs.statSync(dgitPath);
                        if (!(stats.mode & parseInt('111', 8))) {
                            continue; // 실행 권한이 없음
                        }
                    }
                    return dgitPath;
                }
            } catch (error) {
                continue; // 다음 경로 시도
            }
        }
        
        return 'dgit'; // PATH에서 찾기 (마지막 수단)
    }

    /**
     * DGit CLI가 사용 가능한지 확인
     */
    isReady() {
        return this.isAvailable;
    }

    /**
     * DGit 버전 정보 반환
     */
    getVersion() {
        return this.version;
    }

    /**
     * DGit 명령어 실행
     * @param {string} command - 실행할 명령어
     * @param {Array} args - 명령어 인수들
     * @param {string} cwd - 작업 디렉토리
     * @param {Object} options - 추가 옵션들
     */
    async executeCommand(command, args = [], cwd = null, options = {}) {
        return new Promise((resolve, reject) => {
            const allArgs = command ? [command, ...args] : args;
            const spawnOptions = {
                cwd: cwd || process.cwd(),
                env: { ...process.env, ...options.env },
                ...options
            };

            console.log(`[DGit] Executing: ${this.dgitPath} ${allArgs.join(' ')}`);
            console.log(`[DGit] Working directory: ${spawnOptions.cwd}`);

            const childProcess = spawn(this.dgitPath, allArgs, spawnOptions);
            
            let stdout = '';
            let stderr = '';

            // 출력 스트림 처리
            childProcess.stdout?.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                if (options.onOutput) {
                    options.onOutput(output, 'stdout');
                }
            });

            childProcess.stderr?.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                if (options.onOutput) {
                    options.onOutput(output, 'stderr');
                }
            });

            // 프로세스 종료 처리
            childProcess.on('close', (code, signal) => {
                console.log(`[DGit] Command finished with code: ${code}, signal: ${signal}`);
                
                if (code === 0) {
                    resolve({
                        output: stdout,
                        error: stderr,
                        code: code,
                        success: true
                    });
                } else {
                    reject({
                        output: stdout,
                        error: stderr || `Process exited with code ${code}`,
                        code: code,
                        success: false
                    });
                }
            });

            // 에러 처리
            childProcess.on('error', (error) => {
                console.error('[DGit] Process error:', error);
                reject({
                    output: stdout,
                    error: error.message,
                    code: -1,
                    success: false
                });
            });

            // 타임아웃 처리
            if (options.timeout) {
                setTimeout(() => {
                    childProcess.kill('SIGTERM');
                    reject({
                        output: stdout,
                        error: 'Command timed out',
                        code: -1,
                        success: false
                    });
                }, options.timeout);
            }
        });
    }

    // ====== DGit 기본 명령어들 ======

    /**
     * 저장소 초기화
     */
    async init(projectPath) {
        return this.executeCommand('init', [], projectPath);
    }

    /**
     * 파일 상태 확인
     */
    async status(projectPath) {
        return this.executeCommand('status', [], projectPath);
    }

    /**
     * 파일 추가 (스테이징)
     */
    async add(projectPath, files = ['.']) {
        const fileArgs = Array.isArray(files) ? files : [files];
        return this.executeCommand('add', fileArgs, projectPath);
    }

    /**
     * 변경사항 커밋
     */
    async commit(projectPath, message, options = {}) {
        const args = ['-m', message];
        
        // 추가 옵션들
        if (options.author) {
            args.push('--author', options.author);
        }
        if (options.amend) {
            args.push('--amend');
        }
        if (options.noEdit) {
            args.push('--no-edit');
        }
        
        return this.executeCommand('commit', args, projectPath);
    }

    /**
     * 커밋 히스토리 조회
     */
    async log(projectPath, options = {}) {
        const args = [];
        
        // 옵션 처리
        if (options.limit) {
            args.push(`--max-count=${options.limit}`);
        }
        if (options.oneline) {
            args.push('--oneline');
        }
        if (options.graph) {
            args.push('--graph');
        }
        if (options.format) {
            args.push(`--pretty=${options.format}`);
        }
        if (options.since) {
            args.push(`--since="${options.since}"`);
        }
        if (options.until) {
            args.push(`--until="${options.until}"`);
        }
        
        return this.executeCommand('log', args, projectPath);
    }

    /**
     * 브랜치 관련 작업
     */
    async branch(projectPath, action = 'list', branchName = null, options = {}) {
        const args = [];
        
        switch (action) {
            case 'list':
                if (options.all) args.push('-a');
                if (options.remote) args.push('-r');
                break;
                
            case 'create':
                if (!branchName) throw new Error('Branch name is required for create action');
                args.push(branchName);
                if (options.checkout) args.unshift('-b');
                break;
                
            case 'delete':
                if (!branchName) throw new Error('Branch name is required for delete action');
                args.push('-d', branchName);
                if (options.force) args[0] = '-D';
                break;
                
            case 'rename':
                args.push('-m');
                if (options.oldName) args.push(options.oldName);
                if (branchName) args.push(branchName);
                break;
        }
        
        return this.executeCommand('branch', args, projectPath);
    }

    /**
     * 브랜치 전환
     */
    async checkout(projectPath, target, options = {}) {
        const args = [target];
        
        if (options.createBranch) {
            args.unshift('-b');
        }
        if (options.force) {
            args.unshift('-f');
        }
        
        return this.executeCommand('checkout', args, projectPath);
    }

    /**
     * 파일/커밋 차이점 보기
     */
    async diff(projectPath, options = {}) {
        const args = [];
        
        if (options.staged) {
            args.push('--staged');
        }
        if (options.cached) {
            args.push('--cached');
        }
        if (options.nameOnly) {
            args.push('--name-only');
        }
        if (options.statOnly) {
            args.push('--stat');
        }
        if (options.commit1 && options.commit2) {
            args.push(options.commit1, options.commit2);
        } else if (options.commit1) {
            args.push(options.commit1);
        }
        if (options.files) {
            args.push('--', ...options.files);
        }
        
        return this.executeCommand('diff', args, projectPath);
    }

    /**
     * 파일 복원
     */
    async restore(projectPath, files, options = {}) {
        const args = [];
        
        if (options.staged) {
            args.push('--staged');
        }
        if (options.source) {
            args.push('--source', options.source);
        }
        if (options.worktree) {
            args.push('--worktree');
        }
        
        // 파일들 추가
        const fileList = Array.isArray(files) ? files : [files];
        args.push(...fileList);
        
        return this.executeCommand('restore', args, projectPath);
    }

    /**
     * 특정 커밋의 파일들 복원
     */
    async reset(projectPath, target = 'HEAD', options = {}) {
        const args = [];
        
        if (options.hard) {
            args.push('--hard');
        } else if (options.soft) {
            args.push('--soft');
        } else if (options.mixed) {
            args.push('--mixed');
        }
        
        args.push(target);
        
        if (options.files) {
            args.push('--', ...options.files);
        }
        
        return this.executeCommand('reset', args, projectPath);
    }

    // ====== 유틸리티 함수들 ======

    /**
     * 저장소인지 확인
     */
    async isRepository(projectPath) {
        try {
            // DGit CLI가 사용 가능한지 먼저 확인
            if (!this.isAvailable) {
                console.warn('DGit CLI is not available');
                return false;
            }
            
            const result = await this.executeCommand('status', [], projectPath);
            return result.success;
        } catch (error) {
            console.log(`Repository check failed for ${projectPath}:`, error.message);
            return false;
        }
    }

    /**
     * 현재 브랜치 이름 가져오기
     */
    async getCurrentBranch(projectPath) {
        try {
            const result = await this.executeCommand('branch', ['--show-current'], projectPath);
            return result.output.trim();
        } catch (error) {
            return 'main'; // 기본값
        }
    }

    /**
     * 변경된 파일 목록 가져오기
     */
    async getChangedFiles(projectPath) {
        try {
            const result = await this.status(projectPath);
            // 상태 출력을 파싱하여 변경된 파일 목록 반환
            return this.parseStatusOutput(result.output);
        } catch (error) {
            return [];
        }
    }

    /**
     * 상태 출력 파싱
     */
    parseStatusOutput(output) {
        const files = [];
        const lines = output.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            // DGit 상태 출력 형식에 맞게 파싱
            // 예: "M  filename.psd" 또는 "A  newfile.ai"
            const match = trimmed.match(/^([MAD?!])\s+(.+)$/);
            if (match) {
                const [, status, filename] = match;
                files.push({
                    filename: filename,
                    status: this.getStatusText(status),
                    statusCode: status
                });
            }
        }
        
        return files;
    }

    /**
     * 상태 코드를 텍스트로 변환
     */
    getStatusText(statusCode) {
        const statusMap = {
            'M': 'modified',
            'A': 'added',
            'D': 'deleted',
            'R': 'renamed',
            'C': 'copied',
            'U': 'updated',
            '?': 'untracked',
            '!': 'ignored'
        };
        return statusMap[statusCode] || 'unknown';
    }

    /**
     * 커밋 로그를 파싱하여 구조화된 데이터 반환
     */
    parseLogOutput(output) {
        const commits = [];
        const commitBlocks = output.split('\n\n').filter(block => block.trim());
        
        for (const block of commitBlocks) {
            const lines = block.split('\n');
            const commit = {};
            
            for (const line of lines) {
                if (line.startsWith('commit ')) {
                    commit.hash = line.substring(7).trim();
                } else if (line.startsWith('Author: ')) {
                    commit.author = line.substring(8).trim();
                } else if (line.startsWith('Date: ')) {
                    commit.date = line.substring(6).trim();
                } else if (line.trim() && !line.startsWith(' ')) {
                    // 커밋 메시지
                    commit.message = (commit.message || '') + line.trim() + ' ';
                }
            }
            
            if (commit.hash) {
                commit.message = (commit.message || '').trim();
                commits.push(commit);
            }
        }
        
        return commits;
    }
}

module.exports = DGitIntegration;