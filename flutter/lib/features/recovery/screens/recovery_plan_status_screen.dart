import 'package:flutter/material.dart';

class RecoveryPlanStatusScreen extends StatelessWidget {
  const RecoveryPlanStatusScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Community Recovery Status'),
        backgroundColor: Colors.indigo[700],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Disaster Rebuilding & Relief Progress', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text('Track public infrastructure repair plans and relief agency coordination.', style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 20),
          _buildTaskItem('Road Repair: B244 Highway', 'Red Cross & SL Army Engineering Division', 'InProgress', 0.65),
          const SizedBox(height: 12),
          _buildTaskItem('Water Supply Restoration (Kalutara South)', 'Sarvodaya Movement', 'InProgress', 0.40),
          const SizedBox(height: 12),
          _buildTaskItem('Temporary School Shelter Setup', 'UNICEF Sri Lanka', 'Completed', 1.0),
        ],
      ),
    );
  }

  Widget _buildTaskItem(String title, String ngo, String status, double progress) {
    final isDone = status == 'Completed';

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
                Chip(
                  label: Text(status, style: TextStyle(color: isDone ? Colors.green[900] : Colors.blue[900], fontSize: 12, fontWeight: FontWeight.bold)),
                  backgroundColor: isDone ? Colors.green[100] : Colors.blue[100],
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text('Assigned Partner: $ngo', style: const TextStyle(color: Colors.grey, fontSize: 13)),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Completion:', style: TextStyle(fontSize: 12)),
                Text('${(progress * 100).round()}%', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              ],
            ),
            const SizedBox(height: 4),
            LinearProgressIndicator(value: progress, color: isDone ? Colors.green : Colors.indigo),
          ],
        ),
      ),
    );
  }
}
