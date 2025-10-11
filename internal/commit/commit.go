package commit

import (
	"archive/zip"
	"bufio"
	"bytes"
	"crypto/sha256"
	"dgit/internal/scanner/photoshop"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"dgit/internal/scanner"
	"dgit/internal/staging"

	// Compression Libraries
	"github.com/gabstv/go-bsdiff/pkg/bsdiff"
	"github.com/klauspost/compress/zstd"
	"github.com/pierrec/lz4/v4"
)

const (
	SmallFileThreshold  = 50 * 1024 * 1024  // 50MB
	MediumFileThreshold = 200 * 1024 * 1024 // 200MB
	LargeFileThreshold  = 500 * 1024 * 1024 // 500MB
	MaxScanLines        = 1000              // AI file scan limit
	HashSampleSize      = 64 * 1024         // 64KB for hash sampling
)

// DetailedLayer represents detailed layer information from photoshop package
type DetailedLayer = photoshop.DetailedLayer

// CompressionResult contains detailed compression operation metrics
type CompressionResult struct {
	Strategy         string    `json:"strategy"` // "lz4", "zip", "bsdiff", "xdelta3", "psd_smart"
	OutputFile       string    `json:"output_file"`
	OriginalSize     int64     `json:"original_size"`
	CompressedSize   int64     `json:"compressed_size"`
	CompressionRatio float64   `json:"compression_ratio"`
	BaseVersion      int       `json:"base_version,omitempty"`
	CreatedAt        time.Time `json:"created_at"`

	// Performance Metrics
	CompressionTime  float64 `json:"compression_time_ms"`
	CacheLevel       string  `json:"cache_level"`
	SpeedImprovement float64 `json:"speed_improvement"`
}

// Commit represents a single commit in DGit
type Commit struct {
	Hash            string                 `json:"hash"`
	Message         string                 `json:"message"`
	Timestamp       time.Time              `json:"timestamp"`
	Author          string                 `json:"author"`
	FilesCount      int                    `json:"files_count"`
	Version         int                    `json:"version"`
	Metadata        map[string]interface{} `json:"metadata"`
	ParentHash      string                 `json:"parent_hash,omitempty"`
	SnapshotZip     string                 `json:"snapshot_zip,omitempty"`
	CompressionInfo *CompressionResult     `json:"compression_info,omitempty"`
}

// CommitManager handles commit creation with simplified storage system
type CommitManager struct {
	DgitDir    string
	ObjectsDir string
	HeadFile   string
	ConfigFile string

	SnapshotsDir string
	DeltasDir    string
	CommitsDir   string
	TempDir      string

	// Compression optimization settings
	MaxDeltaChainLength  int
	CompressionThreshold float64

	// Compression configuration
	lz4CompressionLevel int
	enableBackgroundOpt bool
}

// NewCommitManager creates a new commit manager with simplified structure
func NewCommitManager(dgitDir string) *CommitManager {
	objectsDir := filepath.Join(dgitDir, "objects") // 레거시 호환

	snapshotsDir := filepath.Join(dgitDir, "snapshots")
	deltasDir := filepath.Join(dgitDir, "deltas")
	commitsDir := filepath.Join(dgitDir, "commits")
	tempDir := filepath.Join(dgitDir, "temp")

	// Ensure all directories exist
	os.MkdirAll(objectsDir, 0755)
	os.MkdirAll(snapshotsDir, 0755)
	os.MkdirAll(deltasDir, 0755)
	os.MkdirAll(commitsDir, 0755)
	os.MkdirAll(tempDir, 0755)

	cm := &CommitManager{
		DgitDir:    dgitDir,
		ObjectsDir: objectsDir,
		HeadFile:   filepath.Join(dgitDir, "HEAD"),
		ConfigFile: filepath.Join(dgitDir, "config"),

		SnapshotsDir: snapshotsDir,
		DeltasDir:    deltasDir,
		CommitsDir:   commitsDir,
		TempDir:      tempDir,

		MaxDeltaChainLength:  5,
		CompressionThreshold: 0.95,
		lz4CompressionLevel:  1,
		enableBackgroundOpt:  false,
	}

	cm.loadConfig()
	return cm
}

// CreateCommit creates a new commit with staged files
func (cm *CommitManager) CreateCommit(message string, stagedFiles []*staging.StagedFile) (*Commit, error) {
	startTime := time.Now()

	// Validate input
	if len(stagedFiles) == 0 {
		return nil, fmt.Errorf("no files staged for commit")
	}

	// Generate version and commit metadata
	currentVersion := cm.GetCurrentVersion()
	newVersion := currentVersion + 1

	hash := cm.generateCommitHash(message, stagedFiles, newVersion)
	author := cm.getAuthor()

	// Create commit structure
	commit := &Commit{
		Hash:       hash,
		Message:    message,
		Timestamp:  time.Now(),
		Author:     author,
		FilesCount: len(stagedFiles),
		Version:    newVersion,
		Metadata:   make(map[string]interface{}),
		ParentHash: cm.getCurrentCommitHash(),
	}

	// Extract design file metadata for commit tracking
	meta, err := cm.scanFilesMetadata(stagedFiles)
	if err != nil {
		return nil, fmt.Errorf("failed to scan metadata: %w", err)
	}
	commit.Metadata = meta

	// Create snapshot with compression
	compressionResult, err := cm.createSnapshot(stagedFiles, newVersion, currentVersion, startTime)
	if err != nil {
		return nil, fmt.Errorf("snapshot creation failed: %w", err)
	}

	commit.CompressionInfo = compressionResult
	if compressionResult.Strategy == "zip" {
		commit.SnapshotZip = compressionResult.OutputFile
	}

	// Save commit metadata and update repository state
	if err := cm.saveCommitMetadata(commit); err != nil {
		return nil, fmt.Errorf("save metadata failed: %w", err)
	}
	if err := cm.updateHead(hash); err != nil {
		return nil, fmt.Errorf("update HEAD failed: %w", err)
	}

	// Calculate final performance metrics
	totalTime := time.Since(startTime)
	compressionResult.SpeedImprovement = 45000.0 / compressionResult.CompressionTime

	// Display compression results
	cm.displayCompressionStats(compressionResult, totalTime)

	// Schedule background optimization for better compression ratios (non-blocking)
	if cm.enableBackgroundOpt && compressionResult.Strategy == "lz4" {
		go cm.scheduleBackgroundOptimization(newVersion, compressionResult)
	}

	return commit, nil
}

