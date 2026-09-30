# Publishing `@zetasdk/sdk`

**Final npm name:** `@zetasdk/sdk` (org **`zetasdk`** on npm). Do not rename.

Package root: `packages/sdk`. Published tarball includes `dist/` and `README.md` only.

## Prerequisites

- Granular access token scoped to org **`zetasdk`**, **Read and write** (publish), **Bypass 2FA** enabled.
- Configure only that token (after `npm logout`):

  ```powershell
  npm config set //registry.npmjs.org/:_authToken=YOUR_TOKEN
  ```

## Release checklist

```powershell
cd packages\sdk
npm ci
npm run typecheck
npm test
npm publish --access public
```

`prepack` runs `npm run build` automatically.

## Verify

```powershell
npm view @zetasdk/sdk version
```

Smoke install:

```powershell
mkdir $env:TEMP\zeta-sdk-smoke
cd $env:TEMP\zeta-sdk-smoke
npm init -y
npm install @zetasdk/sdk @solana/web3.js
```

## Version bumps

Edit `version` in `packages/sdk/package.json`, rerun tests, then `npm publish --access public`.

Monorepo dashboard uses `"@zetasdk/sdk": "file:../sdk"` for local dev.
