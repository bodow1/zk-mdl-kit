# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Docker support with docker-compose.yml
- Dockerfiles for all services (verifier, issuer, example)
- GitHub Actions workflow for security checks
- Issue templates (bug report, feature request)
- Pull request template
- Security notice documentation
- Badges to README
- Docker scripts in package.json

### Changed
- Updated .gitignore to include key files
- Enhanced README with Docker instructions
- Updated QUICKSTART with Docker option
- Added warning banner about experimental status

### Security
- Removed accidentally committed .reader-keys.json
- Added CI checks to prevent committing secrets
- Enhanced security documentation

### Fixed
- Key files now properly ignored in .gitignore
- Keys regenerate automatically if missing

## [1.0.0] - 2024-11-19

### Added
- Initial release
- Verifier module (OID4VP endpoint + DC-API handover)
- Trust module (VICAL fetch/cache + issuer pinning)
- Issuer module (OID4VCI server for SD-JWT VC)
- Example web demo with modern UI
- Complete documentation (README, SETUP, API, ARCHITECTURE, SECURITY, CONTRIBUTING)
- Support for standard mDL and ZK proofs
- Longfellow integration (with mock fallback)
- ISO 18013-5/7 compliance
- OID4VP 1.0 and OID4VCI 1.0 compliance
- SD-JWT VC issuance with selective disclosure
- MIT License

[Unreleased]: https://github.com/yourusername/zk-mdl-kit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/zk-mdl-kit/releases/tag/v1.0.0