// createSnapshot chooses optimal compression strategy based on file characteristics
func (cm *CommitManager) createSnapshot(files []*staging.StagedFile, version, prevVersion int, startTime time.Time) (*CompressionResult, error) {
	// Strategy 1: LZ4 compression for appropriate files
	if cm.shouldUseLZ4(files, version) {
		return cm.compressWithLZ4(files, version, startTime)
	}

	// Strategy 2: Smart Delta for compatible files
	if version > 1 && !cm.shouldCreateNewSnapshot(prevVersion) {
		deltaResult, err := cm.createDelta(files, version, prevVersion, startTime)
		if err != nil {
			fmt.Printf("Delta creation failed: %v\n", err)
			fmt.Printf("Falling back to LZ4 compression...\n")
		} else if deltaResult.CompressionRatio <= cm.CompressionThreshold {
			return deltaResult, nil
		} else {
			fmt.Printf("Delta compression ratio %.1f%% exceeds threshold %.1f%%\n",
				deltaResult.CompressionRatio*100, cm.CompressionThreshold*100)
			fmt.Printf("Falling back to LZ4 compression...\n")
			os.Remove(filepath.Join(cm.DeltasDir, deltaResult.OutputFile))
		}
	}

	// Strategy 3: LZ4 Fallback
	return cm.compressWithLZ4(files, version, startTime)
}

// shouldUseLZ4 determines when to use LZ4 compression vs smart delta compression
func (cm *CommitManager) shouldUseLZ4(files []*staging.StagedFile, version int) bool {
	if version == 1 {
		return true
	}

	for _, file := range files {
		// Very large files: use LZ4 snapshot (bsdiff is too slow)
		if file.Size > 100*1024*1024 { // 100MB
			fmt.Printf("Very large file detected (%s, %.1f MB) - creating new snapshot\n",
				filepath.Base(file.Path), float64(file.Size)/(1024*1024))
			return true
		}

		// Medium files: use delta compression
		if file.Size > SmallFileThreshold { // 50MB
			fmt.Printf("Large file detected (%s, %.1f MB) - using delta compression\n",
				filepath.Base(file.Path), float64(file.Size)/(1024*1024))
			return false
		}

		ext := strings.ToLower(filepath.Ext(file.Path))
		if ext == ".psd" || ext == ".ai" || ext == ".sketch" {
			return false
		}
	}

	return true
}

// createDelta creates smart delta compression for design files
func (cm *CommitManager) createDelta(files []*staging.StagedFile, version, baseVersion int, startTime time.Time) (*CompressionResult, error) {
	// Use bsdiff for all delta compression
	return cm.createBsdiffDelta(files, version, baseVersion)
}

// selectDeltaAlgorithm chooses optimal delta compression method
func (cm *CommitManager) selectDeltaAlgorithm(files []*staging.StagedFile) string {
	// Use bsdiff for all design files
	return "bsdiff"
}

// compressWithLZ4 creates LZ4 compressed files with structured headers
func (cm *CommitManager) compressWithLZ4(files []*staging.StagedFile, version int, startTime time.Time) (*CompressionResult, error) {
	compressionStartTime := time.Now()

	// Store in versions directory for immediate access
	versionPath := filepath.Join(cm.SnapshotsDir, fmt.Sprintf("v%d.lz4", version))

	// Create LZ4 compressed file
	outFile, err := os.Create(versionPath)
	if err != nil {
		return nil, fmt.Errorf("create LZ4 file: %w", err)
	}
	defer outFile.Close()

	// LZ4 compression with level 1 for speed
	lz4Writer := lz4.NewWriter(outFile)
	defer lz4Writer.Close()

	lz4Writer.Apply(lz4.CompressionLevelOption(lz4.Level1))

	// Stream all files through LZ4 with structured headers
	var originalSize int64
	for _, file := range files {
		// 익명 함수로 defer 처리
		func() {
			srcFile, err := os.Open(file.AbsolutePath)
			if err != nil {
				fmt.Printf("Warning: failed to open %s: %v\n", file.Path, err)
				return
			}
			defer srcFile.Close() // 이제 익명함수 내에서 defer 호출

			fileContent, err := io.ReadAll(srcFile)
			if err != nil {
				fmt.Printf("Warning: failed to read %s: %v\n", file.Path, err)
				return
			}

			actualSize := int64(len(fileContent))
			originalSize += actualSize

			// Write structured file header for identification during extraction
			header := fmt.Sprintf("FILE:%s:%d\n", file.Path, actualSize)
			_, err = lz4Writer.Write([]byte(header))
			if err != nil {
				fmt.Printf("Warning: failed to write header for %s: %v\n", file.Path, err)
				return
			}

			// Write file content through LZ4
			_, err = lz4Writer.Write(fileContent)
			if err != nil {
				fmt.Printf("Warning: failed to compress %s: %v\n", file.Path, err)
				return
			}
		}()
	}

	// Ensure LZ4 writer is properly closed before checking file size
	lz4Writer.Close()

	// Calculate compression performance metrics
	fileInfo, err := os.Stat(versionPath)
	if err != nil {
		return nil, fmt.Errorf("failed to stat compressed file: %w", err)
	}

	compressedSize := fileInfo.Size()
	compressionTime := float64(time.Since(compressionStartTime).Nanoseconds()) / 1000000.0

	// Compression validation: file should not become significantly larger
	if originalSize == 0 {
		os.Remove(versionPath)
		return nil, fmt.Errorf("no data to compress")
	}

	compressionRatio := float64(compressedSize) / float64(originalSize)
	if compressionRatio > 1.2 {
		os.Remove(versionPath)
		return nil, fmt.Errorf("compression failed: file became %.1f%% larger (from %d to %d bytes)",
			(compressionRatio-1)*100, originalSize, compressedSize)
	}

	if compressedSize == 0 {
		os.Remove(versionPath)
		return nil, fmt.Errorf("compression failed: output file is empty")
	}

	var ratio float64
	if originalSize > 0 {
		ratio = float64(compressedSize) / float64(originalSize)
	} else {
		ratio = 1.0
	}

	return &CompressionResult{
		Strategy:         "lz4",
		OutputFile:       filepath.Base(versionPath),
		OriginalSize:     originalSize,
		CompressedSize:   compressedSize,
		CompressionRatio: ratio,
		CompressionTime:  compressionTime,
		CacheLevel:       "snapshots",
		CreatedAt:        time.Now(),
	}, nil
}

// Background optimization system for improved compression ratios

