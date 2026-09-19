import 'package:flutter/material.dart';
import '../../shared/theme/aegis_theme.dart';
import '../weather/models/weather_models.dart';
import '../weather/services/weather_service.dart';
import '../recovery/screens/citizen_damage_report_screen.dart';

class HomeScreen extends StatefulWidget {
  final Function(String section, {int? subIndex})? onNavigate;

  const HomeScreen({super.key, this.onNavigate});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final WeatherService _weatherService = WeatherService();
  List<WeatherAlert> _latestAlerts = [];
  bool _isLoadingAlerts = true;
  String? _alertsError;

  @override
  void initState() {
    super.initState();
    _loadLatestAlerts();
  }

  Future<void> _loadLatestAlerts() async {
    setState(() {
      _isLoadingAlerts = true;
      _alertsError = null;
    });

    try {
      // First try published alerts
      var alerts = await _weatherService.fetchAlerts(
        status: 'Published',
        pageSize: 5,
      );
      // Fallback: if no published alerts, fetch any alerts to display real status
      if (alerts.isEmpty) {
        alerts = await _weatherService.fetchAlerts(pageSize: 5);
      }
      if (mounted) {
        setState(() {
          _latestAlerts = alerts;
          _isLoadingAlerts = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _alertsError = 'Could not load live alerts';
          _isLoadingAlerts = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSurface,
      body: RefreshIndicator(
        onRefresh: _loadLatestAlerts,
        color: kAccent,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildHero(context),
              _buildLatestAlertsSection(context),
              _buildFeaturesGrid(context),
              _buildStatusBar(context),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHero(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF07162C), Color(0xFF0F2B48), Color(0xFF0C1F38)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: kAccent.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: kAccent.withValues(alpha: 0.4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: kAccent,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'SRI LANKA DISASTER MANAGEMENT',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: kAccent,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'AEGIS-LK',
            style: theme.textTheme.displayMedium?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'National Disaster Management & Early Warning System',
            style: theme.textTheme.titleMedium?.copyWith(
              color: const Color(0xFF93C5FD),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Real-time AI-powered disaster coordination across Sri Lanka. Monitoring 25 districts with automated multi-agent weather risk intelligence and emergency recovery aid.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: const Color(0xFFCBD5E1),
              height: 1.45,
            ),
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: kAccent,
                  foregroundColor: const Color(0xFF07162C),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  textStyle: const TextStyle(fontWeight: FontWeight.bold),
                ),
                icon: const Icon(Icons.cloud_outlined, size: 18),
                label: const Text('Weather & Alerts'),
                onPressed: () => widget.onNavigate?.call('weather'),
              ),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFF475569)),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  textStyle: const TextStyle(fontWeight: FontWeight.w600),
                ),
                icon: const Icon(Icons.handshake_outlined, size: 18),
                label: const Text('Request Aid'),
                onPressed: () => widget.onNavigate?.call('recovery', subIndex: 2),
              ),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFFCA5A5),
                  side: const BorderSide(color: Color(0xFF7F1D1D)),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  textStyle: const TextStyle(fontWeight: FontWeight.w600),
                ),
                icon: const Icon(Icons.report_problem_outlined, size: 18),
                label: const Text('Submit SitRep'),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const CitizenDamageReportScreen(),
                    ),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLatestAlertsSection(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Text('🔔', style: TextStyle(fontSize: 18)),
                  const SizedBox(width: 8),
                  const Text(
                    'Latest Alerts',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: kTextPrimary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFCA5A5)),
                    ),
                    child: const Text(
                      'LIVE',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFDC2626),
                      ),
                    ),
                  ),
                ],
              ),
              TextButton(
                style: TextButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  foregroundColor: const Color(0xFF0284C7),
                ),
                onPressed: () => widget.onNavigate?.call('weather_alerts'),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('View All', style: TextStyle(fontWeight: FontWeight.bold)),
                    SizedBox(width: 4),
                    Icon(Icons.arrow_forward, size: 14),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_isLoadingAlerts)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            )
          else if (_alertsError != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, size: 16, color: kTextMuted),
                  const SizedBox(width: 8),
                  Text(_alertsError!, style: const TextStyle(color: kTextMuted, fontSize: 13)),
                  const Spacer(),
                  TextButton(
                    onPressed: _loadLatestAlerts,
                    child: const Text('Retry', style: TextStyle(fontSize: 12)),
                  ),
                ],
              ),
            )
          else if (_latestAlerts.isEmpty)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.check_circle_outline, color: Color(0xFF10B981), size: 18),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'No active emergency alerts at this time. All districts operating within normal safety limits.',
                      style: TextStyle(color: kTextSecondary, fontSize: 13),
                    ),
                  ),
                ],
              ),
            )
          else
            Column(
              children: _latestAlerts.map((alert) => _buildAlertItem(alert)).toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildAlertItem(WeatherAlert alert) {
    Color badgeBg;
    Color badgeText;
    final sev = alert.severity.toLowerCase();
    if (sev.contains('warning') || sev.contains('danger') || sev.contains('high')) {
      badgeBg = const Color(0xFFFEE2E2);
      badgeText = const Color(0xFFDC2626);
    } else if (sev.contains('watch') || sev.contains('moderate')) {
      badgeBg = const Color(0xFFFEF3C7);
      badgeText = const Color(0xFFD97706);
    } else {
      badgeBg = const Color(0xFFE0F2FE);
      badgeText = const Color(0xFF0284C7);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: badgeBg,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              alert.severity.toUpperCase(),
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: badgeText,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      alert.districtName ?? alert.districtId,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: kTextPrimary,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '• ${alert.hazardType}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: kTextSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  alert.message,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: kTextSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeaturesGrid(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Core Operational Capabilities',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: kTextPrimary,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Unified tools for citizens, responders, and disaster officers.',
            style: TextStyle(fontSize: 13, color: kTextSecondary),
          ),
          const SizedBox(height: 16),
          LayoutBuilder(
            builder: (ctx, constraints) {
              final isWide = constraints.maxWidth > 600;
              final cards = [
                _buildCapabilityCard(
                  icon: Icons.thunderstorm_outlined,
                  iconColor: const Color(0xFF0284C7),
                  title: 'Weather Intelligence',
                  description:
                      'Autonomous multi-agent LangGraph risk evaluation across 25 Sri Lankan districts with automated 3-day forecasting.',
                  buttonLabel: 'District Forecasts',
                  onTap: () => widget.onNavigate?.call('weather'),
                ),
                _buildCapabilityCard(
                  icon: Icons.notifications_active_outlined,
                  iconColor: const Color(0xFFDC2626),
                  title: 'Early Warning Alerts',
                  description:
                      'Human-in-the-loop review queue for disaster officers, public alert broadcasting, and multi-channel safety warnings.',
                  buttonLabel: 'Alert Center',
                  onTap: () => widget.onNavigate?.call('weather_alerts'),
                ),
                _buildCapabilityCard(
                  icon: Icons.handshake_outlined,
                  iconColor: const Color(0xFF059669),
                  title: 'Recovery Aid Distribution',
                  description:
                      'Direct citizen assistance requests for food, medical support, financial aid, and shelter allocations.',
                  buttonLabel: 'Request Aid',
                  onTap: () => widget.onNavigate?.call('recovery', subIndex: 2),
                ),
                _buildCapabilityCard(
                  icon: Icons.night_shelter_outlined,
                  iconColor: const Color(0xFF7C3AED),
                  title: 'Safe Shelters & Evacuation',
                  description:
                      'Real-time shelter occupancy tracking, safe zone directions, and donation mobilization for displaced families.',
                  buttonLabel: 'Find Shelters',
                  onTap: () => widget.onNavigate?.call('recovery', subIndex: 1),
                ),
              ];

              if (isWide) {
                return GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 14,
                  childAspectRatio: 1.6,
                  children: cards,
                );
              } else {
                return Column(
                  children: cards.map((c) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: c,
                  )).toList(),
                );
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCapabilityCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String description,
    required String buttonLabel,
    required VoidCallback onTap,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: iconColor, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: kTextPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            description,
            style: const TextStyle(
              fontSize: 13,
              color: kTextSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              style: TextButton.styleFrom(
                visualDensity: VisualDensity.compact,
                foregroundColor: iconColor,
              ),
              onPressed: onTap,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(buttonLabel, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(width: 4),
                  const Icon(Icons.arrow_forward, size: 14),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBar(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF07162C),
        borderRadius: BorderRadius.circular(10),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _StatusMetric(
            icon: Icons.map_outlined,
            label: 'Districts',
            value: '25 / 25 Active',
          ),
          _StatusMetric(
            icon: Icons.check_circle_outline,
            label: 'System Status',
            value: 'Operational',
            valueColor: Color(0xFF34D399),
          ),
          _StatusMetric(
            icon: Icons.phone_in_talk_outlined,
            label: 'Emergency Hotline',
            value: '117',
            valueColor: Color(0xFFF87171),
          ),
        ],
      ),
    );
  }
}

class _StatusMetric extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color valueColor;

  const _StatusMetric({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: const Color(0xFF94A3B8)),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 10,
                color: Color(0xFF94A3B8),
                fontWeight: FontWeight.w500,
              ),
            ),
            Text(
              value,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: valueColor,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
