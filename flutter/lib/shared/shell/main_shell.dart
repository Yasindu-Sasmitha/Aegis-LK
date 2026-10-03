import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../auth/auth_provider.dart';
import '../theme/aegis_theme.dart';
import '../../features/home/home_screen.dart';
import '../../features/weather/screens/weather_home_screen.dart';
import '../../features/weather/screens/alerts_screen.dart';
import '../../features/weather/screens/prediction_history_screen.dart';
import '../../features/recovery/screens/recovery_home_screen.dart';
import '../../features/recovery/screens/shelter_finder_screen.dart';
import '../../features/recovery/screens/aid_request_screen.dart';
import '../../features/recovery/screens/my_aid_requests_screen.dart';
import '../../features/recovery/screens/donate_screen.dart';
import '../../features/recovery/screens/citizen_damage_report_screen.dart';
import '../../features/recovery/screens/recovery_plan_status_screen.dart';
import '../../features/recovery/screens/recovery_reports_screen.dart';
import '../../features/incident/screens/report_incident_screen.dart';
import '../../features/incident/screens/my_reports_screen.dart';
import '../../features/recovery/screens/compensation_claim_screen.dart';
import '../../features/resource/screens/warehouse_inventory_screen.dart';
import '../../features/resource/screens/dispatch_plan_screen.dart';
import '../../features/resource/screens/delivery_qr_screen.dart';

class MainShell extends StatefulWidget {
  final int initialPrimaryIndex;
  final int initialSubIndex;

  const MainShell({
    super.key,
    this.initialPrimaryIndex = 0,
    this.initialSubIndex = 0,
  });

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  late int _primaryIndex;
  int _weatherSubIndex = 0;
  int _recoverySubIndex = 0;
  int _incidentSubIndex = 0;
  int _resourceSubIndex = 0;

  @override
  void initState() {
    super.initState();
    _primaryIndex = widget.initialPrimaryIndex;
    if (_primaryIndex == 1) {
      _weatherSubIndex = widget.initialSubIndex;
    } else if (_primaryIndex == 2) {
      _recoverySubIndex = widget.initialSubIndex;
    } else if (_primaryIndex == 3) {
      _resourceSubIndex = widget.initialSubIndex;
    } else if (_primaryIndex == 4) {
      _incidentSubIndex = widget.initialSubIndex;
    }
  }