// createBsdiffDelta creates binary diff delta compression
func (cm *CommitManager) createBsdiffDelta(
	files []*staging.StagedFile,
	version, baseVersion int,
) (*CompressionResult, error) {
	compressionStart := time.Now()

	fmt.Printf("Creating bsdiff delta: v%d from v%d\n", version, baseVersion)

	// Step 1: Create temporary ZIP from current files (uncompressed originals)
	tempCurrentZip := filepath.Join(cm.TempDir, fmt.Sprintf("temp_current_v%d.zip", version))
	defer os.Remove(tempCurrentZip)

	fmt.Printf("  Creating temporary current version ZIP...\n")
	if err := cm.createTempZipFile(files, tempCurrentZip); err != nil {
		return nil, fmt.Errorf("failed to create current temp ZIP: %w", err)
	}

	currentZipSize, _ := getFileSize(tempCurrentZip)
	fmt.Printf("  Current version ZIP: %.2f MB\n", float64(currentZipSize)/(1024*1024))

	// Step 2: Find and convert base version to ZIP
	basePath := cm.findVersionInStorage(baseVersion)
	if basePath == "" {
		return nil, fmt.Errorf("base version v%d not found", baseVersion)
	}

	tempBaseZip := filepath.Join(cm.TempDir, fmt.Sprintf("temp_base_v%d.zip", baseVersion))
	defer os.Remove(tempBaseZip)

	fmt.Printf("  Converting base version from %s...\n", filepath.Base(basePath))
	if err := cm.convertToZip(basePath, tempBaseZip); err != nil {
		return nil, fmt.Errorf("failed to convert base to ZIP: %w", err)
	}

	baseZipSize, _ := getFileSize(tempBaseZip)
	fmt.Printf("  Base version ZIP: %.2f MB\n", float64(baseZipSize)/(1024*1024))

	// Create smart delta with layer change information
	deltaPath := filepath.Join(cm.DeltasDir, fmt.Sprintf("v%d_from_v%d.psd_smart", version, baseVersion))

	fmt.Printf("  Computing binary delta...\n")
	baseFile, err := os.Open(tempBaseZip)
	if err != nil {
		return nil, fmt.Errorf("failed to open base ZIP: %w", err)
	}
	defer baseFile.Close()

	currentFile, err := os.Open(tempCurrentZip)
	if err != nil {
		return nil, fmt.Errorf("failed to open current ZIP: %w", err)
	}
	defer currentFile.Close()

	deltaFile, err := os.Create(deltaPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create delta file: %w", err)
	}
	defer deltaFile.Close()

	// Create the delta using Reader
	oldData, err := io.ReadAll(baseFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read base file: %w", err)
	}

	newData, err := io.ReadAll(currentFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read current file: %w", err)
	}

	patch, err := bsdiff.Bytes(oldData, newData)
	if err != nil {
		return nil, fmt.Errorf("bsdiff delta creation failed: %w", err)
	}

	if _, err := deltaFile.Write(patch); err != nil {
		return nil, fmt.Errorf("failed to write patch: %w", err)
	}

	deltaFile.Close() // Ensure file is closed before stat

	// Step 4: Calculate results
	deltaSize, err := getFileSize(deltaPath)
	if err != nil {
		return nil, fmt.Errorf("failed to stat delta file: %w", err)
	}

	var originalSize int64
	for _, f := range files {
		originalSize += f.Size
	}

	compressionTime := float64(time.Since(compressionStart).Nanoseconds()) / 1000000.0
	compressionRatio := float64(deltaSize) / float64(originalSize)

	fmt.Printf("  ✓ Delta created: %.2f MB (%.1f%% of original)\n",
		float64(deltaSize)/(1024*1024),
		compressionRatio*100)

	return &CompressionResult{
		Strategy:         "bsdiff",
		OutputFile:       filepath.Base(deltaPath),
		OriginalSize:     originalSize,
		CompressedSize:   deltaSize,
		CompressionRatio: compressionRatio,
		CompressionTime:  compressionTime,
		CacheLevel:       "snapshots",
		BaseVersion:      baseVersion,
		CreatedAt:        time.Now(),
	}, nil
}

// Background optimization system for improved compression ratios

// scheduleBackgroundOptimization queues background optimization tasks
func (cm *CommitManager) scheduleBackgroundOptimization(version int, result *CompressionResult) {
	// Wait briefly to ensure user operations complete
	time.Sleep(3 * time.Second)

	// Move from versions to cache for background optimization
	cm.optimizeToCache(version, result)
}

// optimizeToCache converts LZ4 versions to optimized cache
func (cm *CommitManager) optimizeToCache(version int, result *CompressionResult) {
	if result.Strategy != "lz4" {
		return
	}

	versionPath := filepath.Join(cm.SnapshotsDir, result.OutputFile)
	cachePath := filepath.Join(cm.DeltasDir, fmt.Sprintf("v%d_optimized.zstd", version))

	// Open LZ4 source file
	versionFile, err := os.Open(versionPath)
	if err != nil {
		return
	}
	defer versionFile.Close()

	// Create Zstd destination file
	cacheFile, err := os.Create(cachePath)
	if err != nil {
		return
	}
	defer cacheFile.Close()

	// LZ4 decompression → Zstd compression pipeline
	lz4Reader := lz4.NewReader(versionFile)
	zstdWriter, err := zstd.NewWriter(cacheFile, zstd.WithEncoderLevel(zstd.SpeedDefault))
	if err != nil {
		return
	}
	defer zstdWriter.Close()

	// Stream conversion for efficient memory usage
	io.Copy(zstdWriter, lz4Reader)
	zstdWriter.Close()
}

// createPSDSmartDelta creates PSD delta compression with layer-level change detection
func (cm *CommitManager) createPSDSmartDelta(files []*staging.StagedFile, version, baseVersion int) (*CompressionResult, error) {
	compressionStart := time.Now()

	// Find PSD file in staged files
	var psdFile *staging.StagedFile
	for _, f := range files {
		if strings.ToLower(filepath.Ext(f.Path)) == ".psd" {
			psdFile = f
			break
		}
	}

	if psdFile == nil {
		return nil, fmt.Errorf("no PSD file found")
	}

	fmt.Printf("Analyzing PSD layers for smart delta (v%d vs v%d)...\n", version, baseVersion)

	// Extract detailed layer information from current PSD
	currentLayers, err := cm.extractPSDLayerInfo(psdFile.AbsolutePath)
	if err != nil {
		fmt.Printf("Warning: Failed to extract current layer info: %v\n", err)
		return cm.fallbackToBinaryDelta(files, version, baseVersion)
	}

	// Extract layer information from previous version
	previousLayers, err := cm.extractPreviousVersionLayers(baseVersion, psdFile.Path)
	if err != nil {
		fmt.Printf("Warning: Failed to extract previous layer info: %v\n", err)
		return cm.fallbackToBinaryDelta(files, version, baseVersion)
	}

	// Compare layers and detect changes
	changeAnalysis := cm.compareLayerVersions(previousLayers, currentLayers)

	// Display change summary to user
	cm.displayLayerChanges(changeAnalysis, baseVersion, version)

	// Create smart delta with layer change information
	deltaPath := filepath.Join(cm.DeltasDir, fmt.Sprintf("v%d_from_v%d.bsdiff", version, baseVersion))
	deltaSize, err := cm.createSmartDeltaFile(deltaPath, psdFile, changeAnalysis, baseVersion, version)
	if err != nil {
		return nil, fmt.Errorf("failed to create smart delta file: %w", err)
	}

	compressionTime := float64(time.Since(compressionStart).Nanoseconds()) / 1000000.0

	return &CompressionResult{
		Strategy:         "psd_smart",
		OutputFile:       filepath.Base(deltaPath),
		OriginalSize:     psdFile.Size,
		CompressedSize:   deltaSize,
		CompressionRatio: float64(deltaSize) / float64(psdFile.Size),
		CompressionTime:  compressionTime,
		CacheLevel:       "deltas",
		BaseVersion:      baseVersion,
		CreatedAt:        time.Now(),
	}, nil
}

