// Dynamic config: one codebase, two shippable apps.
//   APP_VARIANT=staff  -> "Karavan Staff", com.atlaslakes.myapp   (existing TestFlight app 6801203768)
//   APP_VARIANT=buyer  -> "Karavan Portal", com.atlaslakes.buyer  (new TestFlight app)
// The variant is set per EAS build profile in eas.json, and via the npm scripts for local dev.

const VARIANT = process.env.APP_VARIANT === 'buyer' ? 'buyer' : 'staff';

const VARIANTS = {
  staff: {
    name: 'Karavan Staff',
    bundleIdentifier: 'com.atlaslakes.myapp',
    androidPackage: 'com.atlaslakes.myapp',
    portalUrl: 'https://karavanimports.com/staff',
  },
  buyer: {
    name: 'Karavan Portal',
    bundleIdentifier: 'com.atlaslakes.buyer',
    androidPackage: 'com.atlaslakes.buyer',
    portalUrl: 'https://karavanimports.com',
  },
};

const v = VARIANTS[VARIANT];

export default ({ config }) => ({
  ...config,
  name: v.name,
  ios: {
    ...config.ios,
    bundleIdentifier: v.bundleIdentifier,
  },
  android: {
    ...config.android,
    package: v.androidPackage,
  },
  extra: {
    ...config.extra,
    variant: VARIANT,
    portalUrl: v.portalUrl,
  },
});
