# Aegis-LK Mobile & Web Client (Flutter)

Cross-platform client application for **Aegis-LK** (Intelligent Disaster Prediction, Response and Recovery Platform for Sri Lanka), supporting both Web and Mobile (Android / iOS).

---

## 📋 Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Directory Structure](#directory-structure)
- [Getting Started & Running Locally](#getting-started--running-locally)
- [Design System & Theming (`AegisTheme`)](#design-system--theming-aegistheme)
- [Authentication & Role-Based Access Control](#authentication--role-based-access-control)
- [Navigation & Routing (`MainShell` & `AppRouter`)](#navigation--routing-mainshell--approuter)
- [Team Member Guide: How to Build Your Module](#team-member-guide-how-to-build-your-module)
  - [Member 2 — Incident & Rescue Operations](#member-2--incident--rescue-operations)
  - [Member 3 — Resource & Logistics](#member-3--resource--logistics)
  - [Member 4 — Recovery & Community Support](#member-4--recovery--community-support)
- [API Client & Network Gotchas (Web vs. Android Emulator)](#api-client--network-gotchas-web-vs-android-emulator)
- [Git Hygiene & Ignored Build Files](#git-hygiene--ignored-build-files)

---

## 🏗 Overview & Architecture

The Flutter client mirrors the web application's modern dark theme, features, and role-based workflows:

- **State Management:** `provider` (`ChangeNotifierProvider` for global auth and scoped state).
- **Typography:** `google_fonts` (Inter font family matching the React UI).
- **Networking:** `http` with JWT Bearer token injection.
- **Persistence:** `shared_preferences` for preserving JWT tokens and user session across app restarts.
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

The app uses `AuthProvider` (`lib/shared/auth/auth_provider.dart`) to store user information and JWT tokens.

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

## 👥 Team Member Guide: How to Build Your Module

### Member 2 — Incident & Rescue Operations
**Folder:** `lib/features/incident/`
- **What to build:**
  - `screens/report_incident_screen.dart`: Citizen reporting form with:
    - Camera/Image upload (use `image_picker` package).
    - GPS geolocation lookup (use `geolocator` package) with latitude/longitude display.
    - Hazard type selector (Flood, Landslide, Fire, Structural Damage) and description input.
  - `screens/sos_emergency_screen.dart`: Prominent 1-tap SOS emergency trigger for citizens in danger.
  - `screens/incident_list_screen.dart`: Active incidents list with status filter (`Reported`, `Assessed`, `Dispatched`, `Resolved`).
  - `screens/incident_assessment_screen.dart`: Disaster officer view to review AI assessment (`severityAssessed`, `teamsRequired`), approve response, and dispatch rescue teams.
- **Backend API:** Connect to `http://localhost:5012/api/incidents`.

---

### Member 3 — Resource & Logistics
**Folder:** `lib/features/resource/`
- **What to build:**
  - `screens/warehouse_inventory_screen.dart`: List of warehouses across Sri Lanka with current stock levels (Rations, Clean Water, Medical Kits, Inflatable Boats, Blankets).
  - `screens/dispatch_plan_screen.dart`: Officer review screen for dispatch plans generated by the Resource Allocation Agent (`POST /api/resource/dispatch-requests`).
  - `screens/vehicle_fleet_screen.dart`: Status of response vehicles (4x4 Trucks, Ambulances, Helicopters, Boats) with status badges (`Available`, `EnRoute`, `Maintenance`).
  - `screens/delivery_qr_screen.dart`: Delivery verification screen using QR codes or confirmation codes when supplies arrive at mission locations.
- **Backend API:** Connect to `http://localhost:5012/api/resource`.

---

### Member 4 — Recovery & Community Support
**Folder:** `lib/features/recovery/`
- **Scaffolded screens already present in `lib/features/recovery/screens/`:**
  - `shelter_finder_screen.dart`: Nearby shelters, capacity counters, and status indicators.
  - `aid_request_screen.dart`: Citizen aid request submission (food, medicine, shelter, clothes).
  - `my_aid_requests_screen.dart`: Citizen tracking for submitted aid requests.
  - `donate_screen.dart`: Public donation portal for disaster relief funds and supplies.
  - `citizen_damage_report_screen.dart`: Citizen damage assessment submission.
  - `recovery_plan_status_screen.dart`: Post-disaster recovery plan progress dashboard.
- **Upcoming tasks:**
  - Connect the screens to real `http://localhost:5012/api/recovery` endpoints.
  - Add human-in-the-loop approval actions for Recovery Officers.

---

## 🌐 API Client & Network Gotchas (Web vs. Android Emulator)

When making HTTP requests from Flutter, the base URL depends on the target platform:

| Platform | Host URL | Explanation |
|---|---|---|
| **Chrome (Web)** | `http://localhost:5012` | Runs in browser on the same host machine. |
| **Android Emulator** | `http://10.0.2.2:5012` | Android emulator loopback alias pointing to your PC host. |
| **Physical Android/iOS Device** | `http://192.168.x.x:5012` | Use your development machine's local Wi-Fi IP address. |

**Recommended helper pattern in services:**
```dart
import 'package:flutter/foundation.dart';

String getBaseUrl(String module) {
  if (kIsWeb) {
    return 'http://localhost:5012/api/$module';
  } else {
    // For Android Emulator (use 10.0.2.2)
    return 'http://10.0.2.2:5012/api/$module';
  }
}
```

---

## 🛡 Git Hygiene & Ignored Build Files

To prevent git pollution from Flutter build artifacts, ensure your `.gitignore` contains:
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
```
Never commit the `build/` directory or ephemeral IDE files. Always run `git status` before committing to ensure you are only committing source files in `lib/`.
