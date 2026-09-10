import 'package:flutter/material.dart';
import '../models/weather_models.dart';
import '../services/weather_service.dart';

class WeatherAlertsScreen extends StatefulWidget {
  const WeatherAlertsScreen({Key? key}) : super(key: key);

  @override
  State<WeatherAlertsScreen> createState() => _WeatherAlertsScreenState();
}

class _WeatherAlertsScreenState extends State<WeatherAlertsScreen> {
  final WeatherService _weatherService = WeatherService();

  List<WeatherAlert> _alerts = [];
  bool _isLoading = true;
  String? _errorMessage;

  String _statusFilter = 'All'; // All, PendingReview, Published, Rejected
  String _hazardFilter = 'All'; // All, Flood, Strong Wind, Landslide
  bool _isProcessingAction = false;

  @override
  void initState() {
    super.initState();
    _loadAlerts();
  }

  Future<void> _loadAlerts() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final statusParam = _statusFilter == 'All' ? null : _statusFilter;
      final hazardParam = _hazardFilter == 'All' ? null : _hazardFilter;
      final data = await _weatherService.fetchAlerts(
        status: statusParam,
        hazardType: hazardParam,
        pageSize: 50,
      );
      setState(() {
        _alerts = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _reviewAlert(WeatherAlert alert, String decision) async {
    final noteController = TextEditingController();
    final shouldProceed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('$decision Alert?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Are you sure you want to set this ${alert.hazardType} alert for ${alert.districtName ?? "District"} to $decision?',
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: noteController,
              decoration: const InputDecoration(
                labelText: 'Officer Note / Reason (Optional)',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: decision == 'Approved' ? Colors.green[700] : Colors.red[700],
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(decision),
          ),
        ],
      ),
    );

    if (shouldProceed != true) return;

    setState(() => _isProcessingAction = true);

    try {
      final success = await _weatherService.reviewAlert(
        alertId: alert.id,
        decision: decision,
        reviewNotes: noteController.text.trim().isNotEmpty ? noteController.text.trim() : null,
      );
      if (success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Alert marked as $decision!'),
              backgroundColor: decision == 'Approved' ? Colors.green[700] : Colors.orange[800],
            ),
          );
        }
        await _loadAlerts();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to review alert: $e'),
            backgroundColor: Colors.red[700],
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessingAction = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Weather Alerts & Review'),
        backgroundColor: Colors.blue[800],
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadAlerts,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Colors.grey[100],
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      const Text('Status: ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(width: 4),
                      for (final st in ['All', 'PendingReview', 'Published', 'Rejected'])
                        Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ChoiceChip(
                            label: Text(st == 'PendingReview' ? 'Pending Review' : st),
                            selected: _statusFilter == st,
                            selectedColor: Colors.blue[700],
                            labelStyle: TextStyle(
                              color: _statusFilter == st ? Colors.white : Colors.black87,
                              fontSize: 12,
                            ),
                            onSelected: (selected) {
                              if (selected) {
                                setState(() => _statusFilter = st);
                                _loadAlerts();
                              }
                            },
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      const Text('Hazard: ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(width: 4),
                      for (final hz in ['All', 'Flood', 'Strong Wind', 'Landslide'])
                        Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ChoiceChip(
                            label: Text(hz),
                            selected: _hazardFilter == hz,
                            selectedColor: Colors.indigo[700],
                            labelStyle: TextStyle(
                              color: _hazardFilter == hz ? Colors.white : Colors.black87,
                              fontSize: 12,
                            ),
                            onSelected: (selected) {
                              if (selected) {
                                setState(() => _hazardFilter = hz);
                                _loadAlerts();
                              }
                            },
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Alerts List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.error_outline, size: 48, color: Colors.red),
                              const SizedBox(height: 12),
                              Text('Failed to load alerts', style: TextStyle(color: Colors.grey[800], fontWeight: FontWeight.bold)),
                              const SizedBox(height: 6),
                              Text(_errorMessage!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              const SizedBox(height: 16),
                              ElevatedButton(onPressed: _loadAlerts, child: const Text('Retry')),
                            ],
                          ),
                        ),
                      )
                    : _alerts.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.check_circle_outline, size: 48, color: Colors.green[400]),
                                const SizedBox(height: 12),
                                Text(
                                  'No alerts found matching current filters',
                                  style: TextStyle(color: Colors.grey[700], fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _loadAlerts,
                            child: ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: _alerts.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final alert = _alerts[index];
                                return _buildAlertCard(alert);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildAlertCard(WeatherAlert alert) {
    Color severityColor;
    switch (alert.severity.toLowerCase()) {
      case 'critical':
      case 'warning':
        severityColor = Colors.red[700]!;
        break;
      case 'advisory':
      case 'moderate':
        severityColor = Colors.orange[800]!;
        break;
      default:
        severityColor = Colors.blue[700]!;
        break;
    }

    Color statusBadgeColor;
    switch (alert.status) {
      case 'Published':
        statusBadgeColor = Colors.green[700]!;
        break;
      case 'PendingReview':
        statusBadgeColor = Colors.amber[800]!;
        break;
      case 'Rejected':
        statusBadgeColor = Colors.red[700]!;
        break;
      default:
        statusBadgeColor = Colors.grey[700]!;
        break;
    }

    final isPending = alert.status == 'PendingReview';

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isPending ? BorderSide(color: Colors.amber[600]!, width: 1.5) : BorderSide.none,
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top row: District + Status badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      alert.hazardType == 'Flood'
                          ? Icons.flood
                          : alert.hazardType == 'Strong Wind'
                              ? Icons.air
                              : Icons.landscape,
                      color: severityColor,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${alert.districtName ?? "Unknown District"} — ${alert.hazardType}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusBadgeColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    alert.status,
                    style: TextStyle(color: statusBadgeColor, fontWeight: FontWeight.bold, fontSize: 11),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Severity Chip
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: severityColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                'Severity: ${alert.severity}',
                style: TextStyle(color: severityColor, fontWeight: FontWeight.bold, fontSize: 11),
              ),
            ),
            const SizedBox(height: 8),

            // Message
            Text(
              alert.message,
              style: TextStyle(fontSize: 13, color: Colors.grey[800], height: 1.4),
            ),
            const SizedBox(height: 10),

            // Timestamp
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Created: ${alert.createdAt.length > 16 ? alert.createdAt.substring(0, 16).replaceAll('T', ' ') : alert.createdAt}',
                  style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                ),
                if (alert.publishedAt != null)
                  Text(
                    'Published: ${alert.publishedAt!.length > 16 ? alert.publishedAt!.substring(0, 16).replaceAll('T', ' ') : alert.publishedAt}',
                    style: TextStyle(fontSize: 11, color: Colors.green[700], fontWeight: FontWeight.bold),
                  ),
              ],
            ),

            // Officer Review Actions (if PendingReview)
            if (isPending) ...[
              const Divider(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red[700],
                      side: BorderSide(color: Colors.red[300]!),
                    ),
                    onPressed: _isProcessingAction ? null : () => _reviewAlert(alert, 'Rejected'),
                    icon: const Icon(Icons.close, size: 16),
                    label: const Text('Reject'),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green[700],
                      foregroundColor: Colors.white,
                    ),
                    onPressed: _isProcessingAction ? null : () => _reviewAlert(alert, 'Approved'),
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Approve & Publish'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
