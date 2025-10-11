package status

import (
	"archive/zip"
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"dgit/internal/log"
	"github.com/gabstv/go-bsdiff/pkg/bspatch"
	"github.com/pierrec/lz4/v4"
)

// StatusManager handles working directory status operations with delta support
type StatusManager struct {
	DgitDir      string
	ObjectsDir   string
	SnapshotsDir string
	DeltasDir    string
}

// NewStatusManager creates a new status manager
func NewStatusManager(dgitDir string) *StatusManager {
	objectsDir := filepath.Join(dgitDir, "objects")
	return &StatusManager{
		DgitDir:      dgitDir,
		ObjectsDir:   objectsDir,
		SnapshotsDir: filepath.Join(dgitDir, "snapshots"),
		DeltasDir:    filepath.Join(dgitDir, "deltas"),
	}
}

// GetSnapshotFileHashes loads a commit's files and returns a map of file paths to their SHA256 hashes
func (sm *StatusManager) GetSnapshotFileHashes(commitVersion int) (map[string]string, error) {
	// Load commit information to determine storage method
	logManager := log.NewLogManager(sm.DgitDir)
	commit, err := logManager.GetCommit(commitVersion)
	if err != nil {
		return make(map[string]string), nil // Return empty map if commit doesn't exist
	}

	// Choose extraction method based on commit storage type
	if commit.CompressionInfo != nil {
		switch commit.CompressionInfo.Strategy {
		case "lz4":
			// ✅ LZ4 snapshot extraction
			return sm.extractHashesFromLZ4(commit.CompressionInfo.OutputFile, commitVersion)
		case "zip":
			// Direct ZIP extraction
			return sm.extractHashesFromZip(commit.CompressionInfo.OutputFile)
		case "bsdiff", "xdelta3":
			// Delta chain restoration
			return sm.extractHashesFromDeltaChain(commitVersion)
		case "psd_smart":
			// PSD Smart Delta chain restoration
			return sm.extractHashesFromDeltaChain(commitVersion)
		}
	}

	// Fallback to legacy ZIP
	if commit.SnapshotZip != "" {
		return sm.extractHashesFromZip(commit.SnapshotZip)
	}

	return make(map[string]string), nil
}

// extractHashesFromZip extracts file hashes from a ZIP file
func (sm *StatusManager) extractHashesFromZip(zipFileName string) (map[string]string, error) {
	zipPath := filepath.Join(sm.ObjectsDir, zipFileName)

	r, err := zip.OpenReader(zipPath)
	if err != nil {
		if os.IsNotExist(err) {
			return make(map[string]string), nil // Return empty map if snapshot file doesn't exist
		}
		return nil, fmt.Errorf("failed to open snapshot zip %q: %w", zipPath, err)
	}
	defer r.Close()

	fileHashes := make(map[string]string)
	for _, f := range r.File {
		rc, err := f.Open()
		if err != nil {
			continue // Skip error files, they will be tracked separately
		}

		hash := sha256.New()
		if _, err := io.Copy(hash, rc); err != nil {
			rc.Close()
			continue // Skip error files, they will be tracked separately
		}
		rc.Close()

		fileHashes[f.Name] = fmt.Sprintf("%x", hash.Sum(nil))
	}
	return fileHashes, nil
}

// extractHashesFromDeltaChain restores delta chain and extracts hashes
func (sm *StatusManager) extractHashesFromDeltaChain(targetVersion int) (map[string]string, error) {
	// Find restoration path
	restorationPath, err := sm.findRestorationPath(targetVersion)
	if err != nil {
		return make(map[string]string), fmt.Errorf("failed to find restoration path: %w", err)
	}

	// Create temporary file for restoration
	tempFile := filepath.Join(sm.ObjectsDir, fmt.Sprintf("temp_status_%d.zip", targetVersion))
	defer os.Remove(tempFile)

	// Execute restoration
	err = sm.executeRestorationPath(restorationPath, tempFile)
	if err != nil {
		return make(map[string]string), fmt.Errorf("failed to restore delta chain: %w", err)
	}

	// Extract hashes from restored ZIP
	return sm.extractHashesFromTempZip(tempFile)
}