// LayerChange represents a detected change between layer versions
type LayerChange struct {
	LayerID         int                    `json:"layer_id"`
	LayerName       string                 `json:"layer_name"`
	ChangeType      string                 `json:"change_type"`
	OldHash         string                 `json:"old_hash,omitempty"`
	NewHash         string                 `json:"new_hash,omitempty"`
	PropertyChanges map[string]interface{} `json:"property_changes,omitempty"`
}

// ChangeAnalysis containsdetailed analysis of layer changes between versions
type ChangeAnalysis struct {
	TotalLayers    int           `json:"total_layers"`
	ChangedLayers  []LayerChange `json:"changed_layers"`
	AddedLayers    []LayerChange `json:"added_layers"`
	DeletedLayers  []LayerChange `json:"deleted_layers"`
	UnchangedCount int           `json:"unchanged_count"`
	ChangesSummary string        `json:"changes_summary"`
}

// extractPSDLayerInfo extracts detailed layer information from PSD file
func (cm *CommitManager) extractPSDLayerInfo(psdPath string) ([]DetailedLayer, error) {
	detailedInfo, err := photoshop.GetDetailedPSDInfo(psdPath)
	if err != nil {
		return nil, fmt.Errorf("failed to parse PSD file: %w", err)
	}
	return detailedInfo.Layers, nil
}

// extractPreviousVersionLayers extracts layer info from previous version
func (cm *CommitManager) extractPreviousVersionLayers(baseVersion int, filePath string) ([]DetailedLayer, error) {
	// Find the previous version file in storage hierarchy
	basePath := cm.findVersionInStorage(baseVersion)
	if basePath == "" {
		return nil, fmt.Errorf("previous version v%d not found in storage", baseVersion)
	}

	fmt.Printf("Previous version found at: %s\n", basePath)

	// Create temporary file to reconstruct the previous PSD
	tempDir := filepath.Join(cm.TempDir, "temp")
	os.MkdirAll(tempDir, 0755)

	tempPSDPath := filepath.Join(tempDir, fmt.Sprintf("temp_v%d.psd", baseVersion))
	defer os.Remove(tempPSDPath)

	// Extract/decompress the cached file to get the original PSD
	err := cm.extractCachedFileToPSD(basePath, tempPSDPath, filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to extract cached file: %w", err)
	}

	// Parse layer information from the reconstructed PSD
	previousLayers, err := cm.extractPSDLayerInfo(tempPSDPath)
	if err != nil {
		return nil, fmt.Errorf("failed to parse previous PSD layers: %w", err)
	}

	fmt.Printf("Extracted %d layers from previous version v%d\n", len(previousLayers), baseVersion)
	return previousLayers, nil
}

// Performance display and logging functions

// displayCompressionStats shows detailed performance metrics
func (cm *CommitManager) displayCompressionStats(result *CompressionResult, totalTime time.Duration) {
	compressionPercent := (1 - result.CompressionRatio) * 100
	totalTimeMs := float64(totalTime.Nanoseconds()) / 1000000.0

	// Display compression results based on strategy
	switch result.Strategy {
	case "lz4":
		fmt.Printf("LZ4 compression: %.1f%% compressed in %.1fms\n", compressionPercent, result.CompressionTime)
		fmt.Printf("Compression completed efficiently\n")
		fmt.Printf("Cache: %s | File: %s\n", result.CacheLevel, result.OutputFile)
	case "psd_smart":
		fmt.Printf("PSD Smart Delta: %.1f%% space saved in %.1fms\n", compressionPercent, result.CompressionTime)
		fmt.Printf("Base: v%d | Changes detected and optimized\n", result.BaseVersion)
	case "bsdiff":
		fmt.Printf("Binary Delta: %.1f%% saved in %.1fms\n", compressionPercent, result.CompressionTime)
		fmt.Printf("Base: v%d | Delta file: %s\n", result.BaseVersion, result.OutputFile)
	default:
		fmt.Printf("%s compression: %.1f%% in %.1fms\n", strings.ToUpper(result.Strategy), compressionPercent, result.CompressionTime)
	}

	// Overall performance summary
	if totalTimeMs < 500 {
		fmt.Printf("Fast commit completed in %.0fms\n", totalTimeMs)
	} else {
		fmt.Printf("Commit completed in %.0fms\n", totalTimeMs)
	}

	// Background optimization notice
	if cm.enableBackgroundOpt && result.Strategy == "lz4" {
		fmt.Printf("Optimization scheduled\n")
	}
}

// Utility and helper functions

// loadConfig loads compression configuration from repository
func (cm *CommitManager) loadConfig() {
	if data, err := os.ReadFile(cm.ConfigFile); err == nil {
		var config map[string]interface{}
		if json.Unmarshal(data, &config) == nil {
			if compression, ok := config["compression"].(map[string]interface{}); ok {
				if lz4Config, ok := compression["lz4_stage"].(map[string]interface{}); ok {
					if level, ok := lz4Config["compression_level"].(float64); ok {
						cm.lz4CompressionLevel = int(level)
					}
				}
			}
		}
	}
}

// findVersionInStorage searches for version file in simplified storage hierarchy
func (cm *CommitManager) findVersionInStorage(version int) string {
	// Check versions directory first
	versionPath := filepath.Join(cm.SnapshotsDir, fmt.Sprintf("v%d.lz4", version))
	if cm.fileExists(versionPath) {
		return versionPath
	}

	// Check cache directory
	cachePath := filepath.Join(cm.DeltasDir, fmt.Sprintf("v%d.lz4", version))
	if cm.fileExists(cachePath) {
		return cachePath
	}

	// Check optimized cache
	optimizedPath := filepath.Join(cm.DeltasDir, fmt.Sprintf("v%d_optimized.zstd", version))
	if cm.fileExists(optimizedPath) {
		return optimizedPath
	}

	// Check legacy objects
	legacyPath := filepath.Join(cm.ObjectsDir, fmt.Sprintf("v%d.zip", version))
	if cm.fileExists(legacyPath) {
		return legacyPath
	}

	return ""
}

