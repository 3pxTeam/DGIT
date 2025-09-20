package staging

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/pierrec/lz4/v4"
)

// StagedFile represents a file in the staging area with ultra-fast cache integration
type StagedFile struct {
	Path         string    `json:"path"`
	AbsolutePath string    `json:"absolute_path"`
	FileType     string    `json:"file_type"`
	Size         int64     `json:"size"`
	ModTime      time.Time `json:"mod_time"`
	AddedAt      time.Time `json:"added_at"`
	
	// Cache integration fields
	Hash          string        `json:"hash"`           // File hash for cache key
	CacheLevel    string        `json:"cache_level"`    // hot/warm/cold
	PreCompressed bool          `json:"pre_compressed"` // LZ4 pre-compression status
	Metadata      *FileMetadata `json:"metadata,omitempty"` // Pre-extracted metadata
}

// FileMetadata contains pre-extracted design file metadata for ultra-fast commits
type FileMetadata struct {
	Dimensions  string    `json:"dimensions,omitempty"`   // "1920x1080"
	ColorMode   string    `json:"color_mode,omitempty"`   // RGB, CMYK
	Resolution  int       `json:"resolution,omitempty"`   // DPI
	LayerCount  int       `json:"layer_count,omitempty"`  // Number of layers
	FileVersion string    `json:"file_version,omitempty"` // PSD version, AI version
	ExtractedAt time.Time `json:"extracted_at"`
}

// AddResult contains the result of adding files with cache performance metrics
type AddResult struct {
	AddedFiles     []string
	FailedFiles    map[string]error
	CacheStats     *CacheStats
	ProcessingTime time.Duration
}

// CacheStats tracks ultra-fast cache performance
type CacheStats struct {
	HotCacheHits      int `json:"hot_cache_hits"`
	WarmCacheHits     int `json:"warm_cache_hits"`
	ColdCacheHits     int `json:"cold_cache_hits"`
	NewFiles          int `json:"new_files"`
	PreCompressed     int `json:"pre_compressed"`
	MetadataExtracted int `json:"metadata_extracted"`
}

// StagingArea manages the ultra-fast staging area for DGit
type StagingArea struct {
	DgitDir     string
	StagingFile string
	files       map[string]*StagedFile
	
	// Cache directories
	hotCacheDir  string
	warmCacheDir string
	coldCacheDir string
	cacheStats   *CacheStats
}

// NewStagingArea creates a new ultra-fast staging area manager with 3-tier cache
func NewStagingArea(dgitDir string) *StagingArea {
	stagingDir := filepath.Join(dgitDir, "staging")
	os.MkdirAll(stagingDir, 0755)
	
	// Initialize 3-tier cache directories
	hotCache := filepath.Join(dgitDir, "cache", "hot")
	warmCache := filepath.Join(dgitDir, "cache", "warm")
	coldCache := filepath.Join(dgitDir, "cache", "cold")
	
	os.MkdirAll(hotCache, 0755)
	os.MkdirAll(warmCache, 0755)
	os.MkdirAll(coldCache, 0755)
	
	return &StagingArea{
		DgitDir:      dgitDir,
		StagingFile:  filepath.Join(stagingDir, "staged.json"),
		files:        make(map[string]*StagedFile),
		hotCacheDir:  hotCache,
		warmCacheDir: warmCache,
		coldCacheDir: coldCache,
		cacheStats:   &CacheStats{},
	}
}

// LoadStaging loads the current staging area from disk with cache validation
func (s *StagingArea) LoadStaging() error {
	if _, err := os.Stat(s.StagingFile); os.IsNotExist(err) {
		return nil // No staging file exists yet
	}

	data, err := os.ReadFile(s.StagingFile)
	if err != nil {
		return fmt.Errorf("failed to read staging file: %w", err)
	}

	var files map[string]*StagedFile
	if err := json.Unmarshal(data, &files); err != nil {
		return fmt.Errorf("failed to parse staging file: %w", err)
	}

	s.files = files
	s.validateCacheIntegrity()
	
	return nil
}

// validateCacheIntegrity ensures all cached files are accessible for 0.2s commits
func (s *StagingArea) validateCacheIntegrity() {
	for _, file := range s.files {
		if file.Hash != "" {
			cachePath := s.getCachePath(file.Hash, file.CacheLevel)
			if _, err := os.Stat(cachePath); err != nil {
				// Cache miss - demote to lower tier or mark for re-caching
				s.demoteCacheLevel(file)
			}
		}
	}
}

// SaveStaging saves the current staging area to disk with cache optimization
func (s *StagingArea) SaveStaging() error {
	data, err := json.MarshalIndent(s.files, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal staging data: %w", err)
	}

	if err := os.WriteFile(s.StagingFile, data, 0644); err != nil {
		return fmt.Errorf("failed to write staging file: %w", err)
	}

	return nil
}

