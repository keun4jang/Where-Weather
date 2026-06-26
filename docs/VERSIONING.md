# Versioning

Where Weather follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

The version lives in **one** source of truth: `package.json`. Everything else is
generated from it.

## Generated artifacts

- `src/generated/appVersion.ts` — `APP_VERSION` and `APP_VERSION_LABEL`, imported
  by the footer. **Do not edit by hand.**
- `public/version.json` — served at `/version.json` for runtime checks.

Regenerate with:

```bash
npm run version:sync
```

## Bumping

```bash
npm run version:bump          # patch (default)
npm run version:bump minor
npm run version:bump major
```

`version:bump` updates `package.json` and then runs `version:sync` automatically.

## Pre-commit hook

`.githooks/pre-commit` re-syncs the version and stages the generated files, then
runs typecheck + lint + test. Enable it once with:

```bash
npm run setup:hooks
```

## Changelog

Record user-facing changes in [`CHANGELOG.md`](../CHANGELOG.md) under the new
version before tagging a release.
