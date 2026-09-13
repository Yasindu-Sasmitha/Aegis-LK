import 'package:flutter/material.dart';
import '../models/recovery_models.dart';
import '../services/recovery_service.dart';

class MyAidRequestsScreen extends StatefulWidget {
  const MyAidRequestsScreen({Key? key}) : super(key: key);

  @override
  State<MyAidRequestsScreen> createState() => _MyAidRequestsScreenState();
}

class _MyAidRequestsScreenState extends State<MyAidRequestsScreen> {
  final RecoveryService _service = RecoveryService();
  late Future<List<AidRequestModel>> _requestsFuture;

  @override
  void initState() {
    super.initState();
    _requestsFuture = _service.fetchMyAidRequests();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Aid Applications'),
        backgroundColor: Colors.amber[800],
      ),
      body: FutureBuilder<List<AidRequestModel>>(
        future: _requestsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final requests = snapshot.data ?? [];
          if (requests.isEmpty) {
            return const Center(child: Text('No aid applications found.'));
          }

          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: requests.length,
            itemBuilder: (context, index) {
              final r = requests[index];
              final isApproved = r.status == 'Approved' || r.status == 'Fulfilled';

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  title: Text('${r.aidType} Aid (${r.familySize} Family Members)', style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Text('District: ${r.district} | Urgency: ${r.urgency}'),
                      if (r.shelterName != null) Text('Assigned Shelter: ${r.shelterName}'),
                    ],
                  ),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isApproved ? Colors.green[100] : Colors.amber[100],
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      r.status,
                      style: TextStyle(color: isApproved ? Colors.green[900] : Colors.amber[900], fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
