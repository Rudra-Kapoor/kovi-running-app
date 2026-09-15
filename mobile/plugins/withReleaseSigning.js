const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Expo config plugin: when ANDROID_KEYSTORE_PATH is set at build time, sign release builds with
 * that keystore (base64-decoded by CI from the ANDROID_KEYSTORE_BASE64 secret). Otherwise the
 * Expo template's debug keystore is used, which is deterministic and fine for test distribution.
 */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!process.env.ANDROID_KEYSTORE_PATH) return cfg;
    let gradle = cfg.modResults.contents;
    const signing = `
    signingConfigs {
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }`;
    gradle = gradle.replace(/signingConfigs \{/, signing.trim());
    gradle = gradle.replace(
      /release \{\s*\n(\s*)\/\/ Caution! In production, you need to generate your own keystore file\.[\s\S]*?signingConfig signingConfigs\.debug/,
      (m, indent) => m.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release'),
    );
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