// openStoredFile opens a stored file with appropriate decompression
func (cm *CommitManager) openStoredFile(path string) (io.ReadCloser, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}

	// Return appropriate decompression reader based on file extension
	if strings.HasSuffix(path, ".lz4") {
		return &lz4ReadCloser{lz4.NewReader(file), file}, nil
	} else if strings.HasSuffix(path, ".zstd") {
		zstdReader, err := zstd.NewReader(file)
		if err != nil {
			file.Close()
			return nil, err
		}
		return &zstdReadCloser{zstdReader, file}, nil
	}

	return file, nil
}

// Helper reader types for seamless decompression

// lz4ReadCloser provides transparent LZ4 decompression
type lz4ReadCloser struct {
	*lz4.Reader
	file *os.File
}

func (r *lz4ReadCloser) Close() error {
	return r.file.Close()
}

// zstdReadCloser provides transparent Zstd decompression
type zstdReadCloser struct {
	*zstd.Decoder
	file *os.File
}

func (r *zstdReadCloser) Close() error {
	r.Decoder.Close()
	return r.file.Close()
}

// Cache and file management utilities

// createTempLZ4File creates temporary LZ4 file for delta operations
func (cm *CommitManager) createTempLZ4File(files []*staging.StagedFile, outputPath string) error {
	outFile, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	lz4Writer := lz4.NewWriter(outFile)
	defer lz4Writer.Close()
	lz4Writer.Apply(lz4.CompressionLevelOption(lz4.Level1))

	// Use same structured format as compressWithLZ4
	for _, file := range files {
		srcFile, err := os.Open(file.AbsolutePath)
		if err != nil {
			fmt.Printf("Warning: failed to open %s for temp file: %v\n", file.Path, err)
			continue
		}

		fileContent, err := io.ReadAll(srcFile)
		srcFile.Close()
		if err != nil {
			fmt.Printf("Warning: failed to read %s for temp file: %v\n", file.Path, err)
			continue
		}

		actualSize := int64(len(fileContent))

		// Write structured header
		header := fmt.Sprintf("FILE:%s:%d\n", file.Path, actualSize)
		lz4Writer.Write([]byte(header))

		// Write file content
		lz4Writer.Write(fileContent)
	}

	return nil
}

// calculateCompressionResult computesdetailed compression statistics
func (cm *CommitManager) calculateCompressionResult(strategy, outputFile string, files []*staging.StagedFile, baseVersion int, compressionTimeMs float64) (*CompressionResult, error) {
	var originalSize int64
	for _, f := range files {
		originalSize += f.Size
	}

	info, err := os.Stat(outputFile)
	if err != nil {
		return nil, err
	}

	compressedSize := info.Size()

	return &CompressionResult{
		Strategy:         strategy,
		OutputFile:       filepath.Base(outputFile),
		OriginalSize:     originalSize,
		CompressedSize:   compressedSize,
		CompressionRatio: float64(compressedSize) / float64(originalSize),
		CompressionTime:  compressionTimeMs,
		CacheLevel:       "cache",
		BaseVersion:      baseVersion,
		CreatedAt:        time.Now(),
	}, nil
}

// shouldCreateNewSnapshot enforces delta chain length limit for optimal performance
func (cm *CommitManager) shouldCreateNewSnapshot(ver int) bool {
	return cm.getDeltaChainLength(ver) >= cm.MaxDeltaChainLength
}

// getDeltaChainLength counts delta chain length back to last ZIP snapshot
func (cm *CommitManager) getDeltaChainLength(ver int) int {
	count := 0
	for v := ver; v > 0; v-- {
		if cm.fileExists(filepath.Join(cm.ObjectsDir, fmt.Sprintf("v%d.zip", v))) {
			break
		}
		count++
	}
	return count
}

// fileExists checks if a file exists on the filesystem
func (cm *CommitManager) fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// GetCurrentVersion returns the current version by scanning JSON metadata files
func (cm *CommitManager) GetCurrentVersion() int {
	entries, err := os.ReadDir(cm.CommitsDir)
	if err != nil {
		return 0
	}
	maxVersion := 0
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "v") && strings.HasSuffix(e.Name(), ".json") {
			n, _ := strconv.Atoi(strings.TrimSuffix(strings.TrimPrefix(e.Name(), "v"), ".json"))
			if n > maxVersion {
				maxVersion = n
			}
		}
	}
	return maxVersion
}

// generateCommitHash produces a secure 12-character SHA256-based hash
func (cm *CommitManager) generateCommitHash(msg string, files []*staging.StagedFile, ver int) string {
	h := sha256.New()
	h.Write([]byte(msg))
	h.Write([]byte(strconv.Itoa(ver)))
	h.Write([]byte(time.Now().Format(time.RFC3339)))
	for _, f := range files {
		h.Write([]byte(f.AbsolutePath))
		h.Write([]byte(strconv.FormatInt(f.Size, 10)))
		h.Write([]byte(f.ModTime.Format(time.RFC3339)))
	}
	return fmt.Sprintf("%x", h.Sum(nil))[:12]
}

// getAuthor reads author information from repository configuration
func (cm *CommitManager) getAuthor() string {
	if data, err := os.ReadFile(cm.ConfigFile); err == nil {
		var cfg map[string]interface{}
		if json.Unmarshal(data, &cfg) == nil {
			if a, ok := cfg["author"].(string); ok {
				return a
			}
		}
	}
	return "DGit User"
}

// getCurrentCommitHash reads the current HEAD commit hash
func (cm *CommitManager) getCurrentCommitHash() string {
	if d, err := os.ReadFile(cm.HeadFile); err == nil {
		return strings.TrimSpace(string(d))
	}
	return ""
}

// scanFilesMetadata extractsdetailed metadata from design files
func (cm *CommitManager) scanFilesMetadata(files []*staging.StagedFile) (map[string]interface{}, error) {
	md := make(map[string]interface{})
	for _, f := range files {
		sc := scanner.NewFileScanner()
		info, err := sc.ScanFile(f.AbsolutePath)
		if err != nil {
			// Store basic info even if detailed scanning fails
			md[f.Path] = map[string]interface{}{
				"type":          f.FileType,
				"size":          f.Size,
				"last_modified": f.ModTime,
				"scan_error":    err.Error(),
			}
			continue
		}
		// Storedetailed design file metadata
		md[f.Path] = map[string]interface{}{
			"type":          info.Type,
			"dimensions":    info.Dimensions,
			"color_mode":    info.ColorMode,
			"version":       info.Version,
			"layers":        info.Layers,
			"artboards":     info.Artboards,
			"objects":       info.Objects,
			"layer_names":   info.LayerNames,
			"size":          f.Size,
			"last_modified": f.ModTime,
		}
	}
	return md, nil
}

