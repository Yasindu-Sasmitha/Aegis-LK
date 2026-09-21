import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../auth/auth_provider.dart';
import '../theme/aegis_theme.dart';
import '../../features/home/home_screen.dart';
import '../../features/weather/screens/weather_home_screen.dart';
import '../../features/weather/screens/alerts_screen.dart';
import '../../features/recovery/screens/recovery_home_screen.dart';
import '../../features/recovery/screens/shelter_finder_screen.dart';
import '../../features/recovery/screens/aid_request_screen.dart';
import '../../features/recovery/screens/my_aid_requests_screen.dart';
import '../../features/recovery/screens/donate_screen.dart';
import '../../features/recovery/screens/citizen_damage_report_screen.dart';
import '../../features/recovery/screens/recovery_plan_status_screen.dart';
import '../../features/recovery/screens/compensation_claim_screen.dart';
import '../../features/recovery/screens/recovery_reports_screen.dart';

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

  @override
  void initState() {
    super.initState();
    _primaryIndex = widget.initialPrimaryIndex;
    if (_primaryIndex == 1) {
      _weatherSubIndex = widget.initialSubIndex;
    } else if (_primaryIndex == 2) {
      _recoverySubIndex = widget.initialSubIndex;
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
      } else if (section == 'recovery') {
        _primaryIndex = 2;
        _recoverySubIndex = subIndex ?? 0;
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
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
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
        ],
      ),
    );
  }

  Widget _buildRecoverySubNav(BuildContext context) {
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
            label: 'Overview',
            icon: Icons.dashboard_outlined,
            isActive: _recoverySubIndex == 0,
            onTap: () => setState(() => _recoverySubIndex = 0),
          ),
          const SizedBox(width: 6),
          _buildSubNavItem(
            label: 'Safe Shelters',
            icon: Icons.night_shelter_outlined,
            isActive: _recoverySubIndex == 1,
            onTap: () => setState(() => _recoverySubIndex = 1),
          ),
          const SizedBox(width: 6),
          _buildSubNavItem(
            label: 'Request Aid',
            icon: Icons.handshake_outlined,
            isActive: _recoverySubIndex == 2,
            onTap: () => setState(() => _recoverySubIndex = 2),
          ),
          const SizedBox(width: 6),
          _buildSubNavItem(
            label: 'My Applications',
            icon: Icons.assignment_outlined,
            isActive: _recoverySubIndex == 3,
            onTap: () => setState(() => _recoverySubIndex = 3),
          ),
          const SizedBox(width: 6),
          _buildSubNavItem(
            label: 'Donate Support',
            icon: Icons.volunteer_activism_outlined,
            isActive: _recoverySubIndex == 4,
            onTap: () => setState(() => _recoverySubIndex = 4),
          ),
          const SizedBox(width: 6),
          _buildSubNavItem(
            label: 'Report Damage',
            icon: Icons.report_problem_outlined,
            isActive: _recoverySubIndex == 5,
            onTap: () => setState(() => _recoverySubIndex = 5),
          ),
          const SizedBox(width: 6),
          _buildSubNavItem(
            label: 'Rebuilding Progress',
            icon: Icons.analytics_outlined,
            isActive: _recoverySubIndex == 6,
            onTap: () => setState(() => _recoverySubIndex = 6),
          ),
          const SizedBox(width: 6),
          _buildSubNavItem(
            label: 'Compensation',
            icon: Icons.roofing_outlined,
            isActive: _recoverySubIndex == 7,
            onTap: () => setState(() => _recoverySubIndex = 7),
          ),
          const SizedBox(width: 6),
          _buildSubNavItem(
            label: 'Audit Reports',
            icon: Icons.assessment_outlined,
            isActive: _recoverySubIndex == 8,
            onTap: () => setState(() => _recoverySubIndex = 8),
          ),
        ],
      ),
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
          return const CompensationClaimScreen(showAppBar: false);
        case 8:
          return const RecoveryReportsScreen(showAppBar: false);
        default:
          return RecoveryHomeScreen(
            showAppBar: false,
            onSelectSubIndex: (idx) => setState(() => _recoverySubIndex = idx),
          );
      }
    }

    return HomeScreen(onNavigate: _navigateTo);
  }
}