// findRestorationPath finds the sequence of operations to restore a version
func (sm *StatusManager) findRestorationPath(targetVersion int) ([]RestorationStep, error) {
	var path []RestorationStep
	currentVersion := targetVersion

	// Work backwards to find the restoration chain
	for currentVersion > 0 {
		// Priority 1: Check snapshots directory for LZ4
		snapshotPath := filepath.Join(sm.SnapshotsDir, fmt.Sprintf("v%d.lz4", currentVersion))
		if sm.fileExists(snapshotPath) {
			step := RestorationStep{
				Type:    "lz4",
				File:    snapshotPath,
				Version: currentVersion,
			}
			path = append([]RestorationStep{step}, path...)
			break
		}

		// Priority 2: Check for direct ZIP snapshot (legacy)
		zipPath := filepath.Join(sm.ObjectsDir, fmt.Sprintf("v%d.zip", currentVersion))
		if sm.fileExists(zipPath) {
			step := RestorationStep{
				Type:    "zip",
				File:    zipPath,
				Version: currentVersion,
			}
			path = append([]RestorationStep{step}, path...)
			break
		}

		// Priority 3: Look for bsdiff delta files in deltas/
		deltaPath := filepath.Join(sm.DeltasDir, fmt.Sprintf("v%d_from_v%d.bsdiff", currentVersion, currentVersion-1))
		if sm.fileExists(deltaPath) {
			step := RestorationStep{
				Type:    "bsdiff",
				File:    deltaPath,
				Version: currentVersion,
			}
			path = append([]RestorationStep{step}, path...)
			currentVersion--
			continue
		}

		// Priority 4: Look for psd_smart delta files in deltas/
		psdSmartPath := filepath.Join(sm.DeltasDir, fmt.Sprintf("v%d_from_v%d.psd_smart", currentVersion, currentVersion-1))
		if sm.fileExists(psdSmartPath) {
			step := RestorationStep{
				Type:    "psd_smart",
				File:    psdSmartPath,
				Version: currentVersion,
			}
			path = append([]RestorationStep{step}, path...)
			currentVersion--
			continue
		}

		// Priority 5: Check legacy deltas (objects/deltas/)
		legacyDeltaPath := filepath.Join(sm.ObjectsDir, "deltas", fmt.Sprintf("v%d_from_v%d.bsdiff", currentVersion, currentVersion-1))
		if sm.fileExists(legacyDeltaPath) {
			step := RestorationStep{
				Type:    "bsdiff",
				File:    legacyDeltaPath,
				Version: currentVersion,
			}
			path = append([]RestorationStep{step}, path...)
			currentVersion--
			continue
		}

		return nil, fmt.Errorf("missing restoration data for version %d", currentVersion)
	}

	if len(path) == 0 {
		return nil, fmt.Errorf("no restoration path found for version %d", targetVersion)
	}

	return path, nil
}

// executeRestorationPath executes the restoration plan
func (sm *StatusManager) executeRestorationPath(path []RestorationStep, outputFile string) error {
	// Start with the base file
	baseStep := path[0]

	// Create working file based on base type
	tempFile := filepath.Join(sm.ObjectsDir, fmt.Sprintf("temp_restore_%d.zip", time.Now().UnixNano()))

	switch baseStep.Type {
	case "lz4":
		// Convert LZ4 to ZIP for restoration
		if err := sm.convertLZ4ToZip(baseStep.File, tempFile); err != nil {
			return err
		}
	case "zip":
		// Copy ZIP directly
		if err := sm.copyFile(baseStep.File, tempFile); err != nil {
			return err
		}
	default:
		return fmt.Errorf("unsupported base file type: %s", baseStep.Type)
	}

	// Apply deltas in sequence
	for i := 1; i < len(path); i++ {
		step := path[i]
		nextTempFile := filepath.Join(sm.ObjectsDir, fmt.Sprintf("temp_status_%d_%d.zip", step.Version, i))

		switch step.Type {
		case "bsdiff":
			if err := sm.applyBsdiffPatch(tempFile, step.File, nextTempFile); err != nil {
				return fmt.Errorf("failed to apply bsdiff patch for v%d: %w", step.Version, err)
			}
		case "psd_smart":
			// PSD smart delta uses same bsdiff format
			if err := sm.applyBsdiffPatch(tempFile, step.File, nextTempFile); err != nil {
				return fmt.Errorf("failed to apply psd_smart patch for v%d: %w", step.Version, err)
			}
		case "xdelta3":
			// Future implementation
			return fmt.Errorf("xdelta3 restoration not yet implemented")
		default:
			return fmt.Errorf("unknown restoration step type: %s", step.Type)
		}

		// Clean up previous temp file and use new one
		os.Remove(tempFile)
		tempFile = nextTempFile
	}

	// Move final result to output location
	if tempFile != outputFile {
		err := sm.copyFile(tempFile, outputFile)
		os.Remove(tempFile)
		return err
	}

	return nil
}