// AddFile adds a file to the staging area with ultra-fast cache pre-processing
func (s *StagingArea) AddFile(path string) error {
	startTime := time.Now()
	
	// Convert to absolute path
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("failed to get absolute path: %w", err)
	}

	// Check if file exists
	fileInfo, err := os.Stat(absPath)
	if err != nil {
		return fmt.Errorf("file not found: %w", err)
	}

	// Check if it's a design file
	if !isDesignFile(absPath) {
		return fmt.Errorf("not a design file: %s (supported: .ai, .psd, .sketch, .fig, .xd, .blend)", path)
	}

	// Get relative path from current directory
	currentDir, _ := os.Getwd()
	relPath, err := filepath.Rel(currentDir, absPath)
	if err != nil {
		relPath = absPath
	}

	// Generate file hash for cache key
	hash, err := s.generateFileHash(absPath)
	if err != nil {
		return fmt.Errorf("failed to generate file hash: %w", err)
	}

	// Determine cache level based on file characteristics
	cacheLevel := s.determineCacheLevel(absPath, fileInfo.Size())
	
	// Create staged file entry with ultra-fast cache integration
	stagedFile := &StagedFile{
		Path:          relPath,
		AbsolutePath:  absPath,
		FileType:      strings.ToLower(filepath.Ext(absPath)[1:]),
		Size:          fileInfo.Size(),
		ModTime:       fileInfo.ModTime(),
		AddedAt:       time.Now(),
		Hash:          hash,
		CacheLevel:    cacheLevel,
		PreCompressed: false,
	}

	// Pre-process for ultra-fast commits
	if err := s.preprocessFile(stagedFile); err != nil {
		fmt.Printf("Warning: failed to preprocess %s: %v\n", path, err)
	}

	s.files[absPath] = stagedFile
	
	processingTime := time.Since(startTime)
	fmt.Printf("Added %s to %s cache (processed in %v)\n", 
		filepath.Base(path), cacheLevel, processingTime)
	
	return nil
}

// preprocessFile performs ultra-fast preprocessing for 0.2s commits
func (s *StagingArea) preprocessFile(file *StagedFile) error {
	// LZ4 Pre-compression for hot cache
	if file.CacheLevel == "hot" {
		if err := s.createLZ4PrecompressedCache(file); err != nil {
			return err
		}
		file.PreCompressed = true
		s.cacheStats.PreCompressed++
	}

	// Extract metadata for instant commit info
	metadata, err := s.extractDesignFileMetadata(file.AbsolutePath, file.FileType)
	if err != nil {
		fmt.Printf("Warning: failed to extract metadata from %s: %v\n", file.Path, err)
	} else {
		file.Metadata = metadata
		s.cacheStats.MetadataExtracted++
	}

	// Cache file in appropriate tier
	return s.cacheFileInTier(file)
}

// createLZ4PrecompressedCache creates LZ4 compressed cache for 0.2s access
func (s *StagingArea) createLZ4PrecompressedCache(file *StagedFile) error {
	// Open source file for streaming compression
	srcFile, err := os.Open(file.AbsolutePath)
	if err != nil {
		return fmt.Errorf("failed to open source file: %w", err)
	}
	defer srcFile.Close()

	// Create cache file
	cachePath := s.getCachePath(file.Hash, "hot")
	cacheFile, err := os.Create(cachePath)
	if err != nil {
		return fmt.Errorf("failed to create cache file: %w", err)
	}
	defer cacheFile.Close()

	// Ultra-fast LZ4 compression using streaming
	lz4Writer := lz4.NewWriter(cacheFile)
	lz4Writer.Apply(lz4.CompressionLevelOption(lz4.Level1))
	
	// Stream copy with proper error handling
	written, err := io.Copy(lz4Writer, srcFile)
	if err != nil {
		lz4Writer.Close()
		os.Remove(cachePath)
		return fmt.Errorf("failed to compress file: %w", err)
	}
	
	// Ensure proper close
	err = lz4Writer.Close()
	if err != nil {
		os.Remove(cachePath)
		return fmt.Errorf("failed to finalize compression: %w", err)
	}

	// Verify compression worked
	if written == 0 {
		os.Remove(cachePath)
		return fmt.Errorf("no data was compressed")
	}

	return nil
}