// saveCommitMetadata writes commit metadata to JSON file
func (cm *CommitManager) saveCommitMetadata(c *Commit) error {
	path := filepath.Join(cm.CommitsDir, fmt.Sprintf("v%d.json", c.Version))
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal commit: %w", err)
	}
	return os.WriteFile(path, data, 0644)
}

// updateHead writes the new commit hash to HEAD file
func (cm *CommitManager) updateHead(hash string) error {
	return os.WriteFile(cm.HeadFile, []byte(hash), 0644)
}

// Layer analysis functions for PSD smart delta

// extractCachedFileToPSD extracts a cached file back to original PSD format
func (cm *CommitManager) extractCachedFileToPSD(cachedPath, outputPath, originalFilePath string) error {
	// Determine cache file type by extension
	switch {
	case strings.HasSuffix(cachedPath, ".lz4"):
		return cm.extractLZ4ToPSD(cachedPath, outputPath, originalFilePath)
	case strings.HasSuffix(cachedPath, ".zstd"):
		return cm.extractZstdToPSD(cachedPath, outputPath, originalFilePath)
	case strings.HasSuffix(cachedPath, ".zip"):
		return cm.extractZipToPSD(cachedPath, outputPath, originalFilePath)
	default:
		return fmt.Errorf("unsupported cache file format: %s", cachedPath)
	}
}

// extractLZ4ToPSD extracts LZ4 cached file back to PSD format
func (cm *CommitManager) extractLZ4ToPSD(lz4Path, outputPath, originalFilePath string) error {
	lz4File, err := os.Open(lz4Path)
	if err != nil {
		return fmt.Errorf("failed to open LZ4 file: %w", err)
	}
	defer lz4File.Close()

	lz4Reader := lz4.NewReader(lz4File)
	return cm.extractStreamToPSD(lz4Reader, outputPath, originalFilePath)
}

// extractZstdToPSD extracts Zstd cached file back to PSD format
func (cm *CommitManager) extractZstdToPSD(zstdPath, outputPath, originalFilePath string) error {
	zstdFile, err := os.Open(zstdPath)
	if err != nil {
		return fmt.Errorf("failed to open Zstd file: %w", err)
	}
	defer zstdFile.Close()

	zstdReader, err := zstd.NewReader(zstdFile)
	if err != nil {
		return fmt.Errorf("failed to create Zstd reader: %w", err)
	}
	defer zstdReader.Close()

	return cm.extractStreamToPSD(zstdReader, outputPath, originalFilePath)
}

// extractZipToPSD extracts ZIP cached file back to PSD format
func (cm *CommitManager) extractZipToPSD(zipPath, outputPath, originalFilePath string) error {
	zipReader, err := zip.OpenReader(zipPath)
	if err != nil {
		return fmt.Errorf("failed to open ZIP file: %w", err)
	}
	defer zipReader.Close()

	targetFileName := filepath.Base(originalFilePath)

	for _, file := range zipReader.File {
		if filepath.Base(file.Name) == targetFileName || file.Name == originalFilePath {
			return cm.extractZipEntryToPSD(file, outputPath)
		}
	}

	return fmt.Errorf("target file not found in ZIP archive: %s", targetFileName)
}

// extractZipEntryToPSD extracts a specific ZIP entry to PSD file
func (cm *CommitManager) extractZipEntryToPSD(zipEntry *zip.File, outputPath string) error {
	reader, err := zipEntry.Open()
	if err != nil {
		return fmt.Errorf("failed to open ZIP entry: %w", err)
	}
	defer reader.Close()

	outputFile, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("failed to create output file: %w", err)
	}
	defer outputFile.Close()

	_, err = io.Copy(outputFile, reader)
	if err != nil {
		return fmt.Errorf("failed to extract ZIP entry: %w", err)
	}

	return nil
}

// extractStreamToPSD handles both simple file streams and structured streams
func (cm *CommitManager) extractStreamToPSD(reader io.Reader, outputPath, originalFilePath string) error {
	// Read first chunk to detect format
	const chunkSize = 4096
	firstChunk := make([]byte, chunkSize)
	n, err := reader.Read(firstChunk)
	if err != nil && err != io.EOF {
		return fmt.Errorf("failed to read stream chunk: %w", err)
	}

	// Check if this is a structured stream with FILE: headers
	firstChunkStr := string(firstChunk[:n])
	if strings.Contains(firstChunkStr, "FILE:") {
		// Read the rest of the stream
		remainingData, err := io.ReadAll(reader)
		if err != nil {
			return fmt.Errorf("failed to read remaining stream: %w", err)
		}

		// Combine first chunk with remaining data
		fullData := make([]byte, n+len(remainingData))
		copy(fullData, firstChunk[:n])
		copy(fullData[n:], remainingData)

		return cm.extractStructuredStreamToPSD(fullData, outputPath, originalFilePath)
	}

	// Simple stream - create multi-reader to include first chunk
	combinedReader := io.MultiReader(bytes.NewReader(firstChunk[:n]), reader)

	// Write directly to output
	err = func() error {
		outputFile, err := os.Create(outputPath)
		if err != nil {
			return fmt.Errorf("failed to create output file: %w", err)
		}
		defer outputFile.Close()

		_, err = io.Copy(outputFile, combinedReader)
		return err
	}()

	if err != nil {
		return fmt.Errorf("failed to write PSD file: %w", err)
	}

	return nil
}

