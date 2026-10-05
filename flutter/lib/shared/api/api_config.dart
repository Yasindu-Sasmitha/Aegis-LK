/// Centralized API configuration for Aegis-LK Flutter application.
///
/// LOCAL DEVELOPMENT (default):
///   The app connects to the local ASP.NET Core backend.
///
/// PRODUCTION DEPLOYMENT:
///   Pass the deployed API URL at build time using --dart-define:
///
///     flutter build apk \
///       --dart-define=API_BASE_URL=https://aegis-lk.onrender.com
///
///     flutter run \
///       --dart-define=API_BASE_URL=https://aegis-lk.onrender.com
///
/// All feature services (auth, weather, incident, resource, recovery)
/// must use [ApiConfig.baseUrl] as their root — never hard-code localhost.
library;

class ApiConfig {
  ApiConfig._();

  /// Root URL of the ASP.NET Core backend.
  /// Defaults to the local dev server; override via --dart-define at build time.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:5012',
  );

  // ── Convenience sub-paths ─────────────────────────────────────────────────
  static const String authBase = '$baseUrl/api/auth';
  static const String weatherBase = '$baseUrl/api/weather';
  static const String incidentBase = '$baseUrl/api/incidents';
  static const String resourceBase = '$baseUrl/api/resource';
  static const String recoveryBase = '$baseUrl/api/recovery';
}
