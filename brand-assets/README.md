# Brand assets

Source images kept out of `packages/dashboard/public/` so they are not shipped
in the deployed bundle. Nothing in the app references them — they are logo
variants and X/Twitter header art for use off-site.

Moving these cut the deploy payload from 24 MB to ~12 MB.

If you need one on the site again, move it back into
`packages/dashboard/public/` and reference it from `src/`.