  void _navigateTo(String section, {int? subIndex}) {
    setState(() {
      if (section == 'home') {
        _primaryIndex = 0;
      } else if (section == 'weather') {
        _primaryIndex = 1;
        _weatherSubIndex = subIndex ?? 0;
      } else if (section == 'weather_alerts') {
        _primaryIndex = 1;
        _weatherSubIndex = subIndex ?? 1;
      } else if (section == 'weather_predictions') {
        _primaryIndex = 1;
        _weatherSubIndex = subIndex ?? 3;
      } else if (section == 'recovery') {
        _primaryIndex = 2;
        _recoverySubIndex = subIndex ?? 0;
      } else if (section == 'resource') {
        _primaryIndex = 3;
        _resourceSubIndex = subIndex ?? 0;
      } else if (section == 'incident') {
        _primaryIndex = 4;
        _incidentSubIndex = subIndex ?? 0;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isOfficer = auth.isOfficerOrAdmin;

    return Scaffold(
      backgroundColor: kSurface,
      body: Column(
        children: [
          _buildTopNavbar(context, auth),
          if (_primaryIndex == 1) _buildWeatherSubNav(context, isOfficer),
          if (_primaryIndex == 2) _buildRecoverySubNav(context),
          if (_primaryIndex == 3) _buildResourceSubNav(context),
          if (_primaryIndex == 4) _buildIncidentSubNav(context),
          Expanded(
            child: _buildCurrentBody(isOfficer),
          ),
        ],
      ),
    );
  }

  Widget _buildTopNavbar(BuildContext context, AuthProvider auth) {
    final user = auth.user;
    final roleColor = kRoleColors[user?.role] ?? const Color(0xFF60A5FA);

    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: const BoxDecoration(
        color: kNavBg,
        boxShadow: [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Logo & Title
          InkWell(
            onTap: () => setState(() => _primaryIndex = 0),
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.all(4.0),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: kAccent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: kAccent.withValues(alpha: 0.5)),
                    ),
                    child: const Icon(Icons.shield_outlined, color: kAccent, size: 22),
                  ),
                  const SizedBox(width: 10),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'AEGIS-LK',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                          letterSpacing: 0.5,
                        ),
                      ),
                      Text(
                        'Disaster Management',
                        style: TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 24),

          // Primary Navigation Links
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildPrimaryNavItem(
                    label: 'Home',
                    icon: Icons.home_outlined,
                    isActive: _primaryIndex == 0,
                    onTap: () => setState(() => _primaryIndex = 0),
                  ),
                  const SizedBox(width: 4),
                  _buildPrimaryNavItem(
                    label: 'Weather & Alerts',
                    icon: Icons.thunderstorm_outlined,
                    isActive: _primaryIndex == 1,
                    onTap: () => setState(() => _primaryIndex = 1),
                  ),
                  const SizedBox(width: 4),
                  _buildPrimaryNavItem(
                    label: 'Recovery & Relief',
                    icon: Icons.healing_outlined,
                    isActive: _primaryIndex == 2,
                    onTap: () => setState(() => _primaryIndex = 2),
                  ),
                  const SizedBox(width: 4),
                  _buildPrimaryNavItem(
                    label: 'Resource & Logistics',
                    icon: Icons.inventory_2_outlined,
                    isActive: _primaryIndex == 3,
                    onTap: () => setState(() => _primaryIndex = 3),
                  ),
                  const SizedBox(width: 4),
                  _buildPrimaryNavItem(
                    label: 'Report Incident',
                    icon: Icons.report_problem_outlined,
                    isActive: _primaryIndex == 4,
                    onTap: () => setState(() => _primaryIndex = 4),
                  ),
                ],
              ),
            ),
          ),

          // User Profile & Logout
          if (user != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF0F2B48),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF1E3A8A)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: roleColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    user.fullName.isNotEmpty ? user.fullName : user.email,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: roleColor.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      user.role,
                      style: TextStyle(
                        color: roleColor,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              icon: const Icon(Icons.logout, size: 18, color: Color(0xFF94A3B8)),
              tooltip: 'Sign Out',
              onPressed: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Sign Out'),
                    content: const Text('Are you sure you want to sign out?'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text('Cancel'),
                      ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: kDanger),
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text('Sign Out', style: TextStyle(color: Colors.white)),
                      ),
                    ],
                  ),
                );
                if (confirm == true) {
                  await auth.logout();
                }
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPrimaryNavItem({
    required String label,
    required IconData icon,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? kAccent.withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isActive ? kAccent.withValues(alpha: 0.4) : Colors.transparent,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: isActive ? kAccent : const Color(0xFF94A3B8),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                color: isActive ? Colors.white : const Color(0xFFCBD5E1),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWeatherSubNav(BuildContext context, bool isOfficer) {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: const BoxDecoration(
        color: kSubNavBg,
        border: Border(bottom: BorderSide(color: Color(0xFF1E3A8A), width: 1)),
      ),
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          _buildSubNavItem(
            label: 'Districts & Forecasts',
            icon: Icons.map_outlined,
            isActive: _weatherSubIndex == 0,
            onTap: () => setState(() => _weatherSubIndex = 0),
          ),
          const SizedBox(width: 6),
          _buildSubNavItem(
            label: 'Public Alerts',
            icon: Icons.notifications_active_outlined,
            isActive: _weatherSubIndex == 1,
            onTap: () => setState(() => _weatherSubIndex = 1),
          ),
          if (isOfficer) ...[
            const SizedBox(width: 6),
            _buildSubNavItem(
              label: 'Alert Review Queue',
              icon: Icons.fact_check_outlined,
              isActive: _weatherSubIndex == 2,
              onTap: () => setState(() => _weatherSubIndex = 2),
            ),
          ],
          const SizedBox(width: 6),
          _buildSubNavItem(
            label: 'Predictions & Outcomes',
            icon: Icons.history_edu_outlined,
            isActive: _weatherSubIndex == 3,
            onTap: () => setState(() => _weatherSubIndex = 3),
          ),
        ],
      ),
    );
  }

  Widget _buildResourceSubNav(BuildContext context) {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: const BoxDecoration(
        color: kSubNavBg,
        border: Border(bottom: BorderSide(color: Color(0xFF1E3A8A), width: 1)),
      ),
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          _buildSubNavItem(
            label: 'Warehouse Inventory',
            icon: Icons.warehouse_outlined,
            isActive: _resourceSubIndex == 0,
            onTap: () => setState(() => _resourceSubIndex = 0),
          ),
          const SizedBox(width: 6),
          _buildSubNavItem(
            label: 'Dispatch Plans',
            icon: Icons.local_shipping_outlined,
            isActive: _resourceSubIndex == 1,
            onTap: () => setState(() => _resourceSubIndex = 1),
          ),
          const SizedBox(width: 6),
          _buildSubNavItem(
            label: 'Delivery QR',
            icon: Icons.qr_code_scanner,
            isActive: _resourceSubIndex == 2,
            onTap: () => setState(() => _resourceSubIndex = 2),
          ),
        ],
      ),
    );
  }

  Widget _buildRecoverySubNav(BuildContext context) {
    final recoveryTabs = [
      {'label': 'Overview', 'icon': Icons.dashboard_outlined, 'index': 0},
      {'label': 'Safe Shelters', 'icon': Icons.night_shelter_outlined, 'index': 1},
      {'label': 'Request Aid', 'icon': Icons.handshake_outlined, 'index': 2},
      {'label': 'Requested Aids', 'icon': Icons.assignment_outlined, 'index': 3},
      {'label': 'Compensation', 'icon': Icons.account_balance_wallet_outlined, 'index': 8},
      {'label': 'Donate Support', 'icon': Icons.volunteer_activism_outlined, 'index': 4},
      {'label': 'Report Damage', 'icon': Icons.crisis_alert_outlined, 'index': 5},
      {'label': 'Rebuilding', 'icon': Icons.analytics_outlined, 'index': 6},
      {'label': 'Audit Reports', 'icon': Icons.assessment_outlined, 'index': 7},
    ];

    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: const BoxDecoration(
        color: kSubNavBg,
        border: Border(bottom: BorderSide(color: Color(0xFF1E3A8A), width: 1)),
      ),
      child: Row(
        children: [
          // Quick Grid Menu Button so user can view all tabs at a glance
          Tooltip(
            message: 'All Recovery Services',
            child: InkWell(
              onTap: () => _showAllRecoveryTabsSheet(context),
              borderRadius: BorderRadius.circular(6),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F2B48),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFF2563EB).withValues(alpha: 0.6)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.grid_view_rounded, size: 16, color: kAccent),
                    SizedBox(width: 4),
                    Text('All Tabs', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kAccent)),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Container(width: 1, height: 24, color: const Color(0xFF1E3A8A)),
          const SizedBox(width: 8),

          // Scrollable sub-nav items with clean styling
          Expanded(
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: recoveryTabs.length,
              separatorBuilder: (_, __) => const SizedBox(width: 6),
              itemBuilder: (ctx, i) {
                final item = recoveryTabs[i];
                final idx = item['index'] as int;
                return _buildSubNavItem(
                  label: item['label'] as String,
                  icon: item['icon'] as IconData,
                  isActive: _recoverySubIndex == idx,
                  onTap: () => setState(() => _recoverySubIndex = idx),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIncidentSubNav(BuildContext context) {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: const BoxDecoration(
        color: kSubNavBg,
        border: Border(bottom: BorderSide(color: Color(0xFF1E3A8A), width: 1)),
      ),
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          _buildSubNavItem(
            label: 'Report',
            icon: Icons.add_alert_outlined,
            isActive: _incidentSubIndex == 0,
            onTap: () => setState(() => _incidentSubIndex = 0),
          ),
          const SizedBox(width: 6),
          _buildSubNavItem(
            label: 'My Reports',
            icon: Icons.list_alt_outlined,
            isActive: _incidentSubIndex == 1,
            onTap: () => setState(() => _incidentSubIndex = 1),
          ),
        ],
      ),
    );
  }

  void _showAllRecoveryTabsSheet(BuildContext context) {
    final recoveryServices = [
      {'label': 'Operations Overview', 'desc': 'Recovery summary and live relief statistics', 'icon': Icons.dashboard_outlined, 'index': 0, 'color': const Color(0xFF3B82F6)},
      {'label': 'Safe Shelters', 'desc': 'Locate evacuation centers & check capacity', 'icon': Icons.night_shelter_outlined, 'index': 1, 'color': const Color(0xFF0D9488)},
      {'label': 'Request Emergency Aid', 'desc': 'Apply for rations, water, kits or temporary shelter', 'icon': Icons.handshake_outlined, 'index': 2, 'color': const Color(0xFF2563EB)},
      {'label': 'Requested Aids Tracker', 'desc': 'Track fulfillment & dispatch status of aid claims', 'icon': Icons.assignment_outlined, 'index': 3, 'color': const Color(0xFFD97706)},
      {'label': 'Damage Compensation', 'desc': 'Submit property loss claims & check grant payouts', 'icon': Icons.account_balance_wallet_outlined, 'index': 8, 'color': const Color(0xFF10B981)},
      {'label': 'Donate Support', 'desc': 'Contribute funds or supplies with shelter allocation', 'icon': Icons.volunteer_activism_outlined, 'index': 4, 'color': const Color(0xFF059669)},
      {'label': 'Report Damage (AI Trigger)', 'desc': 'Submit impact report for 4-agent recovery synthesis', 'icon': Icons.crisis_alert_outlined, 'index': 5, 'color': const Color(0xFFDC2626)},
      {'label': 'Rebuilding & AI Trace', 'desc': 'Inspect multi-agent timeline, tasks & NGO matches', 'icon': Icons.analytics_outlined, 'index': 6, 'color': const Color(0xFF4F46E5)},
      {'label': 'Audit Reports', 'desc': 'View national recovery audits & KPI metrics', 'icon': Icons.assessment_outlined, 'index': 7, 'color': const Color(0xFF0284C7)},
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF07162C),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Recovery & Relief Services',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Color(0xFF94A3B8), size: 20),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: GridView.builder(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 2.2,
                    ),
                    itemCount: recoveryServices.length,
                    itemBuilder: (context, idx) {
                      final s = recoveryServices[idx];
                      final isCurrent = _recoverySubIndex == (s['index'] as int);
                      final c = s['color'] as Color;

                      return InkWell(
                        onTap: () {
                          Navigator.pop(ctx);
                          setState(() => _recoverySubIndex = s['index'] as int);
                        },
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isCurrent ? c.withValues(alpha: 0.25) : const Color(0xFF0F2B48),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isCurrent ? c : const Color(0xFF1E3A8A),
                              width: isCurrent ? 1.5 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: c.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(s['icon'] as IconData, color: c, size: 20),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      s['label'] as String,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: isCurrent ? Colors.white : const Color(0xFFE2E8F0),
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      s['desc'] as String,
                                      style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSubNavItem({
    required String label,
    required IconData icon,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return Center(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isActive ? kAccent.withValues(alpha: 0.2) : Colors.transparent,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: isActive ? kAccent : Colors.transparent,
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 14,
                color: isActive ? kAccent : const Color(0xFF94A3B8),
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                  color: isActive ? Colors.white : const Color(0xFFCBD5E1),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCurrentBody(bool isOfficer) {
    if (_primaryIndex == 0) {
      return HomeScreen(
        onNavigate: _navigateTo,
      );
    }

    if (_primaryIndex == 1) {
      switch (_weatherSubIndex) {
        case 0:
          return const WeatherHomeScreen(showAppBar: false);
        case 1:
          return const WeatherAlertsScreen(
            showAppBar: false,
            initialStatus: 'Published',
          );
        case 2:
          if (!isOfficer) {
            return const WeatherAlertsScreen(
              showAppBar: false,
              initialStatus: 'Published',
            );
          }
          return const WeatherAlertsScreen(
            showAppBar: false,
            initialStatus: 'PendingReview',
          );
        case 3:
          return const PredictionHistoryScreen(showAppBar: false);
        default:
          return const WeatherHomeScreen(showAppBar: false);
      }
    }

    if (_primaryIndex == 2) {
      switch (_recoverySubIndex) {
        case 0:
          return RecoveryHomeScreen(
            showAppBar: false,
            onSelectSubIndex: (idx) => setState(() => _recoverySubIndex = idx),
          );
        case 1:
          return const ShelterFinderScreen(showAppBar: false);
        case 2:
          return const AidRequestScreen(showAppBar: false);
        case 3:
          return const MyAidRequestsScreen(showAppBar: false);
        case 4:
          return const DonateScreen(showAppBar: false);
        case 5:
          return const CitizenDamageReportScreen(showAppBar: false);
        case 6:
          return const RecoveryPlanStatusScreen(showAppBar: false);
        case 7:
          return const RecoveryReportsScreen(showAppBar: false);
        case 8:
          return const CompensationClaimScreen(showAppBar: false);
        default:
          return RecoveryHomeScreen(
            showAppBar: false,
            onSelectSubIndex: (idx) => setState(() => _recoverySubIndex = idx),
          );
      }
    }

    if (_primaryIndex == 3) {
      switch (_resourceSubIndex) {
        case 0:
          return const WarehouseInventoryScreen();
        case 1:
          return const DispatchPlanScreen();
        case 2:
          return const DeliveryQrScreen();
        default:
          return const WarehouseInventoryScreen();
      }
    }

    if (_primaryIndex == 4) {
      switch (_incidentSubIndex) {
        case 1:
          // key forces a fresh fetch each time the citizen opens this tab,
          // so a just-merged duplicate shows its new status.
          return MyReportsScreen(key: UniqueKey(), showAppBar: false);
        case 0:
        default:
          return ReportIncidentScreen(
            showAppBar: false,
            onSubmitted: () => setState(() => _incidentSubIndex = 1),
          );
      }
    }

    return HomeScreen(onNavigate: _navigateTo);
  }
}