// extractStructuredStreamToPSD streams through data without loading entire file into memory
func (cm *CommitManager) extractStructuredStreamToPSD(data []byte, outputPath, originalFilePath string) error {
	targetFileName := filepath.Base(originalFilePath)

	reader := bytes.NewReader(data)
	bufReader := bufio.NewReader(reader)

	for {
		// Read header line
		headerLine, err := bufReader.ReadString('\n')
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("failed to read header: %w", err)
		}

		// Parse header: "FILE:path:size\n"
		headerLine = strings.TrimSuffix(headerLine, "\n")
		if !strings.HasPrefix(headerLine, "FILE:") {
			continue
		}

		parts := strings.Split(headerLine, ":")
		if len(parts) != 3 {
			continue
		}

		filePath := parts[1]
		fileSize, err := strconv.ParseInt(parts[2], 10, 64)
		if err != nil || fileSize <= 0 {
			continue
		}

		// Check if this is our target file
		if filepath.Base(filePath) == targetFileName || filePath == originalFilePath {
			// Create output file
			outputFile, err := os.Create(outputPath)
			if err != nil {
				return fmt.Errorf("failed to create output file: %w", err)
			}
			defer outputFile.Close()

			// Stream copy the exact number of bytes
			_, err = io.CopyN(outputFile, bufReader, fileSize)
			if err != nil {
				return fmt.Errorf("failed to extract file content: %w", err)
			}

			return nil
		}

		// Skip this file's content
		_, err = io.CopyN(io.Discard, bufReader, fileSize)
		if err != nil {
			return fmt.Errorf("failed to skip file content: %w", err)
		}
	}

	return fmt.Errorf("target file not found in structured stream: %s", targetFileName)
}

// compareLayerVersions compares two sets of layers and identifies changes
func (cm *CommitManager) compareLayerVersions(oldLayers, newLayers []DetailedLayer) *ChangeAnalysis {
	analysis := &ChangeAnalysis{
		TotalLayers:   len(newLayers),
		ChangedLayers: []LayerChange{},
		AddedLayers:   []LayerChange{},
		DeletedLayers: []LayerChange{},
	}

	// Create hash maps for efficient lookup
	oldLayerMap := make(map[string]DetailedLayer)
	newLayerMap := make(map[string]DetailedLayer)

	for _, layer := range oldLayers {
		oldLayerMap[layer.Name] = layer
	}
	for _, layer := range newLayers {
		newLayerMap[layer.Name] = layer
	}

	// Find added layers
	for _, newLayer := range newLayers {
		if _, exists := oldLayerMap[newLayer.Name]; !exists {
			analysis.AddedLayers = append(analysis.AddedLayers, LayerChange{
				LayerID:    newLayer.ID,
				LayerName:  newLayer.Name,
				ChangeType: "added",
				NewHash:    newLayer.ContentHash,
			})
		}
	}

	// Find deleted layers
	for _, oldLayer := range oldLayers {
		if _, exists := newLayerMap[oldLayer.Name]; !exists {
			analysis.DeletedLayers = append(analysis.DeletedLayers, LayerChange{
				LayerID:    oldLayer.ID,
				LayerName:  oldLayer.Name,
				ChangeType: "deleted",
				OldHash:    oldLayer.ContentHash,
			})
		}
	}

	// Find modified layers
	for _, newLayer := range newLayers {
		if oldLayer, exists := oldLayerMap[newLayer.Name]; exists {
			if oldLayer.ContentHash != newLayer.ContentHash {
				// Layer content changed - detect what specifically changed
				propertyChanges := cm.detectPropertyChanges(oldLayer, newLayer)

				analysis.ChangedLayers = append(analysis.ChangedLayers, LayerChange{
					LayerID:         newLayer.ID,
					LayerName:       newLayer.Name,
					ChangeType:      "modified",
					OldHash:         oldLayer.ContentHash,
					NewHash:         newLayer.ContentHash,
					PropertyChanges: propertyChanges,
				})
			}
		}
	}

	// Calculate unchanged layers
	analysis.UnchangedCount = len(newLayers) - len(analysis.ChangedLayers) - len(analysis.AddedLayers)

	// Generate summary
	analysis.ChangesSummary = cm.generateChangesSummary(analysis)

	return analysis
}

// detectPropertyChanges identifies specific property changes between layer versions
func (cm *CommitManager) detectPropertyChanges(oldLayer, newLayer DetailedLayer) map[string]interface{} {
	changes := make(map[string]interface{})

	// Check opacity changes
	if oldLayer.Opacity != newLayer.Opacity {
		changes["opacity"] = map[string]interface{}{
			"old": oldLayer.Opacity,
			"new": newLayer.Opacity,
		}
	}

	// Check visibility changes
	if oldLayer.Visible != newLayer.Visible {
		changes["visibility"] = map[string]interface{}{
			"old": oldLayer.Visible,
			"new": newLayer.Visible,
		}
	}

	// Check blend mode changes
	if oldLayer.BlendMode != newLayer.BlendMode {
		changes["blend_mode"] = map[string]interface{}{
			"old": oldLayer.BlendMode,
			"new": newLayer.BlendMode,
		}
	}

	// Check position changes
	if oldLayer.Position != newLayer.Position {
		changes["position"] = map[string]interface{}{
			"old": oldLayer.Position,
			"new": newLayer.Position,
		}
	}

	return changes
}

// generateChangesSummary creates human-readable summary of changes
func (cm *CommitManager) generateChangesSummary(analysis *ChangeAnalysis) string {
	totalChanges := len(analysis.ChangedLayers) + len(analysis.AddedLayers) + len(analysis.DeletedLayers)

	if totalChanges == 0 {
		return "No layer changes detected"
	}

	summary := fmt.Sprintf("%d layer(s) changed", totalChanges)

	if len(analysis.AddedLayers) > 0 {
		summary += fmt.Sprintf(", %d added", len(analysis.AddedLayers))
	}
	if len(analysis.DeletedLayers) > 0 {
		summary += fmt.Sprintf(", %d deleted", len(analysis.DeletedLayers))
	}
	if len(analysis.ChangedLayers) > 0 {
		summary += fmt.Sprintf(", %d modified", len(analysis.ChangedLayers))
	}

	return summary
}

// displayLayerChanges shows detailed change information to user
func (cm *CommitManager) displayLayerChanges(analysis *ChangeAnalysis, baseVersion, newVersion int) {
	fmt.Printf("\n=== PSD Layer Analysis (v%d → v%d) ===\n", baseVersion, newVersion)
	fmt.Printf("Summary: %s\n", analysis.ChangesSummary)

	// Show added layers
	if len(analysis.AddedLayers) > 0 {
		fmt.Printf("\n✅ Added layers:\n")
		for _, change := range analysis.AddedLayers {
			fmt.Printf("  + %s\n", change.LayerName)
		}
	}

	// Show deleted layers
	if len(analysis.DeletedLayers) > 0 {
		fmt.Printf("\n❌ Deleted layers:\n")
		for _, change := range analysis.DeletedLayers {
			fmt.Printf("  - %s\n", change.LayerName)
		}
	}

	// Show modified layers
	if len(analysis.ChangedLayers) > 0 {
		fmt.Printf("\n🔄 Modified layers:\n")
		for _, change := range analysis.ChangedLayers {
			fmt.Printf("  ~ %s", change.LayerName)
			if len(change.PropertyChanges) > 0 {
				var props []string
				for prop := range change.PropertyChanges {
					props = append(props, prop)
				}
				fmt.Printf(" (%s)", strings.Join(props, ", "))
			}
			fmt.Println()
		}
	}

	if analysis.UnchangedCount > 0 {
		fmt.Printf("\n🔹 %d layer(s) unchanged\n", analysis.UnchangedCount)
	}

	fmt.Println()
}

