import 'package:flutter/material.dart';
import '../../features/weather/screens/weather_home_screen.dart';
import '../../features/weather/screens/alerts_screen.dart';
import '../../features/recovery/screens/recovery_home_screen.dart';

class AppRouter {
  static const String initialRoute = '/';
  static const String weatherHome = '/weather';
  static const String weatherAlerts = '/weather/alerts';
  static const String recoveryHome = '/recovery';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case initialRoute:
      case weatherHome:
        return MaterialPageRoute(builder: (_) => const WeatherHomeScreen());
      case weatherAlerts:
        return MaterialPageRoute(builder: (_) => const WeatherAlertsScreen());
      case recoveryHome:
        return MaterialPageRoute(builder: (_) => const RecoveryHomeScreen());
      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(child: Text('No route defined for ${settings.name}')),
          ),
        );
    }
  }
}
