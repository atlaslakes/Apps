// Dynamic config: one codebase, two shippable apps.
//   APP_VARIANT=staff  -> "Karavan Staff", iOS com.atlaslakes.myapp (existing TestFlight app 6801203768),
//                         Android com.atlaslakes.staff
//   APP_VARIANT=buyer  -> "Karavan Portal", com.atlaslakes.buyer  (new TestFlight app)
// The variant is set per EAS build profile in eas.json, and via the npm scripts for local dev.

const VARIANT = process.env.APP_VARIANT === 'buyer' ? 'buyer' : 'staff';

const VARIANTS = {
  staff: {
    name: 'Karavan Staff',
    bundleIdentifier: 'com.atlaslakes.myapp',
    androidPackage: 'com.atlaslakes.staff',
    portalUrl: 'https://karavanimports.com/staff',
    // Brown (terracotta) logo is the staff brand.
    icon: './assets/images/karavan-icon.png',
    adaptiveIcon: './assets/images/karavan-icon.png',
    splashBackground: '#A43C21',
  },
  buyer: {
    name: 'Karavan Portal',
    bundleIdentifier: 'com.atlaslakes.buyer',
    androidPackage: 'com.atlaslakes.buyer',
    portalUrl: 'https://karavanimports.com',
    // Signed-in users open straight onto their dashboard on launch.
    signedInPath: '/dashboard',
    // White logo is the customer-facing brand.
    icon: './assets/images/karavan-portal-logo.png',
    adaptiveIcon: './assets/images/karavan-portal-adaptive.png',
    splashBackground: '#FFFFFF',
  },
};

const v = VARIANTS[VARIANT];

// Swap the splash plugin's logo/colour for the variant (app.json holds the
// staff defaults).
const withVariantSplash = (plugins = []) =>
  plugins.map((plugin) =>
    Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
      ? [plugin[0], { ...plugin[1], backgroundColor: v.splashBackground, image: v.icon }]
      : plugin
  );

export default ({ config }) => ({
  ...config,
  name: v.name,
  icon: v.icon,
  plugins: withVariantSplash(config.plugins),
  web: {
    ...config.web,
    favicon: v.icon,
  },
  ios: {
    ...config.ios,
    icon: v.icon,
    bundleIdentifier: v.bundleIdentifier,
    infoPlist: {
      ...config.ios?.infoPlist,
      // Expo derives CFBundleName from the shared slug ("atlas-lakes-apps") by
      // default, which shows up wrong in TestFlight instead of the real
      // per-variant name — override it explicitly per variant.
      CFBundleName: v.name,
    },
  },
  android: {
    ...config.android,
    package: v.androidPackage,
    adaptiveIcon: {
      ...config.android?.adaptiveIcon,
      backgroundColor: '#FFFFFF',
      foregroundImage: v.adaptiveIcon,
    },
  },
  extra: {
    ...config.extra,
    variant: VARIANT,
    splashBackground: v.splashBackground,
    portalUrl: v.portalUrl,
    signedInPath: v.signedInPath,
  },
});
