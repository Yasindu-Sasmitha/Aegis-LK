import 'package:flutter/material.dart';
import 'shelter_finder_screen.dart';
import 'aid_request_screen.dart';
import 'my_aid_requests_screen.dart';
import 'donate_screen.dart';
import 'recovery_plan_status_screen.dart';

class RecoveryHomeScreen extends StatelessWidget {
  const RecoveryHomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Recovery & Relief'),
        backgroundColor: Colors.teal[700],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          const Text(
            'Community Disaster Recovery',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          const Text(
            'Find shelter, apply for emergency aid, or support affected communities.',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 20),
          _buildCard(
            context,
            title: 'Find Emergency Shelters',
            subtitle: 'Locate nearby open shelters and view available capacity.',
            icon: Icons.night_shelter_outlined,
            color: Colors.teal[600]!,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ShelterFinderScreen())),
          ),
          const SizedBox(height: 12),
          _buildCard(
            context,
            title: 'Request Emergency Aid',
            subtitle: 'Apply for food, medical care, shelter allocation or financial help.',
            icon: Icons.handshake_outlined,
            color: Colors.blue[600]!,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AidRequestScreen())),
          ),
          const SizedBox(height: 12),
          _buildCard(
            context,
            title: 'My Aid Applications',
            subtitle: 'Track status of your submitted emergency aid requests.',
            icon: Icons.assignment_outlined,
            color: Colors.amber[800]!,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MyAidRequestsScreen())),
          ),
          const SizedBox(height: 12),
          _buildCard(
            context,
            title: 'Donate Supplies & Support',
            subtitle: 'Contribute monetary aid or supplies to shelter centers.',
            icon: Icons.volunteer_activism_outlined,
            color: Colors.green[600]!,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DonateScreen())),
          ),
          const SizedBox(height: 12),
          _buildCard(
            context,
            title: 'Community Recovery Progress',
            subtitle: 'View active rebuilding plans and NGO assignments.',
            icon: Icons.analytics_outlined,
            color: Colors.indigo[600]!,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RecoveryPlanStatusScreen())),
          ),
        ],
      ),
    );
  }

  Widget _buildCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.15),
          radius: 26,
          child: Icon(icon, color: color, size: 28),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 13)),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }
}
