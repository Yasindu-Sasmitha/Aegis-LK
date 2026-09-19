import 'package:flutter/foundation.dart';
import 'auth_models.dart';
import 'auth_service.dart';

/// ChangeNotifier-based auth state, mirrors React's AuthContext.
class AuthProvider extends ChangeNotifier {
  final AuthService _service = AuthService();

  AuthUser? _user;
  bool _isLoading = true;

  AuthUser? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;
  bool get isOfficerOrAdmin =>
      _user?.role == 'DisasterOfficer' || _user?.role == 'Admin';

  AuthProvider() {
    _tryRestoreSession();
  }

  Future<void> _tryRestoreSession() async {
    try {
      final u = await _service.fetchCurrentUser();
      _user = u;
    } catch (_) {
      _user = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    final res = await _service.login(email: email, password: password);
    _user = res.user;
    notifyListeners();
  }

  Future<void> register({
    required String fullName,
    required String email,
    required String password,
    String? district,
    String? phoneNumber,
  }) async {
    final res = await _service.register(
      fullName: fullName,
      email: email,
      password: password,
      district: district,
      phoneNumber: phoneNumber,
    );
    _user = res.user;
    notifyListeners();
  }

  Future<void> logout() async {
    await _service.logout();
    _user = null;
    notifyListeners();
  }
}
