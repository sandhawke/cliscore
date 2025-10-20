# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added `files` field to package.json to reduce published package size
- Added LICENSE file (MIT)
- Added CHANGELOG.md to track version history
- Added `--version` flag to display version number
- Improved cliscore.sh discovery to check test file's directory as fallback

### Fixed
- Fixed file extension detection to use `path.extname()` instead of string splitting
  - Now correctly handles files without extensions
  - Better handling of paths with dots

### Changed
- Package size reduced from 194.7 kB to ~100 kB (50% reduction)
- Published package now excludes test files and internal documentation

## [0.1.1] - 2024-10-19

### Added
- Phase 3 features: debug mode, trace mode, inline patterns, progress reporting
- `--debug` flag to show test summaries
- `--trace` flag to show all I/O events
- `--progress` flag for real-time progress updates
- `--skip` flag for test skipping
- Inline pattern matching in output lines

### Fixed
- Config merge logic to respect config file over defaults
- Prioritized bracketed syntax over inline patterns for clearer behavior

## [0.1.0] - Initial Release

### Added
- UTF format (.t files) support
- Markdown format (.md files) support with console/cliscore code blocks
- Extended format (.cliscore files)
- Multiple output matching types:
  - Literal text matching
  - Regular expressions with flags
  - Glob patterns
  - Ellipsis (`...`) for zero or more lines
  - No-EOL handling
  - Stderr matching with `[stderr:]` syntax
- Parallel test execution with `--jobs` and `--fast` flags
- Interactive step mode with `--step` flag
- Configuration file support (cliscore.json)
- Setup/teardown lifecycle functions:
  - `run_first()` - runs before tests in separate shell
  - `before_each_file()` - runs at test shell start
  - `after_each_file()` - runs before test shell exit
  - `run_last()` - runs after tests in separate shell
- Multiple verbosity levels (quiet, normal, verbose, very verbose)
- JSON output mode for CI/CD integration
- Dry-run mode for test validation
- Configurable shell selection
- Configurable timeout per test (default: 30s)
- Automatic test file discovery with glob patterns
- Comprehensive error messages with helpful hints

[Unreleased]: https://github.com/sandhawke/cliscore/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/sandhawke/cliscore/releases/tag/v0.1.1
[0.1.0]: https://github.com/sandhawke/cliscore/releases/tag/v0.1.0
