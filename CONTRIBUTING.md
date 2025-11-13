# Contributing to zk-mdl-kit

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository**
2. **Clone your fork:**
   ```bash
   git clone https://github.com/yourusername/zk-mdl-kit.git
   cd zk-mdl-kit
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running Locally

Start all services:

```bash
# Terminal 1 - Verifier
npm run start:verifier

# Terminal 2 - Issuer
npm run start:issuer

# Terminal 3 - Example
npm run start:example
```

### Making Changes

1. Make your changes in a feature branch
2. Test your changes thoroughly
3. Ensure code follows existing style
4. Update documentation if needed
5. Commit with clear messages

### Commit Messages

Use conventional commits format:

```
feat: add support for BBS+ signatures
fix: correct SessionTranscript building
docs: update API documentation
refactor: simplify issuer key management
test: add verifier integration tests
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

## Code Style

### JavaScript/Node.js

- Use ES modules (`import`/`export`)
- Use `const` by default, `let` when needed, never `var`
- Use async/await over callbacks
- Use descriptive variable names
- Add JSDoc comments for functions

Example:

```javascript
/**
 * Verify an mDL presentation
 * @param {string} jwe - JWE-encrypted VP token
 * @returns {Promise<{valid: boolean, predicates?: object}>}
 */
export async function verifyPresentation(jwe) {
  // Implementation
}
```

### HTML/CSS

- Use semantic HTML5 elements
- Mobile-first responsive design
- Use CSS custom properties for theming
- Prefer flexbox/grid over floats

## Testing

### Unit Tests (TODO)

```bash
npm test
```

### Integration Tests (TODO)

```bash
npm run test:integration
```

### Manual Testing

1. Start all services
2. Open `http://localhost:8080`
3. Test with actual wallet (Chrome 141+)
4. Verify all flows work end-to-end

## Documentation

Update documentation when:
- Adding new features
- Changing APIs
- Modifying configuration
- Fixing bugs that were unclear

Files to update:
- `README.md` - Overview and quick start
- `API.md` - API endpoints
- `SETUP.md` - Setup instructions
- `ARCHITECTURE.md` - System design
- `SECURITY.md` - Security practices

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure all tests pass**
4. **Update CHANGELOG.md** (if exists)
5. **Create pull request** with clear description

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Added unit tests
- [ ] Added integration tests

## Checklist
- [ ] Code follows project style
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Tests pass
```

## Feature Requests

Open an issue with:
- Clear description of the feature
- Use case / motivation
- Proposed implementation (optional)
- Examples (if applicable)

## Bug Reports

Open an issue with:
- **Description:** What happened?
- **Expected:** What should happen?
- **Steps to reproduce:**
  1. Step one
  2. Step two
  3. ...
- **Environment:**
  - OS: macOS 14.0
  - Node: 20.10.0
  - Browser: Chrome 141
- **Logs:** Include relevant error messages

## Architecture Guidelines

### Adding New Modules

When adding a new module:

1. Create directory: `module-name/`
2. Main file: `module-name/index.js` (exports)
3. Implementation files: `module-name/*.js`
4. Document in `ARCHITECTURE.md`

### Code Organization

```
zk-mdl-kit/
  verifier/          # Verifier service
    server.js        # Express server
    *.js             # Implementation files
    index.js         # Exports
  trust/             # Trust management
  issuer/            # Issuer service
  examples/          # Examples and demos
  docs/              # Documentation (optional)
```

### Dependencies

- **Prefer standard libraries** when possible
- **Minimize dependencies** to reduce attack surface
- **Update regularly** for security patches
- **Document why** for non-obvious dependencies

## Security

### Reporting Vulnerabilities

**Do not** open public issues for security vulnerabilities.

Email: security@example.com

Include:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Practices

- Never commit secrets or keys
- Use environment variables for config
- Validate all inputs
- Sanitize error messages
- Log securely (no PII)

## Standards Compliance

When implementing features, ensure compliance with:

- **ISO 18013-5:** mDL format
- **ISO 18013-7:** Device retrieval
- **OID4VP 1.0:** Presentation exchange
- **OID4VCI 1.0:** Credential issuance
- **SD-JWT VC:** Selective disclosure

Reference specifications in comments:

```javascript
// Per ISO 18013-5 Section 8.3.2.1.2.2
const sessionTranscript = [null, null, handover];
```

## Community

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Assume good intentions

### Communication

- **GitHub Issues:** Bug reports, feature requests
- **Pull Requests:** Code contributions
- **Discussions:** General questions, ideas

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Open a GitHub issue or discussion if you have questions about contributing.

Thank you for contributing to zk-mdl-kit! 🎉

