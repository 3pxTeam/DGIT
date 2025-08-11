package cmd

import (
	"fmt"
	"os"
	"strings"

	"dgit/internal/scanner"
	"github.com/spf13/cobra"
)

// ScanCmd represents the scan command for analyzing design files
// Unique to DGit - provides detailed metadata analysis of design files
var ScanCmd = &cobra.Command{
	Use:   "scan [folder]",
	Short: "Scan and analyze design files",
	Long: `Scan the specified folder (or current directory) for design files
and display detailed metadata information including:
- File dimensions and color modes
- Layer information and artboard counts
- Version information for supported applications
- Object counts and other design-specific data`,
	Args: cobra.MaximumNArgs(1),  // Optional folder argument
	Run:  runScan,
}

// runScan executes the scan command functionality
// Analyzes design files in the specified directory and shows detailed metadata
func runScan(cmd *cobra.Command, args []string) {
	// Determine target directory for scanning
	var targetDir string
	if len(args) == 0 {
		targetDir = "."  // Current directory if none specified
	} else {
		targetDir = args[0]  // Use specified directory
	}

	// Ensure we're in a DGit repository before scanning
	if !isInDgitRepository() {
		printError("not a dgit repository (or any of the parent directories)")
		printSuggestion("Run 'dgit init' to initialize a repository")
		os.Exit(1)
	}

	// Display scan start message
	fmt.Printf("Scanning design files in: %s\n", targetDir)

	// Perform the actual directory scan
	fileScanner := scanner.NewFileScanner()
	result, err := fileScanner.ScanDirectory(targetDir)
	if err != nil {
		printError(fmt.Sprintf("%v", err))
		os.Exit(1)
	}

	// Display scan results in DGit style
	printScanResults(result)
}

// printScanResults displays scan results in DGit-specific format
// Shows summary, file type statistics, errors, and detailed file information
func printScanResults(result *scanner.ScanResult) {
	// Handle case where no design files were found
	if result.TotalFiles == 0 {
		fmt.Println("No design files found in the specified directory.")
		fmt.Println("   Supported formats: .ai, .psd, .sketch, .fig, .xd, .afdesign, .afphoto")
		return
	}

	// Display summary information
	fmt.Printf("Found %d design files (%.2f MB total)\n\n",
		result.TotalFiles, float64(result.TotalSize)/(1024*1024))

	// Show file type statistics if available
	if len(result.TypeCounts) > 0 {
		fmt.Println("File Types:")
		for fileType, count := range result.TypeCounts {
			fileTypeDisplay := getFileTypeDisplay(fileType)
			fmt.Printf("   %s files: %d\n", fileTypeDisplay, count)
		}
		fmt.Println()
	}

	// Display warning for files that had analysis errors
	if len(result.ErrorFiles) > 0 {
		fmt.Printf("Warning: %d files had analysis errors:\n", len(result.ErrorFiles))
		for file, err := range result.ErrorFiles {
			fmt.Printf("   • %s: %v\n", file, err)
		}
		fmt.Println()
	}

	// Show detailed analysis for each design file
	fmt.Println("Design Files Analysis:")
	for _, file := range result.DesignFiles {
		printDesignFileInfo(&file)
	}

	fmt.Printf("Scan completed - %d files analyzed\n", len(result.DesignFiles))
}

// printDesignFileInfo displays detailed information for individual design files
// Shows file-specific metadata that's unique to DGit
func printDesignFileInfo(file *scanner.DesignFile) {
	fileTypeDisplay := getFileTypeDisplay(file.Type)
	fmt.Printf("[%s] %s\n", fileTypeDisplay, file.Path)

	// Display core design file information
	// These are design-specific details that Git doesn't track
	fmt.Printf("   %s • %s • %s\n",
		file.Dimensions, file.ColorMode, file.Version)

	// Display layer/artboard/object counts if available
	// Build the details string dynamically based on what data is available
	if file.Layers > 0 || file.Artboards > 0 || file.Objects > 0 {
		var details []string
		if file.Layers > 0 {
			details = append(details, fmt.Sprintf("%d layers", file.Layers))
		}
		if file.Artboards > 0 {
			details = append(details, fmt.Sprintf("%d artboards", file.Artboards))
		}
		if file.Objects > 0 {
			details = append(details, fmt.Sprintf("%d objects", file.Objects))
		}
		fmt.Printf("   %s\n", strings.Join(details, " • "))
	}
}

// getFileTypeDisplay returns display string for file types
// Provides consistent file type representation across DGit
func getFileTypeDisplay(fileType string) string {
	switch strings.ToLower(fileType) {
	case "ai":
		return "AI"      // Adobe Illustrator
	case "psd":
		return "PSD"     // Adobe Photoshop
	case "sketch":
		return "SKETCH"  // Sketch
	case "fig":
		return "FIG"     // Figma
	case "xd":
		return "XD"      // Adobe XD
	case "afdesign", "afphoto":
		return "AFFINITY" // Affinity Designer/Photo
	default:
		return "FILE"    // Generic file
	}
}