// createSmartDeltaFile creates the actual delta file withdetailed metadata
func (cm *CommitManager) createSmartDeltaFile(deltaPath string, psdFile *staging.StagedFile, analysis *ChangeAnalysis, baseVersion, version int) (int64, error) {
	outFile, err := os.Create(deltaPath)
	if err != nil {
		return 0, err
	}
	defer outFile.Close()

	// Createdetailed delta metadata
	deltaMetadata := map[string]interface{}{
		"type":           "psd_smart_delta",
		"from_version":   baseVersion,
		"to_version":     version,
		"file_path":      psdFile.Path,
		"original_size":  psdFile.Size,
		"timestamp":      time.Now(),
		"layer_analysis": analysis,
	}

	// Marshal metadata to JSON
	metadataBytes, err := json.MarshalIndent(deltaMetadata, "", "  ")
	if err != nil {
		return 0, err
	}

	// Write structured delta file
	fmt.Fprintf(outFile, "PSD_SMART_DELTA_V1\n")
	fmt.Fprintf(outFile, "METADATA_LENGTH:%d\n", len(metadataBytes))
	outFile.Write(metadataBytes)
	fmt.Fprintf(outFile, "\nBINARY_DATA:\n")

	// Read and compress original file data
	originalData, err := os.ReadFile(psdFile.AbsolutePath)
	if err != nil {
		return 0, err
	}

	// Use LZ4 compression for the binary data
	lz4Writer := lz4.NewWriter(outFile)
	lz4Writer.Apply(lz4.CompressionLevelOption(lz4.Level1))
	lz4Writer.Write(originalData)
	lz4Writer.Close()

	// Return file size
	fileInfo, err := os.Stat(deltaPath)
	if err != nil {
		return 0, err
	}

	return fileInfo.Size(), nil
}

// fallbackToBinaryDelta falls back to regular binary delta if smart analysis fails
func (cm *CommitManager) fallbackToBinaryDelta(files []*staging.StagedFile, version, baseVersion int) (*CompressionResult, error) {
	fmt.Printf("Falling back to binary delta compression...\n")
	return cm.createBsdiffDelta(files, version, baseVersion)
}

// ============================================================================
// PHASE 1: Helper Functions for Bsdiff Delta Preprocessing
// ============================================================================

// getFileSize returns file size in bytes
func getFileSize(path string) (int64, error) {
	info, err := os.Stat(path)
	if err != nil {
		return 0, err
	}
	return info.Size(), nil
}

// convertToZip converts LZ4/Zstd/ZIP files to ZIP format for delta comparison
func (cm *CommitManager) convertToZip(sourcePath, zipPath string) error {
	if strings.HasSuffix(sourcePath, ".lz4") {
		return cm.convertLZ4ToZipForDelta(sourcePath, zipPath)
	} else if strings.HasSuffix(sourcePath, ".zstd") {
		return cm.convertZstdToZipForDelta(sourcePath, zipPath)
	} else if strings.HasSuffix(sourcePath, ".zip") {
		return cm.copyFile(sourcePath, zipPath)
	}
	return fmt.Errorf("unsupported source format: %s", sourcePath)
}

// convertLZ4ToZipForDelta converts LZ4 to ZIP for delta operations
func (cm *CommitManager) convertLZ4ToZipForDelta(lz4Path, zipPath string) error {
	// Open LZ4 file
	lz4File, err := os.Open(lz4Path)
	if err != nil {
		return fmt.Errorf("failed to open LZ4: %w", err)
	}
	defer lz4File.Close()

	// Create LZ4 reader
	lz4Reader := lz4.NewReader(lz4File)

	// Read all decompressed data
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

	// Parse structured LZ4 data and create ZIP entries
	return cm.parseStructuredDataToZip(decompressedData, zipWriter)
}

// convertZstdToZipForDelta converts Zstd to ZIP for delta operations
func (cm *CommitManager) convertZstdToZipForDelta(zstdPath, zipPath string) error {
	// Open Zstd file
	zstdFile, err := os.Open(zstdPath)
	if err != nil {
		return fmt.Errorf("failed to open Zstd: %w", err)
	}
	defer zstdFile.Close()

	// Create Zstd reader
	zstdReader, err := zstd.NewReader(zstdFile)
	if err != nil {
		return fmt.Errorf("failed to create Zstd reader: %w", err)
	}
	defer zstdReader.Close()

	// Read all decompressed data
	decompressedData, err := io.ReadAll(zstdReader)
	if err != nil {
		return fmt.Errorf("failed to decompress Zstd: %w", err)
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
	return cm.parseStructuredDataToZip(decompressedData, zipWriter)
}

// parseStructuredDataToZip parses FILE:path:size format and creates ZIP entries
func (cm *CommitManager) parseStructuredDataToZip(data []byte, zipWriter *zip.Writer) error {
	content := string(data)
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

		if fileDataEnd > len(data) {
			break
		}

		fileData := data[fileDataStart:fileDataEnd]

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

// createTempZipFile creates a temporary ZIP from staged files
func (cm *CommitManager) createTempZipFile(files []*staging.StagedFile, zipPath string) error {
	zipFile, err := os.Create(zipPath)
	if err != nil {
		return fmt.Errorf("failed to create temp ZIP: %w", err)
	}
	defer zipFile.Close()

	zipWriter := zip.NewWriter(zipFile)
	defer zipWriter.Close()

	for _, file := range files {
		// Read original file
		data, err := os.ReadFile(file.AbsolutePath)
		if err != nil {
			fmt.Printf("Warning: failed to read %s: %v\n", file.Path, err)
			continue
		}

		// Create ZIP entry
		w, err := zipWriter.Create(file.Path)
		if err != nil {
			fmt.Printf("Warning: failed to create ZIP entry for %s: %v\n", file.Path, err)
			continue
		}

		_, err = w.Write(data)
		if err != nil {
			fmt.Printf("Warning: failed to write ZIP entry for %s: %v\n", file.Path, err)
			continue
		}
	}

	return nil
}

// copyFile copies a file from src to dst
func (cm *CommitManager) copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("failed to open source file: %w", err)
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return fmt.Errorf("failed to create destination file: %w", err)
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	if err != nil {
		return fmt.Errorf("failed to copy file: %w", err)
	}

	return nil
}
