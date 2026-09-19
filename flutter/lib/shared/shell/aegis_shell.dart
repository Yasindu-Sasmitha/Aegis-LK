import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../auth/auth_provider.dart';
import '../auth/login_screen.dart';
import '../theme/aegis_theme.dart';
import 'main_shell.dart';

/// Root shell widget that checks authentication state.
/// Displays a loading indicator while checking saved session,
/// shows [LoginScreen] if unauthenticated, or [MainShell] if authenticated.
class AegisShell extends StatelessWidget {
  const AegisShell({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    if (auth.isLoading) {
      return const Scaffold(
        backgroundColor: kNavBg,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: kAccent),
              SizedBox(height: 16),
              Text(
                'Connecting to Aegis-LK...',
                style: TextStyle(color: Colors.white70, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    if (!auth.isAuthenticated) {
      return const LoginScreen();
    }

    return const MainShell();
  }
}
