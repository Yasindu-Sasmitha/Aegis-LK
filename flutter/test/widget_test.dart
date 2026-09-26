// Basic smoke test for the Aegis LK Flutter app.
//
// flutter_secure_storage uses a platform channel that is not available on
// headless CI runners (Linux without a keyring). We register a no-op
// MethodChannel mock before pumping the widget so the test does not crash.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:aegis_lk/main.dart';

void main() {
  setUp(() {
    // Provide a no-op handler for every flutter_secure_storage platform call.
    // This prevents MissingPluginException on headless CI runners.
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
      (MethodCall call) async {
        if (call.method == 'read') return null;
        return null;
      },
    );
  });

  testWidgets('AegisApp basic smoke test', (WidgetTester tester) async {
    // Build the root widget and trigger the first frame.
    await tester.pumpWidget(const AegisApp());

    // Verify the MaterialApp mounts — the app tree is alive.
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
