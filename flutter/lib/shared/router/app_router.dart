import 'package:flutter/material.dart';
import '../shell/aegis_shell.dart';
import '../shell/main_shell.dart';
import '../auth/login_screen.dart';
import '../auth/register_screen.dart';

class AppRouter {
  static const String initialRoute = '/';
  static const String login = '/login';
  static const String register = '/register';
  static const String home = '/home';
  static const String weatherHome = '/weather';
  static const String weatherAlerts = '/weather/alerts';
  static const String alertReviewQueue = '/weather/review-queue';
  static const String recoveryHome = '/recovery';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case initialRoute:
        return MaterialPageRoute(builder: (_) => const AegisShell());
      case login:
        return MaterialPageRoute(builder: (_) => const LoginScreen());
      case register:
        return MaterialPageRoute(builder: (_) => const RegisterScreen());
      case home:
        return MaterialPageRoute(
          builder: (_) => const MainShell(initialPrimaryIndex: 0),
        );
      case weatherHome:
        return MaterialPageRoute(
          builder: (_) => const MainShell(initialPrimaryIndex: 1, initialSubIndex: 0),
        );
      case weatherAlerts:
        return MaterialPageRoute(
          builder: (_) => const MainShell(initialPrimaryIndex: 1, initialSubIndex: 1),
        );
      case alertReviewQueue:
        return MaterialPageRoute(
          builder: (_) => const MainShell(initialPrimaryIndex: 1, initialSubIndex: 2),
        );
      case recoveryHome:
        return MaterialPageRoute(
          builder: (_) => const MainShell(initialPrimaryIndex: 2, initialSubIndex: 0),
        );
      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(child: Text('No route defined for ${settings.name}')),
          ),
        );
    }
  }
}
