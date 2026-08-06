# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- None

### Changed

- None

### Removed

- None

## [0.12.8] - 2026-08-06

### Changed

- Changed the update service domain to `genshin-gacha-export.trrw.cn`.

## [0.12.7] - 2026-05-29
<p color="red">⚠️本次更新软件后建议重新获取完整数据⚠️</p>

### Fixed

- Fixed UIGF v4.2 export missing `schedule_id` and `item_id` fields in hk4e_ugc.
- Fixed import crash when UIGF v4.2 file has no `hk4e` or `hk4e_ugc` field.
- Fixed `saveAndBackup` uid type inconsistency by converting to string.

## [0.12.6] - 2026-05-28

### Added

- Added Chinese translation for the "Hide Miliastra Wonderland" setting.
- Added UIGF v4.2 import.

### Changed

- "Hide miliastra wonderland" setting now takes effect during data fetch, skipping Miliastra
Wonderland gacha types (1000/2000) when enabled.
- Merged upstream updates from
[biuuu/genshin-wish-export](https://github.com/biuuu/genshin-wish-export).

## [0.12.5] - 2026-04-10
### Fixed

- Fix UIGF format bug.

## [0.12.4] - 2026-04-01
<p color="red">⚠️本次更新软件后第一次更新数据会自动执行“获取完整数据”⚠️</p>

### Changed

- Changed export format to UIGFv4.2.

## [0.12.3] - 2025-12-23

### Fixed
- Fixed up some UI bugs by @TheraNinjaCat in #1

### Added

- Added translations for the new Miliastra Wonderland additions by @TheraNinjaCat in #1

## [0.12.2] - 2025-12-23

### Fixed
- Resolved a layout issue on the homepage where pie charts would occasionally leave empty gaps instead of following a continuous sequence.

### Changed

- Updated the display of URL links on the settings page for better clarity.

## [0.12.1] - 2025-10-31

### Fixed

- Fixed version number error.

### Changed

- Changed update service URL.

## [0.12.0] - 2025-10-31

### Added

- Added adaptation for Simplified Chinese Miliastra Wonderland ([biuuu/genshin-wish-export#292](https://github.com/biuuu/genshin-wish-export/issues/292)).


[unreleased]: https://github.com/Trrrrw/genshin-wish-export/compare/v0.12.8...HEAD
[0.12.8]: https://github.com/Trrrrw/genshin-wish-export/compare/v0.12.7...v0.12.8
[0.12.7]: https://github.com/Trrrrw/genshin-wish-export/compare/v0.12.6...v0.12.7
[0.12.6]: https://github.com/Trrrrw/genshin-wish-export/compare/v0.12.5...v0.12.6
[0.12.5]: https://github.com/Trrrrw/genshin-wish-export/compare/v0.12.4...v0.12.5
[0.12.4]: https://github.com/Trrrrw/genshin-wish-export/compare/v0.12.3...v0.12.4
[0.12.3]: https://github.com/Trrrrw/genshin-wish-export/compare/v0.12.2...v0.12.3
[0.12.2]: https://github.com/Trrrrw/genshin-wish-export/compare/v0.12.1...v0.12.2
[0.12.1]: https://github.com/Trrrrw/genshin-wish-export/compare/v0.12.0...v0.12.1
[0.12.0]: https://github.com/Trrrrw/genshin-wish-export/releases/tag/v0.12.0
