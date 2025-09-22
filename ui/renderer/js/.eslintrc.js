module.exports = {
    env: {
        browser: true,
        es2021: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'script'
    },
    globals: {
        // Electron API
        window: 'readonly',
        electron: 'readonly',

        // 전역 변수
        currentProject: 'writable',
        activeContent: 'writable',
        notificationsEnabled: 'writable',
        recentProjectsList: 'writable',
        currentModalCallback: 'writable',

        // app.js 함수들
        initializeApp: 'writable',
        loadAppConfig: 'writable',
        updateNotificationUI: 'writable',
        loadRecentProjects: 'writable',
        selectNewProject: 'writable',
        openCurrentProject: 'writable',
        showRecentProjects: 'writable',
        openRecentProject: 'writable',
        goHome: 'writable',
        showContent: 'writable',
        showTerminalTab: 'writable',
        toggleTerminal: 'writable',
        toggleNotifications: 'writable',
        saveNotificationSettings: 'writable',

        // project.js 함수들
        checkDGitAvailability: 'writable',
        checkIfRepository: 'writable',
        selectProjectWithoutDGit: 'writable',
        openProjectWithoutDGit: 'writable',
        loadProjectFilesOnly: 'writable',
        initializeRepository: 'writable',
        openProject: 'writable',
        showDGitInitPrompt: 'writable',
        openProjectDirectly: 'writable',
        loadProjectData: 'writable',
        loadProjectFiles: 'writable',
        loadCommitHistory: 'writable',
        updateProjectStatus: 'writable',
        updateFileStatuses: 'writable',
        changeProject: 'writable',
        scanProject: 'writable',
        showInFinder: 'writable',

        // git.js 함수들
        commitChanges: 'writable',
        performCommit: 'writable',
        addAllFiles: 'writable',
        restoreFiles: 'writable',
        performRestore: 'writable',
        createBranch: 'writable',
        createNewBranch: 'writable',
        restoreToCommit: 'writable',
        performRestoreToCommit: 'writable',
        parseGitStatus: 'writable',
        getGitStatusText: 'writable',
        parseCommitLog: 'writable',
        formatCommitDate: 'writable',
        updateBranchGraph: 'writable',

        // ui.js 함수들
        renderFiles: 'writable',
        renderCommits: 'writable',
        isPreviewableImage: 'writable',
        showImagePreview: 'writable',
        closeImagePreview: 'writable',
        selectFile: 'writable',
        showModal: 'writable',
        closeModal: 'writable',
        confirmModal: 'writable',
        showToast: 'writable',
        updateTerminalStatus: 'writable',
        viewCommit: 'writable',
        viewCommitDiff: 'writable',
        getFileIcon: 'writable',
        getStatusColor: 'writable',
        showLoadingSpinner: 'writable',
        hideLoadingSpinner: 'writable',
        addAnimation: 'writable',
        triggerHapticFeedback: 'writable',
        showEmptyState: 'writable',
        showErrorState: 'writable',
        showProgressBar: 'writable',
        showContextMenu: 'writable',
        setupDropZone: 'writable',
        showKeyboardShortcuts: 'writable',
        toggleTheme: 'writable',
        toggleFullscreen: 'writable',
        toggleDevTools: 'writable',

        // utils.js 함수들
        formatFileSize: 'writable',
        formatDate: 'writable',
        formatRelativeTime: 'writable',
        formatAbsoluteTime: 'writable',
        truncateString: 'writable',
        getFileExtension: 'writable',
        removeFileExtension: 'writable',
        formatNumber: 'writable',
        formatPercent: 'writable',
        debounce: 'writable',
        throttle: 'writable',
        deepClone: 'writable',
        isEqual: 'writable',
        uniqueArray: 'writable',
        shuffleArray: 'writable',
        generateRandomString: 'writable',
        generateUUID: 'writable',

        // 유틸리티 객체들
        ColorUtils: 'writable',
        StorageUtils: 'writable',
        UrlUtils: 'writable',
        ErrorUtils: 'writable',
        PerformanceUtils: 'writable',
        EnvUtils: 'writable',
        Utils: 'writable'
    },
    rules: {
        'no-unused-vars': ['warn', {
            'varsIgnorePattern': '^(selectExistingProject)$',
            'argsIgnorePattern': '^_'
        }],
        'no-undef': 'error',
        'quotes': ['warn', 'single'],
        'semi': ['warn', 'always']
    }
};