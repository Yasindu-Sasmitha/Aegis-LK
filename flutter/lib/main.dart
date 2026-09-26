import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'shared/auth/auth_provider.dart';
import 'shared/router/app_router.dart';
import 'shared/theme/aegis_theme.dart';

void main() {
  runApp(const AegisApp());
}

class AegisApp extends StatelessWidget {
  const AegisApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: MaterialApp(
        title: 'Aegis-LK Disaster Management',
        debugShowCheckedModeBanner: false,
        theme: buildAegisTheme(),
        onGenerateRoute: AppRouter.generateRoute,
        initialRoute: AppRouter.initialRoute,
      ),
    );
  }
}
