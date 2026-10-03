import 'dart:convert';
import 'package:http/http.dart' as http;

import '../models/resource_models.dart';
import '../../../shared/api/api_config.dart';
import '../../../shared/auth/auth_service.dart';

/// Typed client for the /api/resource/* endpoints.
///
/// Follows the exact same auth pattern as RecoveryService:
///   - owns an AuthService instance
///   - calls _authService.getAuthHeaders() on every request
///   - reads the JWT from secure storage internally
class ResourceService {
  final String baseUrl;
  final AuthService _authService;

  ResourceService({
    this.baseUrl = ApiConfig.resourceBase,
    AuthService? authService,
  }) : _authService = authService ?? AuthService();

  Future<Map<String, String>> _getAuthHeaders() async {
    return await _authService.getAuthHeaders();
  }

  // ── 1. Warehouses ───────────────────────────────────────────────────────────

  Future<ResourceListResponse<Warehouse>> fetchWarehouses({
    int page = 1,
    int pageSize = 50,
  }) async {
    final uri = Uri.parse('$baseUrl/warehouses/?page=$page&pageSize=$pageSize');
    final headers = await _getAuthHeaders();
    final response = await http.get(uri, headers: headers);

    if (response.statusCode == 200) {
      return ResourceListResponse.fromJson(
        jsonDecode(response.body) as Map<String, dynamic>,
        Warehouse.fromJson,
      );
    }
    throw _buildException(response);
  }

  // ── 2. Inventory ────────────────────────────────────────────────────────────

  Future<ResourceListResponse<InventoryItem>> fetchInventoryItems({
    String? warehouseId,
    int page = 1,
    int pageSize = 50,
  }) async {
    final qs = StringBuffer('?page=$page&pageSize=$pageSize');
    if (warehouseId != null && warehouseId.isNotEmpty) {
      qs.write('&warehouseId=$warehouseId');
    }
    final uri = Uri.parse('$baseUrl/inventory/$qs');
    final headers = await _getAuthHeaders();
    final response = await http.get(uri, headers: headers);

    if (response.statusCode == 200) {
      return ResourceListResponse.fromJson(
        jsonDecode(response.body) as Map<String, dynamic>,
        InventoryItem.fromJson,
      );
    }
    throw _buildException(response);
  }

  // ── 3. Dispatch ─────────────────────────────────────────────────────────────

  Future<List<DispatchPlan>> fetchDispatchPlans() async {
    final uri = Uri.parse('$baseUrl/dispatch/');
    final headers = await _getAuthHeaders();
    final response = await http.get(uri, headers: headers);

    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List data = decoded is List ? decoded : (decoded['items'] ?? []);
      return data
          .map((e) => DispatchPlan.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    throw _buildException(response);
  }

  Future<DispatchPlan> approveDispatchPlan(String id) async {
    final uri = Uri.parse('$baseUrl/dispatch/$id/approve');
    final headers = await _getAuthHeaders();
    final response = await http.post(uri, headers: headers);

    if (response.statusCode == 200) {
      return DispatchPlan.fromJson(
        jsonDecode(response.body) as Map<String, dynamic>,
      );
    }
    throw _buildException(response);
  }

  // ── 4. Helpers ──────────────────────────────────────────────────────────────

  Exception _buildException(http.Response res) {
    String message = 'Request failed (${res.statusCode})';
    try {
      final body = jsonDecode(res.body);
      if (body is Map && body['message'] != null) {
        message = body['message'].toString();
      } else if (body is Map && body['error'] != null) {
        message = body['error'].toString();
      }
    } catch (_) {
      // keep default message
    }

    if (res.statusCode == 401) {
      message = 'Session expired. Please log in again.';
    }
    return Exception(message);
  }
}