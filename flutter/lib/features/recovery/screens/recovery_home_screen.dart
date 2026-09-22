import 'package:flutter/material.dart';
import '../../../shared/theme/aegis_theme.dart';
import 'shelter_finder_screen.dart';
import 'aid_request_screen.dart';
import 'my_aid_requests_screen.dart';
import 'donate_screen.dart';
import 'recovery_plan_status_screen.dart';
import 'citizen_damage_report_screen.dart';
import 'compensation_claim_screen.dart';
import 'recovery_reports_screen.dart';

class RecoveryHomeScreen extends StatelessWidget {
  final bool showAppBar;
  final Function(int subIndex)? onSelectSubIndex;

  const RecoveryHomeScreen({
    super.key,
    this.showAppBar = true,
    this.onSelectSubIndex,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSurface,
      appBar: showAppBar
          ? AppBar(
              backgroundColor: kNavBg,
              iconTheme: const IconThemeData(color: Colors.white),
              title: const Text('Recovery & Community Relief', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // Hero Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF07162C), Color(0xFF0F2B48), Color(0xFF1E3A8A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [
                BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, 4)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: kAccent.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.healing_outlined, color: kAccent, size: 24),
                    ),
                    const SizedBox(width: 10),
                    const Text(
                      'Aegis Community Recovery',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Text(
                  'End-to-end post-disaster operations: shelter coordination, aid allocation, transparent public donations, and 4-agent autonomous rebuilding synthesis.',
                  style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13, height: 1.4),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          const Text(
            'Emergency Citizen Services',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: kTextPrimary),
          ),
          const SizedBox(height: 10),

          _buildActionCard(
            context,
            title: 'Report Disaster Damage (AI Trigger)',
            subtitle: 'Submit localized damage & trigger autonomous 4-agent recovery synthesis.',
            icon: Icons.crisis_alert,
            color: const Color(0xFFDC2626),
            onTap: () => onSelectSubIndex != null
                ? onSelectSubIndex!(5)
                : Navigator.push(context, MaterialPageRoute(builder: (_) => const CitizenDamageReportScreen())),
          ),
          const SizedBox(height: 10),

          _buildActionCard(
            context,
            title: 'Find Emergency Shelters',
            subtitle: 'Locate nearby open shelters and view real-time bed capacity.',
            icon: Icons.night_shelter_outlined,
            color: const Color(0xFF0D9488),
            onTap: () => onSelectSubIndex != null
                ? onSelectSubIndex!(1)
                : Navigator.push(context, MaterialPageRoute(builder: (_) => const ShelterFinderScreen())),
          ),
          const SizedBox(height: 10),

          _buildActionCard(
            context,
            title: 'Request Emergency Aid',
            subtitle: 'Apply for dry food rations, medical supplies, shelter or financial aid.',
            icon: Icons.handshake_outlined,
            color: const Color(0xFF2563EB),
            onTap: () => onSelectSubIndex != null
                ? onSelectSubIndex!(2)
                : Navigator.push(context, MaterialPageRoute(builder: (_) => const AidRequestScreen())),
          ),
          const SizedBox(height: 10),

          _buildActionCard(
            context,
            title: 'My Aid Applications',
            subtitle: 'Track live status and shelter allocations for your relief requests.',
            icon: Icons.assignment_outlined,
            color: const Color(0xFFD97706),
            onTap: () => onSelectSubIndex != null
                ? onSelectSubIndex!(3)
                : Navigator.push(context, MaterialPageRoute(builder: (_) => const MyAidRequestsScreen())),
          ),
          const SizedBox(height: 20),

          const Text(
            'Rebuilding & Financial Relief',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: kTextPrimary),
          ),
          const SizedBox(height: 10),

          _buildActionCard(
            context,
            title: 'Rebuilding Workflows & AI Trace',
            subtitle: 'Inspect 4-agent reasoning timeline, NGO task ledger, and officer review.',
            icon: Icons.analytics_outlined,
            color: const Color(0xFF4F46E5),
            onTap: () => onSelectSubIndex != null
                ? onSelectSubIndex!(6)
                : Navigator.push(context, MaterialPageRoute(builder: (_) => const RecoveryPlanStatusScreen())),
          ),
          const SizedBox(height: 10),

          _buildActionCard(
            context,
            title: 'Housing Damage Compensation',
            subtitle: 'File property damage claims and monitor verification ledger.',
            icon: Icons.roofing_outlined,
            color: const Color(0xFF9D174D),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CompensationClaimScreen())),
          ),
          const SizedBox(height: 10),

          _buildActionCard(
            context,
            title: 'Donate Relief Supplies & Funds',
            subtitle: 'Contribute monetary aid or supplies with direct shelter tracking.',
            icon: Icons.volunteer_activism_outlined,
            color: const Color(0xFF059669),
            onTap: () => onSelectSubIndex != null
                ? onSelectSubIndex!(4)
                : Navigator.push(context, MaterialPageRoute(builder: (_) => const DonateScreen())),
          ),
          const SizedBox(height: 10),

          _buildActionCard(
            context,
            title: 'Disaster Recovery & Audit Reports',
            subtitle: 'Explore national recovery metrics, fund disbursement, and audit reports.',
            icon: Icons.assessment_outlined,
            color: const Color(0xFF0284C7),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RecoveryReportsScreen())),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildActionCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kTextPrimary)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios, size: 14, color: kTextMuted),
            ],
          ),
        ),
      ),
    );
  }
}
