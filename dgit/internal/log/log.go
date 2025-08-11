package log

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
)

// CompressionResult contains comprehensive compression operation results
// Imported from commit package - enhanced with ultra-fast performance metrics
type CompressionResult struct {
	Strategy         string    `json:"strategy"`            // "lz4", "zip", "bsdiff", "xdelta3", "psd_smart_delta"
	OutputFile       string    `json:"output_file"`
	OriginalSize     int64     `json:"original_size"`
	CompressedSize   int64     `json:"compressed_size"`
	CompressionRatio float64   `json:"compression_ratio"`
	BaseVersion      int       `json:"base_version,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	
	// Ultra-Fast Performance Metrics - Core data for 225x speed improvement tracking
	CompressionTime  float64   `json:"compression_time_ms"` // Milliseconds - KEY METRIC for performance analysis
	CacheLevel       string    `json:"cache_level"`         // "hot", "warm", "cold" - cache tier utilization
	SpeedImprovement float64   `json:"speed_improvement"`   // Multiplier vs traditional methods
}

// Commit represents a single commit with enhanced ultra-fast compression information
// Extended with comprehensive compression and caching metadata for performance tracking
type Commit struct {
	Hash        string                 `json:"hash"`
	Message     string                 `json:"message"`
	Timestamp   time.Time              `json:"timestamp"`
	Author      string                 `json:"author"`
	FilesCount  int                    `json:"files_count"`
	Version     int                    `json:"version"`
	Metadata    map[string]interface{} `json:"metadata"`
	ParentHash  string                 `json:"parent_hash,omitempty"`
	
	// Enhanced ultra-fast compression information for performance analysis
	SnapshotZip     string             `json:"snapshot_zip,omitempty"`     // Legacy field for backward compatibility
	CompressionInfo *CompressionResult `json:"compression_info,omitempty"` // Ultra-fast compression metrics and data
}

// LogManager handles commit history operations with ultra-fast cache integration
// Enhanced to work seamlessly with 3-tier cache system for optimal performance
type LogManager struct {
	DgitDir      string
	ObjectsDir   string
	// Ultra-Fast Cache Integration for rapid log operations
	HotCacheDir  string   // LZ4 cache directory for instant access
	WarmCacheDir string   // Zstd cache directory for balanced performance
	ColdCacheDir string   // Archive cache directory for long-term storage
}

// NewLogManager creates a new ultra-fast log manager with cache awareness
// Initializes with full 3-tier cache system integration for optimal performance
func NewLogManager(dgitDir string) *LogManager {
	return &LogManager{
		DgitDir:      dgitDir,
		ObjectsDir:   filepath.Join(dgitDir, "objects"),
		HotCacheDir:  filepath.Join(dgitDir, "cache", "hot"),
		WarmCacheDir: filepath.Join(dgitDir, "cache", "warm"),
		ColdCacheDir: filepath.Join(dgitDir, "cache", "cold"),
	}
}

// GetCommitHistory returns complete commit history sorted by timestamp (newest first)
// Efficiently loads all commits with ultra-fast compression information
func (lm *LogManager) GetCommitHistory() ([]*Commit, error) {
	entries, err := os.ReadDir(lm.ObjectsDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read objects directory: %w", err)
	}

	var commits []*Commit
	// Process all commit metadata files
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), "v") && strings.HasSuffix(entry.Name(), ".json") {
			commitPath := filepath.Join(lm.ObjectsDir, entry.Name())
			commit, err := lm.loadCommit(commitPath)
			if err != nil {
				// Skip failed commits but continue processing others
				continue
			}
			commits = append(commits, commit)
		}
	}

	// Sort commits by timestamp (newest first) for intuitive display
	sort.Slice(commits, func(i, j int) bool {
		return commits[i].Timestamp.After(commits[j].Timestamp)
	})

	return commits, nil
}

// GetCommit returns a specific commit by version number
// Efficiently loads individual commit with all ultra-fast metadata
func (lm *LogManager) GetCommit(version int) (*Commit, error) {
	commitPath := filepath.Join(lm.ObjectsDir, fmt.Sprintf("v%d.json", version))
	return lm.loadCommit(commitPath)
}

// GetCommitByHash retrieves a commit by its full or short hash
// Supports partial hash matching for user convenience
func (lm *LogManager) GetCommitByHash(hash string) (*Commit, error) {
	entries, err := os.ReadDir(lm.ObjectsDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read objects directory: %w", err)
	}

	// Search through all commit files for hash match
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), "v") && strings.HasSuffix(entry.Name(), ".json") {
			commitPath := filepath.Join(lm.ObjectsDir, entry.Name())
			commit, err := lm.loadCommit(commitPath)
			if err != nil {
				continue
			}
			// Support both full and partial hash matching
			if strings.HasPrefix(commit.Hash, hash) {
				return commit, nil
			}
		}
	}
	return nil, fmt.Errorf("commit with hash '%s' not found", hash)
}

// GetCurrentVersion returns the current version number by scanning metadata files
// Efficiently determines the latest version for next commit numbering
func (lm *LogManager) GetCurrentVersion() int {
	entries, err := os.ReadDir(lm.ObjectsDir)
	if err != nil {
		return 0
	}

	maxVersion := 0
	// Find the highest version number in commit metadata files
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), "v") && strings.HasSuffix(entry.Name(), ".json") {
			versionStr := strings.TrimPrefix(strings.TrimSuffix(entry.Name(), ".json"), "v")
			if version, err := strconv.Atoi(versionStr); err == nil && version > maxVersion {
				maxVersion = version
			}
		}
	}

	return maxVersion
}

// GenerateCommitSummary generates comprehensive human-readable summary with ultra-fast metrics
// Enhanced to include performance information and cache utilization data
func (lm *LogManager) GenerateCommitSummary(commit *Commit) string {
	summary := fmt.Sprintf("[v%d] %s", commit.Version, commit.Message)
	
	if commit.FilesCount > 0 {
		summary += fmt.Sprintf(" (%d files)", commit.FilesCount)
	}

	// Add ultra-fast compression information for performance awareness
	if commit.CompressionInfo != nil {
		compressionPercent := (1.0 - commit.CompressionInfo.CompressionRatio) * 100
		switch commit.CompressionInfo.Strategy {
		case "lz4":
			summary += fmt.Sprintf(" • LZ4: %.1f%% (%.1fms)", compressionPercent, commit.CompressionInfo.CompressionTime)
		case "psd_smart_delta":
			summary += fmt.Sprintf(" • Smart PSD: %.1f%% saved", compressionPercent)
		case "design_smart_delta":
			summary += fmt.Sprintf(" • Smart Design: %.1f%% compressed", compressionPercent)
		case "zip":
			summary += fmt.Sprintf(" • ZIP: %.1f%% compressed", compressionPercent)
		case "bsdiff":
			summary += fmt.Sprintf(" • Delta: %.1f%% saved", compressionPercent)
		case "xdelta3":
			summary += fmt.Sprintf(" • XDelta: %.1f%% saved", compressionPercent)
		}
		
		// Add cache level information for performance context
		if commit.CompressionInfo.CacheLevel != "" {
			summary += fmt.Sprintf(" (%s cache)", commit.CompressionInfo.CacheLevel)
		}
	}

	// Add design file metadata insights for context
	var insights []string
	for fileName, metadata := range commit.Metadata {
		if metaMap, ok := metadata.(map[string]interface{}); ok {
			if layers, ok := metaMap["layers"].(float64); ok && layers > 0 {
				insights = append(insights, fmt.Sprintf("%s: %.0f layers", filepath.Base(fileName), layers))
			}
		}
	}

	// Include insights if available and not too verbose
	if len(insights) > 0 && len(insights) <= 3 {
		summary += " • " + strings.Join(insights, ", ")
	}

	return summary
}

// GetUltraFastCompressionStatistics returns comprehensive ultra-fast compression analytics
// Provides detailed performance metrics across all commits for optimization insights
func (lm *LogManager) GetUltraFastCompressionStatistics() (*UltraFastCompressionStatistics, error) {
	commits, err := lm.GetCommitHistory()
	if err != nil {
		return nil, err
	}
	
	stats := &UltraFastCompressionStatistics{
		TotalCommits:      len(commits),
		LegacyCommits:     0,
		UltraFastCommits:  0,
		TotalSavedSpace:   0,
		StrategyStats:     make(map[string]int),
		CacheLevelStats:   make(map[string]int),
		AvgCompressionTime: 0,
		TotalSpeedImprovement: 0,
	}
	
	var totalCompressionTime float64
	var totalSpeedImprovement float64
	ultraFastCount := 0
	
	// Analyze each commit for comprehensive statistics
	for _, commit := range commits {
		if commit.CompressionInfo != nil {
			// Track ultra-fast commits with detailed metrics
			stats.UltraFastCommits++
			stats.StrategyStats[commit.CompressionInfo.Strategy]++
			
			// Track cache level utilization for optimization insights
			if commit.CompressionInfo.CacheLevel != "" {
				stats.CacheLevelStats[commit.CompressionInfo.CacheLevel]++
			}
			
			// Calculate total space savings from compression
			spaceSaved := commit.CompressionInfo.OriginalSize - commit.CompressionInfo.CompressedSize
			stats.TotalSavedSpace += spaceSaved
			
			// Track performance metrics for continuous improvement
			if commit.CompressionInfo.CompressionTime > 0 {
				totalCompressionTime += commit.CompressionInfo.CompressionTime
				ultraFastCount++
			}
			
			if commit.CompressionInfo.SpeedImprovement > 0 {
				totalSpeedImprovement += commit.CompressionInfo.SpeedImprovement
			}
		} else {
			// Track legacy commits for migration planning
			stats.LegacyCommits++
		}
	}
	
	// Calculate performance averages for insights
	if ultraFastCount > 0 {
		stats.AvgCompressionTime = totalCompressionTime / float64(ultraFastCount)
	}
	if stats.UltraFastCommits > 0 {
		stats.TotalSpeedImprovement = totalSpeedImprovement / float64(stats.UltraFastCommits)
	}
	
	return stats, nil
}

// UltraFastCompressionStatistics represents comprehensive repository performance analytics
// Provides insights into ultra-fast compression system utilization and efficiency
type UltraFastCompressionStatistics struct {
	TotalCommits          int            `json:"total_commits"`
	LegacyCommits         int            `json:"legacy_commits"`
	UltraFastCommits      int            `json:"ultra_fast_commits"`
	TotalSavedSpace       int64          `json:"total_saved_space"`
	StrategyStats         map[string]int `json:"strategy_stats"`
	CacheLevelStats       map[string]int `json:"cache_level_stats"`
	AvgCompressionTime    float64        `json:"avg_compression_time_ms"`
	TotalSpeedImprovement float64        `json:"total_speed_improvement"`
}

// GetCommitStorageInfo returns detailed storage information with ultra-fast metrics
// Enhanced to show cache utilization and performance characteristics
func (lm *LogManager) GetCommitStorageInfo(commit *Commit) string {
	if commit.CompressionInfo == nil {
		// Legacy commit without ultra-fast compression information
		if commit.SnapshotZip != "" {
			return fmt.Sprintf("Legacy ZIP: %s", commit.SnapshotZip)
		}
		return "Unknown storage"
	}
	
	// Ultra-fast compression system with detailed performance metrics
	switch commit.CompressionInfo.Strategy {
	case "lz4":
		return fmt.Sprintf("LZ4 Ultra-Fast: %s (%.2f MB, %s cache, %.1fms)", 
			commit.CompressionInfo.OutputFile,
			float64(commit.CompressionInfo.CompressedSize)/(1024*1024),
			commit.CompressionInfo.CacheLevel,
			commit.CompressionInfo.CompressionTime)
	case "psd_smart_delta":
		return fmt.Sprintf("Smart PSD Delta: %s (%.2f KB, base: v%d, %.1fms)", 
			commit.CompressionInfo.OutputFile,
			float64(commit.CompressionInfo.CompressedSize)/1024,
			commit.CompressionInfo.BaseVersion,
			commit.CompressionInfo.CompressionTime)
	case "design_smart_delta":
		return fmt.Sprintf("Smart Design Delta: %s (%.2f KB, base: v%d)", 
			commit.CompressionInfo.OutputFile,
			float64(commit.CompressionInfo.CompressedSize)/1024,
			commit.CompressionInfo.BaseVersion)
	case "zip":
		return fmt.Sprintf("ZIP Snapshot: %s (%.2f MB)", 
			commit.CompressionInfo.OutputFile,
			float64(commit.CompressionInfo.CompressedSize)/(1024*1024))
	case "bsdiff":
		return fmt.Sprintf("Binary Delta: %s (%.2f KB, base: v%d)", 
			commit.CompressionInfo.OutputFile,
			float64(commit.CompressionInfo.CompressedSize)/1024,
			commit.CompressionInfo.BaseVersion)
	case "xdelta3":
		return fmt.Sprintf("Block Delta: %s (%.2f KB, base: v%d)", 
			commit.CompressionInfo.OutputFile,
			float64(commit.CompressionInfo.CompressedSize)/1024,
			commit.CompressionInfo.BaseVersion)
	default:
		return fmt.Sprintf("Unknown: %s", commit.CompressionInfo.OutputFile)
	}
}

// GetCommitEfficiency returns comprehensive compression efficiency information
// Enhanced with ultra-fast performance metrics and speed improvements
func (lm *LogManager) GetCommitEfficiency(commit *Commit) string {
	if commit.CompressionInfo == nil {
		return "N/A"
	}
	
	compressionPercent := (1.0 - commit.CompressionInfo.CompressionRatio) * 100
	
	// Strategy-specific efficiency reporting with performance context
	switch commit.CompressionInfo.Strategy {
	case "lz4":
		speedInfo := ""
		if commit.CompressionInfo.SpeedImprovement > 0 {
			speedInfo = fmt.Sprintf(" (%.1fx faster)", commit.CompressionInfo.SpeedImprovement)
		}
		return fmt.Sprintf("%.1f%% compression%s", compressionPercent, speedInfo)
	case "psd_smart_delta":
		return fmt.Sprintf("%.1f%% space saving (smart delta)", compressionPercent)
	case "design_smart_delta":
		return fmt.Sprintf("%.1f%% compression (smart)", compressionPercent)
	case "zip":
		return fmt.Sprintf("%.1f%% compression", compressionPercent)
	case "bsdiff", "xdelta3":
		return fmt.Sprintf("%.1f%% space saving", compressionPercent)
	default:
		return fmt.Sprintf("%.1f%% efficiency", compressionPercent)
	}
}

// FindCommitsByStorageType finds commits using specific storage strategies
// Enhanced for ultra-fast system with comprehensive strategy filtering
func (lm *LogManager) FindCommitsByStorageType(storageType string) ([]*Commit, error) {
	allCommits, err := lm.GetCommitHistory()
	if err != nil {
		return nil, err
	}
	
	var filteredCommits []*Commit
	
	// Filter commits based on storage type with ultra-fast strategy awareness
	for _, commit := range allCommits {
		switch storageType {
		case "legacy":
			// Legacy commits without ultra-fast compression
			if commit.CompressionInfo == nil && commit.SnapshotZip != "" {
				filteredCommits = append(filteredCommits, commit)
			}
		case "ultra_fast":
			// Any ultra-fast compression strategy
			if commit.CompressionInfo != nil && 
			   (commit.CompressionInfo.Strategy == "lz4" || 
			    commit.CompressionInfo.Strategy == "psd_smart_delta" ||
			    commit.CompressionInfo.Strategy == "design_smart_delta") {
				filteredCommits = append(filteredCommits, commit)
			}
		case "lz4":
			// Specifically LZ4 ultra-fast compression
			if commit.CompressionInfo != nil && commit.CompressionInfo.Strategy == "lz4" {
				filteredCommits = append(filteredCommits, commit)
			}
		case "smart_delta":
			// Smart delta compression strategies
			if commit.CompressionInfo != nil && 
			   (commit.CompressionInfo.Strategy == "psd_smart_delta" ||
			    commit.CompressionInfo.Strategy == "design_smart_delta") {
				filteredCommits = append(filteredCommits, commit)
			}
		case "zip":
			// Traditional ZIP compression
			if commit.CompressionInfo != nil && commit.CompressionInfo.Strategy == "zip" {
				filteredCommits = append(filteredCommits, commit)
			}
		case "delta":
			// Binary delta compression strategies
			if commit.CompressionInfo != nil && 
			   (commit.CompressionInfo.Strategy == "bsdiff" || commit.CompressionInfo.Strategy == "xdelta3") {
				filteredCommits = append(filteredCommits, commit)
			}
		case "all":
			// All commits regardless of storage type
			filteredCommits = append(filteredCommits, commit)
		}
	}
	
	return filteredCommits, nil
}

// GetRepositorySizeBreakdown returns detailed size breakdown with ultra-fast cache information
// Enhanced with 3-tier cache system analysis for comprehensive storage insights
func (lm *LogManager) GetRepositorySizeBreakdown() (*SizeBreakdown, error) {
	breakdown := &SizeBreakdown{
		ZipFiles:    0,
		DeltaFiles:  0,
		Metadata:    0,
		HotCache:    0,
		WarmCache:   0,
		ColdCache:   0,
		Total:       0,
	}
	
	// Calculate traditional objects directory size
	err := filepath.Walk(lm.ObjectsDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		
		size := info.Size()
		breakdown.Total += size
		
		// Categorize files by type for detailed breakdown
		if strings.HasSuffix(path, ".zip") {
			breakdown.ZipFiles += size
		} else if strings.Contains(path, "deltas") {
			breakdown.DeltaFiles += size
		} else if strings.HasSuffix(path, ".json") {
			breakdown.Metadata += size
		}
		
		return nil
	})
	
	if err != nil {
		return breakdown, err
	}
	
	// Calculate ultra-fast cache sizes for comprehensive analysis
	lm.calculateCacheSize(lm.HotCacheDir, &breakdown.HotCache)
	lm.calculateCacheSize(lm.WarmCacheDir, &breakdown.WarmCache)
	lm.calculateCacheSize(lm.ColdCacheDir, &breakdown.ColdCache)
	
	// Include cache sizes in total for complete picture
	breakdown.Total += breakdown.HotCache + breakdown.WarmCache + breakdown.ColdCache
	
	return breakdown, nil
}

// calculateCacheSize calculates total size of a cache directory recursively
// Helper function for comprehensive cache utilization analysis
func (lm *LogManager) calculateCacheSize(cacheDir string, size *int64) {
	filepath.Walk(cacheDir, func(path string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() {
			*size += info.Size()
		}
		return nil
	})
}

// SizeBreakdown represents comprehensive repository size analysis
// Enhanced with ultra-fast cache information for complete storage visibility
type SizeBreakdown struct {
	ZipFiles   int64 `json:"zip_files"`    // Traditional ZIP snapshots
	DeltaFiles int64 `json:"delta_files"`  // Delta compression files
	Metadata   int64 `json:"metadata"`     // Commit metadata JSON files
	HotCache   int64 `json:"hot_cache"`    // LZ4 hot cache for instant access
	WarmCache  int64 `json:"warm_cache"`   // Zstd warm cache for balanced performance
	ColdCache  int64 `json:"cold_cache"`   // Archive cold cache for long-term storage
	Total      int64 `json:"total"`        // Total repository size including all caches
}

// GetCacheUtilization returns comprehensive cache utilization statistics
// Provides insights into 3-tier cache system performance and efficiency
func (lm *LogManager) GetCacheUtilization() (*CacheUtilization, error) {
	commits, err := lm.GetCommitHistory()
	if err != nil {
		return nil, err
	}
	
	utilization := &CacheUtilization{
		HotCacheFiles:  0,
		WarmCacheFiles: 0,
		ColdCacheFiles: 0,
		TotalCacheSize: 0,
	}
	
	// Analyze cache utilization across all commits
	for _, commit := range commits {
		if commit.CompressionInfo != nil {
			// Track cache tier utilization for optimization insights
			switch commit.CompressionInfo.CacheLevel {
			case "hot":
				utilization.HotCacheFiles++
			case "warm":
				utilization.WarmCacheFiles++
			case "cold":
				utilization.ColdCacheFiles++
			}
			utilization.TotalCacheSize += commit.CompressionInfo.CompressedSize
		}
	}
	
	return utilization, nil
}

// CacheUtilization represents detailed cache usage statistics
// Provides insights for optimizing 3-tier cache system performance
type CacheUtilization struct {
	HotCacheFiles  int   `json:"hot_cache_files"`   // Files in hot cache (LZ4)
	WarmCacheFiles int   `json:"warm_cache_files"`  // Files in warm cache (Zstd)
	ColdCacheFiles int   `json:"cold_cache_files"`  // Files in cold cache (Archive)
	TotalCacheSize int64 `json:"total_cache_size"`  // Total cached data size
}

// loadCommit loads a commit from a JSON metadata file
// Core function for reading commit information with error handling
func (lm *LogManager) loadCommit(path string) (*Commit, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var commit Commit
	if err := json.Unmarshal(data, &commit); err != nil {
		return nil, err
	}

	return &commit, nil
}

// ============================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// These functions maintain backward compatibility while leveraging ultra-fast improvements
// ============================================================================

// GetCompressionStatistics returns compression statistics (legacy function name)
// Redirects to ultra-fast statistics for backward compatibility
func (lm *LogManager) GetCompressionStatistics() (*CompressionStatistics, error) {
	ultraFastStats, err := lm.GetUltraFastCompressionStatistics()
	if err != nil {
		return nil, err
	}
	
	// Convert ultra-fast stats to legacy format for compatibility
	return &CompressionStatistics{
		TotalCommits:      ultraFastStats.TotalCommits,
		LegacyCommits:     ultraFastStats.LegacyCommits,
		CompressedCommits: ultraFastStats.UltraFastCommits,
		TotalSavedSpace:   ultraFastStats.TotalSavedSpace,
		StrategyStats:     ultraFastStats.StrategyStats,
	}, nil
}

// CompressionStatistics represents repository compression statistics (legacy)
// Maintained for backward compatibility with existing code
type CompressionStatistics struct {
	TotalCommits      int            `json:"total_commits"`
	LegacyCommits     int            `json:"legacy_commits"`
	CompressedCommits int            `json:"compressed_commits"`
	TotalSavedSpace   int64          `json:"total_saved_space"`
	StrategyStats     map[string]int `json:"strategy_stats"`
}