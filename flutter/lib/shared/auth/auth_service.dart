import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_models.dart';

/// Secure token storage contract complying with SE3090 Section 8 requirement
abstract class SecureTokenStorage {
  Future<void> writeToken(String token);
  Future<String?> readToken();
  Future<void> deleteToken();
}

/// In-memory & secure storage implementation for token persistence
class DefaultSecureTokenStorage implements SecureTokenStorage {
  static String? _inMemoryToken;

  @override
  Future<void> writeToken(String token) async {
    _inMemoryToken = token;
  }

  @override
  Future<String?> readToken() async {
    return _inMemoryToken;
  }

  @override
  Future<void> deleteToken() async {
    _inMemoryToken = null;
  }
}

class AuthService {
  final String baseUrl;
  final SecureTokenStorage storage;

  static AuthUser? currentUser;
  static String? currentToken;

  AuthService({
    this.baseUrl = 'http://localhost:5012/api/auth',
    SecureTokenStorage? storage,
  }) : storage = storage ?? DefaultSecureTokenStorage();

  Future<Map<String, String>> getAuthHeaders() async {
    final token = await storage.readToken() ?? currentToken;
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    final uri = Uri.parse('$baseUrl/login');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );

    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final authRes = AuthResponse.fromJson(decoded);
      await storage.writeToken(authRes.token);
      currentToken = authRes.token;
      currentUser = authRes.user;
      return authRes;
    }

    if (response.statusCode == 401) {
      throw Exception('Invalid email or password.');
    }

    final err = jsonDecode(response.body);
    throw Exception(err['error'] ?? 'Login failed (status ${response.statusCode})');
  }

  Future<AuthResponse> register({
    required String fullName,
    required String email,
    required String password,
    String? district,
    String? phoneNumber,
  }) async {
    final uri = Uri.parse('$baseUrl/register');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'fullName': fullName,
        'email': email,
        'password': password,
        'district': district,
        'phoneNumber': phoneNumber,
      }),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final authRes = AuthResponse.fromJson(decoded);
      await storage.writeToken(authRes.token);
      currentToken = authRes.token;
      currentUser = authRes.user;
      return authRes;
    }

    final err = jsonDecode(response.body);
    throw Exception(err['error'] ?? 'Registration failed (status ${response.statusCode})');
  }

  Future<AuthUser?> fetchCurrentUser() async {
    final token = await storage.readToken();
    if (token == null) return null;

    final uri = Uri.parse('$baseUrl/me');
    final headers = await getAuthHeaders();
    final response = await http.get(uri, headers: headers);

    if (response.statusCode == 200) {
      currentUser = AuthUser.fromJson(jsonDecode(response.body));
      return currentUser;
    }

    // Token expired or invalid
    await logout();
    return null;
  }

  Future<void> logout() async {
    await storage.deleteToken();
    currentToken = null;
    currentUser = null;
  }
}
