import 'package:flutter/material.dart';
import '../../features/weather/screens/weather_home_screen.dart';
import '../../features/weather/screens/alerts_screen.dart';
import '../../features/recovery/screens/recovery_home_screen.dart';
import '../auth/login_screen.dart';
import '../auth/register_screen.dart';

class AppRouter {
  static const String initialRoute = '/';
  static const String login = '/login';
  static const String register = '/register';
  static const String weatherHome = '/weather';
  static const String weatherAlerts = '/weather/alerts';
  static const String recoveryHome = '/recovery';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case login:
        return MaterialPageRoute(builder: (_) => const LoginScreen());
      case register:
        return MaterialPageRoute(builder: (_) => const RegisterScreen());
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
