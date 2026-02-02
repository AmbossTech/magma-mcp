# Publishing Guide

This document describes how to publish new versions of `@ambosstech/magma-mcp` to npm.

## Prerequisites

1. **npm account**: You need an npm account that's part of the `@ambosstech` organization
2. **npm authentication**: Login to npm on your machine
   ```bash
   npm login
   ```
3. **Git repository**: Ensure your local repository is clean and up to date
   ```bash
   git status
   git pull origin main
   ```

## Publishing Process

### 1. Update Version

Use npm's version command to bump the version. This will:
- Update `package.json`
- Create a git commit
- Create a git tag

Choose the appropriate version bump:

**Patch release** (bug fixes, minor changes):
```bash
npm version patch
```

**Minor release** (new features, backward compatible):
```bash
npm version minor
```

**Major release** (breaking changes):
```bash
npm version major
```

### 2. Review Changes

Before publishing, verify:
- All tests pass: `npm test`
- Type checking passes: `npm run typecheck`
- Build succeeds: `npm run build`
- CHANGELOG.md is updated

The `prepublishOnly` script will automatically run these checks:
```json
"prepublishOnly": "npm run typecheck && npm test && npm run build"
```

### 3. Publish to npm

Publish the package:
```bash
npm publish
```

This will:
1. Run `prepublishOnly` (typecheck + test + build)
2. Pack the package (only files listed in `files` field)
3. Upload to npm registry

The package is configured with:
```json
"publishConfig": {
  "access": "public"
}
```

### 4. Push to Git

Push the version commit and tags:
```bash
git push origin main
git push origin --tags
```

Or use the automated postversion script (already configured):
```json
"postversion": "git push && git push --tags"
```

## Release Checklist

- [ ] All tests passing (`npm test`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated with new version
- [ ] README.md updated if needed
- [ ] Git repository is clean
- [ ] Logged into npm (`npm whoami`)
- [ ] Version bumped (`npm version [patch|minor|major]`)
- [ ] Published to npm (`npm publish`)
- [ ] Changes pushed to GitHub (`git push && git push --tags`)
- [ ] GitHub release created (optional)

## Quick Publishing Workflow

For a typical patch release:

```bash
# 1. Ensure everything is ready
npm run typecheck
npm test
npm run build

# 2. Update CHANGELOG.md manually

# 3. Bump version and publish
npm version patch  # Creates commit and tag
npm publish        # Publishes to npm (runs prepublishOnly)
git push && git push --tags  # Or rely on postversion script

# 4. Verify on npm
npm view @ambosstech/magma-mcp
```

## Troubleshooting

### Error: "You do not have permission to publish"

You need to be added to the `@ambosstech` organization on npm:
```bash
npm owner add YOUR_USERNAME @ambosstech/magma-mcp
```

### Error: "This package has been marked as private"

Remove `"private": true` from package.json, or check publishConfig.

### Version already exists

You tried to publish a version that's already on npm:
```bash
npm version patch  # Bump to a new version
npm publish
```

### Prepublish checks failing

Fix the issues before publishing:
- Tests failing: Fix test issues
- Type errors: Fix TypeScript errors
- Build errors: Fix build configuration

## Testing Before Publishing

### Test local installation

Build and pack the package locally:
```bash
npm run build
npm pack
```

This creates a `.tgz` file. Test installing it:
```bash
npm install -g ./ambosstech-magma-mcp-1.0.0.tgz
```

### Test with npx

After publishing, verify it works:
```bash
npx @ambosstech/magma-mcp
```

## Version Strategy

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
  - API changes that break backward compatibility
  - Removed features
  - Changed behavior that affects existing users

- **MINOR** (1.0.0 → 1.1.0): New features
  - New tools or capabilities
  - New optional parameters
  - Enhanced functionality (backward compatible)

- **PATCH** (1.0.0 → 1.0.1): Bug fixes
  - Bug fixes
  - Documentation updates
  - Performance improvements
  - Internal refactoring

## Release Notes

When creating a new release, include:
1. Version number
2. Release date
3. Summary of changes
4. Link to CHANGELOG
5. Breaking changes (if any)
6. Migration guide (for major versions)

## Monitoring

After publishing:
1. Check npm package page: https://www.npmjs.com/package/@ambosstech/magma-mcp
2. Verify installation: `npm install -g @ambosstech/magma-mcp`
3. Test with Claude Desktop using npx
4. Monitor for issues on GitHub

## Rollback

If you need to deprecate or unpublish:

**Deprecate a version** (recommended):
```bash
npm deprecate @ambosstech/magma-mcp@1.0.0 "This version has a critical bug, use 1.0.1 instead"
```

**Unpublish** (only within 72 hours, not recommended):
```bash
npm unpublish @ambosstech/magma-mcp@1.0.0
```

Note: Unpublishing is discouraged and only works within 72 hours of publishing.