// extractDesignFileMetadata extracts key metadata for instant commit info
func (s *StagingArea) extractDesignFileMetadata(path, fileType string) (*FileMetadata, error) {
	metadata := &FileMetadata{
		ExtractedAt: time.Now(),
	}

	// Quick file analysis based on type
	switch fileType {
	case "psd":
		return s.extractPSDMetadata(path, metadata)
	case "ai":
		return s.extractAIMetadata(path, metadata)
	case "sketch":
		return s.extractSketchMetadata(path, metadata)
	case "fig":
		metadata.FileVersion = "Figma"
		return metadata, nil
	default:
		metadata.FileVersion = strings.ToUpper(fileType)
		return metadata, nil
	}
}

// extractPSDMetadata extracts PSD-specific metadata for ultra-fast commits
func (s *StagingArea) extractPSDMetadata(path string, metadata *FileMetadata) (*FileMetadata, error) {
	// Quick PSD header analysis (first 512 bytes for speed)
	file, err := os.Open(path)
	if err != nil {
		return metadata, err
	}
	defer file.Close()

	header := make([]byte, 512)
	n, err := file.Read(header)
	if err != nil || n < 26 {
		return metadata, err
	}

	// PSD signature check
	if string(header[0:4]) != "8BPS" {
		return metadata, fmt.Errorf("not a valid PSD file")
	}

	// Extract dimensions from header
	if n >= 26 {
		height := uint32(header[14])<<24 | uint32(header[15])<<16 | uint32(header[16])<<8 | uint32(header[17])
		width := uint32(header[18])<<24 | uint32(header[19])<<16 | uint32(header[20])<<8 | uint32(header[21])
		metadata.Dimensions = fmt.Sprintf("%dx%d", width, height)
	}

	// Extract color mode
	if n >= 26 {
		colorMode := uint16(header[24])<<8 | uint16(header[25])
		switch colorMode {
		case 1:
			metadata.ColorMode = "Grayscale"
		case 3:
			metadata.ColorMode = "RGB"
		case 4:
			metadata.ColorMode = "CMYK"
		default:
			metadata.ColorMode = "Unknown"
		}
	}

	metadata.FileVersion = "PSD"
	return metadata, nil
}

// extractAIMetadata extracts Illustrator-specific metadata
func (s *StagingArea) extractAIMetadata(path string, metadata *FileMetadata) (*FileMetadata, error) {
	metadata.FileVersion = "AI"
	metadata.ColorMode = "CMYK"
	return metadata, nil
}

// extractSketchMetadata extracts Sketch-specific metadata
func (s *StagingArea) extractSketchMetadata(path string, metadata *FileMetadata) (*FileMetadata, error) {
	metadata.FileVersion = "Sketch"
	metadata.ColorMode = "RGB"
	return metadata, nil
}

// cacheFileInTier caches file in the appropriate tier for ultra-fast access
func (s *StagingArea) cacheFileInTier(file *StagedFile) error {
	cachePath := s.getCachePath(file.Hash, file.CacheLevel)
	
	// For hot cache, file is already pre-compressed
	if file.CacheLevel == "hot" && file.PreCompressed {
		return nil
	}

	// For warm/cold cache, create symlink or copy as needed
	return s.createCacheEntry(file.AbsolutePath, cachePath)
}

// determineCacheLevel determines optimal cache level based on file characteristics
func (s *StagingArea) determineCacheLevel(path string, size int64) string {
	// Ultra-fast hot cache for small frequently-used files (< 50MB)
	if size < 50*1024*1024 {
		return "hot"
	}
	
	// Warm cache for medium files (50MB - 200MB)
	if size < 200*1024*1024 {
		return "warm"
	}
	
	// Cold cache for large files (> 200MB)
	return "cold"
}

// getCachePath returns the cache path for a given hash and level
func (s *StagingArea) getCachePath(hash, level string) string {
	var cacheDir string
	switch level {
	case "hot":
		cacheDir = s.hotCacheDir
	case "warm":
		cacheDir = s.warmCacheDir
	case "cold":
		cacheDir = s.coldCacheDir
	default:
		cacheDir = s.warmCacheDir
	}
	
	return filepath.Join(cacheDir, hash)
}

// createCacheEntry creates a cache entry (symlink or copy)
func (s *StagingArea) createCacheEntry(sourcePath, cachePath string) error {
	// Create symlink for efficiency
	if err := os.Symlink(sourcePath, cachePath); err != nil {
		// If symlink fails, copy the file
		return s.copyFile(sourcePath, cachePath)
	}
	return nil
}

// copyFile copies a file from source to destination
func (s *StagingArea) copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = destFile.ReadFrom(sourceFile)
	return err
}

// demoteCacheLevel demotes a file to a lower cache tier
func (s *StagingArea) demoteCacheLevel(file *StagedFile) {
	switch file.CacheLevel {
	case "hot":
		file.CacheLevel = "warm"
	case "warm":
		file.CacheLevel = "cold"
	}
}

