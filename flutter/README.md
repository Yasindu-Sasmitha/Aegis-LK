# Aegis-LK Mobile & Web Client (Flutter)

Cross-platform client application for **Aegis-LK** (Intelligent Disaster Prediction, Response and Recovery Platform for Sri Lanka), supporting both Web and Mobile (Android / iOS).

---

## 📋 Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Directory Structure](#directory-structure)
- [Getting Started & Running Locally](#getting-started--running-locally)
- [Production Deployment & Android Release APK](#production-deployment--android-release-apk)
- [Design System & Theming (`AegisTheme`)](#design-system--theming-aegistheme)
- [Authentication & Role-Based Access Control](#authentication--role-based-access-control)
- [Navigation & Routing (`MainShell` & `AppRouter`)](#navigation--routing-mainshell--approuter)
- [Team Member Guide: How to Build Your Module](#team-member-guide-how-to-build-your-module)
  - [Member 2 — Incident & Rescue Operations](#member-2--incident--rescue-operations)
  - [Member 3 — Resource & Logistics](#member-3--resource--logistics)
  - [Member 4 — Recovery & Community Support](#member-4--recovery--community-support)
- [API Client & Network Configuration](#api-client--network-configuration)
- [Git Hygiene & Ignored Build Files](#git-hygiene--ignored-build-files)

---

## 🏗 Overview & Architecture

The Flutter client mirrors the web application's modern dark theme, features, and role-based workflows:

- **State Management:** `provider` (`ChangeNotifierProvider` for global auth and scoped state).
- **Typography:** `google_fonts` (Inter font family matching the React UI).
- **Networking:** `http` with JWT Bearer token injection.
- **Persistence:** `flutter_secure_storage` for secure token storage (AES-256 via Android Keystore / iOS Keychain) and user session preservation across app restarts.
- **Theme:** Dark slate palette (`#0F172A` background, `#1E293B` cards, `#06B6D4` cyan & `#6366F1` indigo accents).

---

## 📁 Directory Structure

```
flutter/lib/
├── main.dart                          # App entrypoint & global ChangeNotifierProvider
├── shared/                            # Shared across all modules (edit with care)
│   ├── api/                           # API configuration & base HTTP helpers
│   ├── auth/                          # AuthProvider, AuthService, Login & Register screens
│   ├── router/                        # AppRouter (route names & route generator)
│   ├── shell/                         # MainShell (Top bar, navigation tabs, role badges)
│   ├── theme/                         # AegisTheme (colors, typography, card shapes)
│   └── widgets/                       # Reusable UI widgets (cards, badges, buttons)
└── features/                          # One folder per module / team member
    ├── home/                          # Aegis Homepage (Hero, hotlines, live alerts, district grid)
    ├── weather/                       # Member 1: Weather forecasts, alerts, prediction triggers
    ├── incident/                      # Member 2: Incident reporting, GPS/Camera capture, dispatch
    ├── resource/                      # Member 3: Warehouses, inventory, vehicle tracking
    └── recovery/                      # Member 4: Shelters, aid requests, donations, damage review
```

---

## 🚀 Getting Started & Running Locally

### 1. Prerequisites
- **Flutter SDK:** Flutter 3.19+ (`flutter doctor` should show no errors).
- **Chrome** (for web development) or an **Android Emulator / Device**.
- **Backend API Running:** Ensure `Aegis.Api` is running on `http://localhost:5012` (see main repo README).

### 2. Install Dependencies
```powershell
cd flutter
flutter pub get
```

### 3. Running on Chrome (Web)
```powershell
flutter run -d chrome
```
*Note:* In web mode, the app connects to the API at `http://localhost:5012`.

### 4. Running on Android Emulator
```powershell
flutter run -d emulator-5554
```
*Note:* In Android emulator mode, `localhost` refers to the emulator itself. Use `10.0.2.2:5012` to talk to your host machine's backend API (see [API Client & Network Gotchas](#api-client--network-gotchas-web-vs-android-emulator)).

### 5. Instant Demo Login
On the login screen (`/login`), click any **Quick Demo Login** button:
- **Disaster Officer:** `officer@aegis.lk` / `Aegis@123`
- **Citizen:** `citizen@aegis.lk` / `Aegis@123`
- **System Admin:** `admin@aegis.lk` / `Aegis@123`
- **Emergency Responder:** `responder@aegis.lk` / `Aegis@123`

---

## 🎨 Design System & Theming (`AegisTheme`)

All screens must follow the consistent `AegisTheme` design system in `lib/shared/theme/aegis_theme.dart`.

### Key Color Tokens
```dart
import 'package:aegis_lk/shared/theme/aegis_theme.dart';

kBgDark        // 0xFF0B0F19 - Main background
kSurface       // 0xFF111827 - Surface container background
kCardBg        // 0xFF1E293B - Card background
kBorder        // 0xFF334155 - Card & input borders
kPrimary       // 0xFF06B6D4 - Primary cyan accent
kIndigo        // 0xFF6366F1 - Secondary indigo accent
kStatusRed     // 0xFFEF4444 - High severity / danger / emergency
kStatusOrange  // 0xFFF97316 - Medium severity / warning
kStatusYellow  // 0xFFEAB308 - Advisory / alert
kStatusGreen   // 0xFF10B981 - Safe / approved / operational
```

### Standard Card Decoration
```dart
Container(
  decoration: BoxDecoration(
    color: kCardBg,
    borderRadius: BorderRadius.circular(12),
    border: Border.all(color: kBorder),
  ),
  padding: const EdgeInsets.all(16),
  child: ...
)
```

---

## 🔐 Authentication & Role-Based Access Control

The app uses `AuthProvider` (`lib/shared/auth/auth_provider.dart`) and `AuthService` (`lib/shared/auth/auth_service.dart`) to manage user authentication and session persistence.

- **Secure Token Storage:** JWT tokens are persisted securely using `flutter_secure_storage` (`DefaultSecureTokenStorage`), backed by the hardware-backed Android Keystore (AES-256) on Android and Keychain Services on iOS.
- **Session Restoration:** On app startup, `AuthProvider` automatically reads the persisted token from secure storage and restores the user profile via `/api/auth/me`.

### How to use `AuthProvider` in any widget:
```dart
import 'package:provider/provider.dart';
import 'package:aegis_lk/shared/auth/auth_provider.dart';

Widget build(BuildContext context) {
  final auth = Provider.of<AuthProvider>(context);
  final token = auth.token;          // JWT bearer token string
  final user = auth.user;            // User profile (email, role, name)
  final isOfficer = auth.isOfficerOrAdmin; // Check if officer/admin

  if (isOfficer) {
    // Show officer action buttons (Approve, Reject, Trigger)
  }
}
```

### Authenticated HTTP Request Example:
```dart
final response = await http.get(
  Uri.parse('$baseUrl/api/incident/active'),
  headers: {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  },
);
```

---

## 🧭 Navigation & Routing (`MainShell` & `AppRouter`)

The client uses `MainShell` (`lib/shared/shell/main_shell.dart`) which includes:
1. **Top Navbar:** Aegis-LK logo, Sri Lanka disaster indicator badge, User Profile badge with role color, and Sign Out button.
2. **Tab Switcher:** Home (`0`), Weather (`1`), Recovery (`2`), Incident (`3`), Resource (`4`).
3. **Sub-navigation Bars:** Per-module sub-navigation (e.g. Weather Forecast vs. Live Alerts vs. Alert Review Queue).

### Adding your feature to the App Shell:
1. Open `lib/shared/shell/main_shell.dart`.
2. Add your navigation button to `_buildTopNavbar` or module drawer.
3. In `_buildCurrentBody`, map your tab index to your feature's home screen.

---

## 📱 Implemented Feature Modules

### Member 1 — Weather Intelligence
**Folder:** `lib/features/weather/`
- `screens/weather_home_screen.dart`: 25-district overview with search, province chips, and landslide indicators.
- `screens/district_forecast_screen.dart`: Live 3-day forecast metrics, thresholds, and trigger button for AI hazard reasoning.
- `screens/alerts_screen.dart`: Active weather alerts list with status & hazard filters and officer approve/reject actions.
- `screens/prediction_history_screen.dart`: Historical predictions log with risk probabilities and confidence metrics.
- **Service & Models:** `services/weather_service.dart`, `models/weather_models.dart`.

### Member 2 — Incident & Rescue Operations
**Folder:** `lib/features/incident/`
- `screens/report_incident_screen.dart`: Citizen reporting form with GPS geolocation, camera/photo capture, and hazard category selection.
- `screens/my_reports_screen.dart`: Real-time status tracking for citizen-submitted incident reports.
- **Service & Models:** `services/incident_service.dart`, `models/incident_models.dart`.

### Member 3 — Resource & Logistics
**Folder:** `lib/features/resource/`
- `screens/warehouse_inventory_screen.dart`: Real-time inventory browser across Sri Lanka's 25 district warehouses.
- `screens/dispatch_plan_screen.dart`: Review, inspect, and approve AI-generated convoy dispatch allocations.
- `screens/delivery_qr_screen.dart`: Device-based QR verification feature for emergency supply deliveries at rescue sites (scans and verifies delivery codes locally on the device).
- **Service & Models:** `services/resource_service.dart`, `models/resource_models.dart`.

### Member 4 — Recovery & Community Support
**Folder:** `lib/features/recovery/`
- `screens/recovery_home_screen.dart`: Central recovery hub with navigation tiles and key recovery metrics.
- `screens/shelter_finder_screen.dart`: Real-time emergency shelter directory with live occupancy and capacity indicators.
- `screens/aid_request_screen.dart` & `my_aid_requests_screen.dart`: Emergency assistance application and status tracker.
- `screens/donate_screen.dart`: Public monetary and supply donation portal with shelter routing.
- `screens/compensation_claim_screen.dart`: Victim property and livelihood financial compensation claim submission.
- `screens/citizen_damage_report_screen.dart`: Citizen damage assessment submission.
- `screens/recovery_plan_status_screen.dart` & `recovery_reports_screen.dart`: Strategic recovery plans and audit reports viewer.
- **Service & Models:** `services/recovery_service.dart`, `models/recovery_models.dart`.


---

## 🌐 API Client & Network Configuration

All feature services in Aegis-LK use `ApiConfig.baseUrl` (defined in `lib/shared/api/api_config.dart`), which defaults to `http://localhost:5012` for local development.

For production deployment or emulator testing, the API base URL is supplied at compile or run time using `--dart-define=API_BASE_URL=...`.

### Base URLs by Target

| Target | Base URL | How to Run / Build |
|---|---|---|
| **Production API (Render)** | `https://aegis-lk.onrender.com` | `--dart-define=API_BASE_URL=https://aegis-lk.onrender.com` |
| **Chrome (Local Web)** | `http://localhost:5012` | `flutter run -d chrome` (default) |
| **Android Emulator (Local)** | `http://10.0.2.2:5012` | `flutter run -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:5012` |
| **Physical Device (Local LAN)** | `http://192.168.x.x:5012` | Use your host machine's Wi-Fi IP address |

---

## 📦 Production Deployment & Android Release APK

The deployed production backend URL for Aegis-LK is:
**`https://aegis-lk.onrender.com`**

### 1. Building the Production Release APK
Compile the release APK targeting the production backend:

```powershell
cd flutter
flutter build apk --release --dart-define=API_BASE_URL=https://aegis-lk.onrender.com
```

The compiled APK will be located at:
```
flutter/build/app/outputs/flutter-apk/app-release.apk
```

### 2. Running Release Build on Device / Emulator
To run the release configuration with the production backend directly:

```powershell
flutter run --release --dart-define=API_BASE_URL=https://aegis-lk.onrender.com
```

### 3. Release Signing Configuration
Release builds configure signing through `android/key.properties` (loaded in `android/app/build.gradle.kts`):
- `keyAlias`: Keystore key alias
- `keyPassword`: Password for the key
- `storeFile`: Path to keystore file (e.g. `../upload-keystore.jks`)
- `storePassword`: Password for the keystore

> ⚠️ **Security Requirement:** Keystores (`*.jks`, `*.keystore`) and `android/key.properties` contain secrets and are strictly ignored in `.gitignore`. They must never be checked into Git.

---

## 🛡 Git Hygiene & Ignored Build Files

To prevent git pollution from Flutter build artifacts and sensitive credentials, ensure your `.gitignore` contains:
```gitignore
# Flutter & Dart build artifacts
.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
.packages
build/
ephemeral/
.widget_preview/
ios/Flutter/Generated.xcconfig
android/.gradle/

# Android signing secrets & keys
android/key.properties
*.jks
*.keystore
```
Never commit the `build/` directory, signing keys, or `key.properties`. Always run `git status` before committing to ensure you are only committing source files in `lib/`.
