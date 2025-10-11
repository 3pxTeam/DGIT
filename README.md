# DGit: Version Control for Design Files

<p align="center">
    <img src="ui/assets/icon.png?raw=true" width="120" height="120" alt="DGit logo">
</p>

`DGit` is a version control system built for large design files like PSD, AI, and Sketch. Unlike traditional systems that struggle with binary files, DGit reads the internal structure of files to track changes efficiently.

## What DGit Does

DGit solves the storage problem of design files through smart compression and layer-level change detection.

**Key Features:**
* **Smart compression**: Picks the right method based on file size
  - Files under 100MB: Binary delta compression (saves space)
  - Files over 100MB: Fast LZ4 snapshots (saves time)
* **Layer tracking**: Analyzes PSD layers to find what changed
* **Fast and efficient**: Compresses files quickly while saving disk space

## Two Ways to Use DGit

### CLI (Command Line)
Simple commands for version control:
```bash
dgit init          # Start a project
dgit add .         # Add files
dgit commit "msg"  # Save version
dgit status        # Check changes
dgit log           # View history
```

### GUI (Visual Interface)
Easy-to-use interface with:
- Drag and drop files
- Visual commit history
- Project management

## Installation

**From Releases:**
Download the latest version from [GitHub Releases](https://github.com/3pxTeam/DGIT/releases).

**From Source:**
```bash
# Build DGit
go build -o dgit

# Or run directly
go run main.go --help
```

## Quick Start

```bash
# Start a new repository
dgit init

# Add files and create a commit
dgit add .
dgit commit "Initial design"

# Check what changed
dgit status

# View commit history
dgit log

# See details of a specific version
dgit show v1
```

## Supported Files

| **Full Support** | **Basic Support** | **General Files** |
|------------------|-------------------|-------------------|
| Adobe Photoshop (`.psd`) | Sketch (`.sketch`) | Images |
| Adobe Illustrator (`.ai`) | Figma (`.fig`) | Other binaries |
| | Adobe XD (`.xd`) | |

*Full Support: Analyzes metadata and tracks layers  
Basic Support: Tracks file versions only*

## How It Works

DGit stores your files in a clean structure:

```
.dgit/
├── snapshots/      # LZ4 compressed files
├── deltas/         # Binary delta files
├── commits/        # Commit information (JSON)
├── staging/        # Files ready to commit
├── temp/           # Temporary files
├── config          # Settings
└── HEAD            # Current version
```

## Built With

**Core Engine:**
- Go 1.21+
- LZ4 compression (pierrec/lz4)
- Binary diff (gabstv/go-bsdiff)
- PSD parser (oov/psd)

**CLI Tools:**
- Command framework (spf13/cobra)
- Terminal colors (fatih/color)

**GUI:**
- Electron + Node.js
- HTML/CSS/JavaScript

## What's New in v1.0

- ✅ **Better status command**: Now works correctly with LZ4 files
- ✅ **Pure Go binary diff**: No external programs needed
- ✅ **Smart file strategy**: Automatically picks the best compression
- ✅ **Cleaner code**: Removed unused folders and old code
- ✅ **Faster for large files**: Optimized for files over 100MB

## Contributing

We welcome contributions:
- 🐛 [Report bugs](https://github.com/3pxTeam/DGIT/issues)
- 💡 Suggest new features
- 📖 Share how you use DGit
- 🔧 Submit pull requests

## License

MIT License - see [LICENSE](LICENSE) for details.

All dependencies use permissive licenses (MIT, BSD, Apache 2.0) - see [NOTICE.md](NOTICE.md) for full information.

---

<p align="center">
Built by 3pxTeam | <a href="https://github.com/3pxTeam">GitHub</a>
</p>
