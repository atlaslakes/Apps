# Atlas Lakes Apps

Monorepo of Atlas Lakes mobile apps. Each app lives in its own folder with its own
`package.json`, `node_modules`, `eas.json`, and `.gitignore` — installed and built
independently (no npm workspaces).

## Apps

### `karavan imports apps/`
Single Expo project that ships as **two variants** via `APP_VARIANT` (see `app.config.js`):

| Variant | Name | Bundle ID | ASC Apple ID | Portal URL |
|---|---|---|---|---|
| `staff` | Karavan Staff | `com.atlaslakes.myapp` | 6801203768 | `karavanimports.com/staff` |
| `buyer` | Karavan Portal | `com.atlaslakes.buyer` | 6809906648 | `karavanimports.com` |

```bash
cd "karavan imports apps"
npm install
npm run start:staff        # or start:buyer
npm run build:staff        # eas build --platform ios --profile staff
npm run submit:staff       # eas submit --platform ios --profile staff
```

`build/karavan-portal/` holds the committed static web export of the portal variant.

### `busy-boys-apps/`
Separate Expo project (`com.atlaslakes.busyboys`). Wraps `busyboys.com` in a native WebView.

```bash
cd busy-boys-apps
npm install
npm start
```

### `eat-mashawi-apps/`
Separate Expo project (`com.atlaslakes.eatmashawi`), test app wrapping `eatmashawi.com` in a native WebView.

```bash
cd eat-mashawi-apps
npm install
npm start
```

### `pangea-market-apps/`
Separate Expo project (`com.atlaslakes.pangeamarket`), test app wrapping `pangeamarket.com` in a native WebView.

```bash
cd pangea-market-apps
npm install
npm start
```

> Note: app folder names must not contain spaces — EAS's remote iOS build path breaks on a
> space in the project folder name (see `busy-boys-apps` git history for the fix). `karavan
> imports apps/` still has a space and hasn't been rebuilt since the folder restructure; rename
> it the same way before its next iOS build.

## Deployment

See [DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md) for the full App Store / Play Store process.