// applyBsdiffPatch applies a bsdiff patch
func (sm *StatusManager) applyBsdiffPatch(oldFile, patchFile, newFile string) error {
	// Open old file
	old, err := os.Open(oldFile)
	if err != nil {
		return fmt.Errorf("failed to open old file: %w", err)
	}
	defer old.Close()

	// Open patch file
	patch, err := os.Open(patchFile)
	if err != nil {
		return fmt.Errorf("failed to open patch file: %w", err)
	}
	defer patch.Close()

	// Create new file
	new, err := os.Create(newFile)
	if err != nil {
		return fmt.Errorf("failed to create new file: %w", err)
	}
	defer new.Close()

	// Apply patch using bspatch
	if err := bspatch.Reader(old, new, patch); err != nil {
		return fmt.Errorf("bspatch failed: %w", err)
	}

	return nil
}

// extractHashesFromTempZip extracts hashes from a temporary ZIP file
func (sm *StatusManager) extractHashesFromTempZip(tempZipPath string) (map[string]string, error) {
	r, err := zip.OpenReader(tempZipPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open temp zip %q: %w", tempZipPath, err)
	}
	defer r.Close()

	fileHashes := make(map[string]string)
	for _, f := range r.File {
		rc, err := f.Open()
		if err != nil {
			continue
		}

		hash := sha256.New()
		if _, err := io.Copy(hash, rc); err != nil {
			rc.Close()
			continue
		}
		rc.Close()

		fileHashes[f.Name] = fmt.Sprintf("%x", hash.Sum(nil))
	}

	return fileHashes, nil
}

// RestorationStep represents a single step in restoration process
type RestorationStep struct {
	Type    string // "zip", "bsdiff", "xdelta3"
	File    string
	Version int
}

// Utility Functions

// fileExists checks if file exists
func (sm *StatusManager) fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// copyFile copies a file
func (sm *StatusManager) copyFile(src, dst string) error {
	source, err := os.Open(src)
	if err != nil {
		return err
	}
	defer source.Close()

	destination, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destination.Close()

	_, err = io.Copy(destination, source)
	return err
}

// extractHashesFromLZ4 extracts file hashes from LZ4 compressed snapshots
func (sm *StatusManager) extractHashesFromLZ4(lz4FileName string, version int) (map[string]string, error) {
	// LZ4 파일 경로 찾기 (snapshots 또는 deltas 또는 versions - 하위 호환)
	var lz4Path string

	// 우선순위 1: snapshots
	lz4Path = filepath.Join(sm.DgitDir, "snapshots", lz4FileName)
	if !sm.fileExists(lz4Path) {
		// 우선순위 2: versions (하위 호환)
		lz4Path = filepath.Join(sm.DgitDir, "versions", lz4FileName)
		if !sm.fileExists(lz4Path) {
			// 우선순위 3: deltas
			lz4Path = filepath.Join(sm.DgitDir, "deltas", lz4FileName)
			if !sm.fileExists(lz4Path) {
				return make(map[string]string), fmt.Errorf("LZ4 file not found: %s", lz4FileName)
			}
		}
	}

	// LZ4 파일 열기
	file, err := os.Open(lz4Path)
	if err != nil {
		return nil, fmt.Errorf("failed to open LZ4 file: %w", err)
	}
	defer file.Close()

	// LZ4 압축 해제
	lz4Reader := lz4.NewReader(file)
	decompressedData, err := io.ReadAll(lz4Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to decompress LZ4: %w", err)
	}

	// 구조화된 데이터에서 파일 해시 추출
	return sm.extractHashesFromStructuredData(decompressedData)
}

// extractHashesFromStructuredData parses FILE:path:size format and calculates hashes
func (sm *StatusManager) extractHashesFromStructuredData(data []byte) (map[string]string, error) {
	fileHashes := make(map[string]string)
	content := string(data)
	pos := 0

	for pos < len(content) {
		// FILE: 헤더 찾기
		headerEnd := strings.Index(content[pos:], "\n")
		if headerEnd == -1 {
			break
		}
		headerEnd += pos

		headerLine := content[pos:headerEnd]
		if !strings.HasPrefix(headerLine, "FILE:") {
			pos = headerEnd + 1
			continue
		}

		// "FILE:path:size" 파싱
		parts := strings.Split(headerLine, ":")
		if len(parts) != 3 {
			pos = headerEnd + 1
			continue
		}

		filePath := parts[1]
		fileSize, err := strconv.ParseInt(parts[2], 10, 64)
		if err != nil || fileSize <= 0 {
			pos = headerEnd + 1
			continue
		}

		// 파일 데이터 추출
		fileDataStart := headerEnd + 1
		fileDataEnd := fileDataStart + int(fileSize)

		if fileDataEnd > len(data) {
			break
		}

		fileData := data[fileDataStart:fileDataEnd]

		// SHA256 해시 계산
		hash := sha256.New()
		hash.Write(fileData)
		fileHashes[filePath] = fmt.Sprintf("%x", hash.Sum(nil))

		pos = fileDataEnd
	}

	return fileHashes, nil
}

// Legacy Functions (preserved for compatibility)