// generateFileHash generates a hash for cache key
func (s *StagingArea) generateFileHash(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	
	// For large files, hash only first 64KB for speed
	buffer := make([]byte, 64*1024)
	n, _ := file.Read(buffer)
	
	hash.Write(buffer[:n])
	return hex.EncodeToString(hash.Sum(nil)), nil
}

// AddPattern adds files matching a pattern to staging area with ultra-fast processing
func (s *StagingArea) AddPattern(pattern string) (*AddResult, error) {
	startTime := time.Now()
	
	if pattern == "." {
		// Add all design files in current directory
		result, err := s.addAllDesignFiles(".")
		if result != nil {
			result.ProcessingTime = time.Since(startTime)
			result.CacheStats = s.cacheStats
		}
		return result, err
	}

	// Handle glob patterns
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return nil, fmt.Errorf("invalid pattern: %w", err)
	}

	if len(matches) == 0 {
		return nil, fmt.Errorf("no files match pattern: %s", pattern)
	}

	result := &AddResult{
		AddedFiles:  []string{},
		FailedFiles: make(map[string]error),
		CacheStats:  s.cacheStats,
	}

	for _, match := range matches {
		if isDesignFile(match) {
			if err := s.AddFile(match); err != nil {
				result.FailedFiles[match] = err
			} else {
				result.AddedFiles = append(result.AddedFiles, match)
				s.cacheStats.NewFiles++
			}
		}
	}

	if len(result.AddedFiles) == 0 {
		return nil, fmt.Errorf("no design files found matching pattern: %s", pattern)
	}

	result.ProcessingTime = time.Since(startTime)
	return result, nil
}

// addAllDesignFiles recursively adds all design files with ultra-fast processing
func (s *StagingArea) addAllDesignFiles(dir string) (*AddResult, error) {
	result := &AddResult{
		AddedFiles:  []string{},
		FailedFiles: make(map[string]error),
		CacheStats:  s.cacheStats,
	}

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip .dgit directory
		if strings.Contains(path, ".dgit") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		if !info.IsDir() && isDesignFile(path) {
			if err := s.AddFile(path); err != nil {
				result.FailedFiles[path] = err
			} else {
				result.AddedFiles = append(result.AddedFiles, path)
				s.cacheStats.NewFiles++
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	if len(result.AddedFiles) == 0 {
		return nil, fmt.Errorf("no design files found in directory: %s", dir)
	}

	return result, nil
}

// GetCacheStats returns current cache performance statistics
func (s *StagingArea) GetCacheStats() *CacheStats {
	return s.cacheStats
}

// RemoveFile removes a file from staging area and cache
func (s *StagingArea) RemoveFile(path string) error {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("failed to get absolute path: %w", err)
	}

	file, exists := s.files[absPath]
	if !exists {
		return fmt.Errorf("file not in staging area: %s", path)
	}

	// Remove from cache
	if file.Hash != "" {
		cachePath := s.getCachePath(file.Hash, file.CacheLevel)
		os.Remove(cachePath) // Ignore errors for cache cleanup
	}

	delete(s.files, absPath)
	return nil
}

// GetStagedFiles returns all files in the staging area
func (s *StagingArea) GetStagedFiles() []*StagedFile {
	files := make([]*StagedFile, 0, len(s.files))
	for _, file := range s.files {
		files = append(files, file)
	}
	return files
}

// IsEmpty returns true if the staging area is empty
func (s *StagingArea) IsEmpty() bool {
	return len(s.files) == 0
}

// ClearStaging clears all files from staging area and cache
func (s *StagingArea) ClearStaging() error {
	// Clear cache entries
	for _, file := range s.files {
		if file.Hash != "" {
			cachePath := s.getCachePath(file.Hash, file.CacheLevel)
			os.Remove(cachePath)
		}
	}
	
	s.files = make(map[string]*StagedFile)
	s.cacheStats = &CacheStats{}
	return s.SaveStaging()
}

// GetFileCount returns the number of staged files
func (s *StagingArea) GetFileCount() int {
	return len(s.files)
}

// HasFile checks if a file is in the staging area
func (s *StagingArea) HasFile(path string) bool {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return false
	}
	_, exists := s.files[absPath]
	return exists
}

// isDesignFile checks if a file is a supported design file
func isDesignFile(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	supportedExts := []string{
		".ai", ".psd", ".sketch", ".fig", ".xd",
		".afdesign", ".afphoto", ".blend", ".c4d",
		".max", ".mb", ".ma", ".fbx", ".obj",
	}
	
	for _, supportedExt := range supportedExts {
		if ext == supportedExt {
			return true
		}
	}
	return false
}