// CalculateFileHash calculates SHA256 hash of a file's content from the filesystem
func CalculateFileHash(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to open file %q: %w", filePath, err)
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", fmt.Errorf("failed to calculate hash for file %q: %w", filePath, err)
	}

	return fmt.Sprintf("%x", hash.Sum(nil)), nil
}

// FileStatus represents the status of a file in the working directory
type FileStatus struct {
	Path           string
	Status         string // "modified", "untracked", "deleted", "staged"
	MetadataChange string // Optional metadata change description
}

// FileStatusResult contains the results of a status check
type FileStatusResult struct {
	ModifiedFiles  []FileStatus
	UntrackedFiles []FileStatus
	DeletedFiles   []FileStatus
	StagedFiles    []FileStatus
}

// CompareWithCommit compares current working directory with a specific commit
func (sm *StatusManager) CompareWithCommit(commitVersion int, currentDirFiles map[string]string) (*FileStatusResult, error) {
	var lastCommitFileHashes map[string]string
	var err error

	if commitVersion > 0 {
		lastCommitFileHashes, err = sm.GetSnapshotFileHashes(commitVersion)
		if err != nil {
			return nil, fmt.Errorf("failed to load commit snapshot files (v%d): %w", commitVersion, err)
		}
	} else {
		lastCommitFileHashes = make(map[string]string) // Empty map if no commits
	}

	result := &FileStatusResult{
		ModifiedFiles:  []FileStatus{},
		UntrackedFiles: []FileStatus{},
		DeletedFiles:   []FileStatus{},
	}

	// Find modified and untracked files
	for path, currentHash := range currentDirFiles {
		if lastCommitHash, ok := lastCommitFileHashes[path]; ok {
			// File existed in last commit, check if modified
			if lastCommitHash != currentHash {
				result.ModifiedFiles = append(result.ModifiedFiles, FileStatus{
					Path:   path,
					Status: "modified",
				})
			}
		} else {
			// File didn't exist in last commit, so it's untracked
			result.UntrackedFiles = append(result.UntrackedFiles, FileStatus{
				Path:   path,
				Status: "untracked",
			})
		}
	}

	// Find deleted files
	for lastCommitPath := range lastCommitFileHashes {
		if _, ok := currentDirFiles[lastCommitPath]; !ok {
			// File existed in last commit but not in current directory
			result.DeletedFiles = append(result.DeletedFiles, FileStatus{
				Path:   lastCommitPath,
				Status: "deleted",
			})
		}
	}

	return result, nil
}

// convertLZ4ToZip converts LZ4 snapshot to ZIP format for delta restoration
func (sm *StatusManager) convertLZ4ToZip(lz4Path, zipPath string) error {
	// Open LZ4 file
	lz4File, err := os.Open(lz4Path)
	if err != nil {
		return fmt.Errorf("failed to open LZ4: %w", err)
	}
	defer lz4File.Close()

	// Decompress LZ4
	lz4Reader := lz4.NewReader(lz4File)
	decompressedData, err := io.ReadAll(lz4Reader)
	if err != nil {
		return fmt.Errorf("failed to decompress LZ4: %w", err)
	}

	// Create ZIP file
	zipFile, err := os.Create(zipPath)
	if err != nil {
		return fmt.Errorf("failed to create ZIP: %w", err)
	}
	defer zipFile.Close()

	zipWriter := zip.NewWriter(zipFile)
	defer zipWriter.Close()

	// Parse structured data and create ZIP entries
	content := string(decompressedData)
	pos := 0

	for pos < len(content) {
		// Find FILE: header
		headerEnd := strings.Index(content[pos:], "\n")
		if headerEnd == -1 {
			break
		}
		headerEnd += pos

		headerLine := content[pos:headerEnd]
		if !strings.HasPrefix(headerLine, "FILE:") {
			pos = headerEnd + 1
			continue
		}

		// Parse "FILE:path:size"
		parts := strings.Split(headerLine, ":")
		if len(parts) != 3 {
			pos = headerEnd + 1
			continue
		}

		filePath := parts[1]
		fileSize, err := strconv.ParseInt(parts[2], 10, 64)
		if err != nil || fileSize <= 0 {
			pos = headerEnd + 1
			continue
		}

		// Extract file data
		fileDataStart := headerEnd + 1
		fileDataEnd := fileDataStart + int(fileSize)

		if fileDataEnd > len(decompressedData) {
			break
		}

		fileData := decompressedData[fileDataStart:fileDataEnd]

		// Create ZIP entry
		zipEntry, err := zipWriter.Create(filePath)
		if err != nil {
			pos = fileDataEnd
			continue
		}

		_, err = zipEntry.Write(fileData)
		if err != nil {
			pos = fileDataEnd
			continue
		}

		pos = fileDataEnd
	}

	return nil
}
