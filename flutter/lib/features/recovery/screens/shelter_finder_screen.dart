import 'package:flutter/material.dart';
import '../models/recovery_models.dart';
import '../services/recovery_service.dart';

class ShelterFinderScreen extends StatefulWidget {
  const ShelterFinderScreen({Key? key}) : super(key: key);

  @override
  State<ShelterFinderScreen> createState() => _ShelterFinderScreenState();
}

class _ShelterFinderScreenState extends State<ShelterFinderScreen> {
  final RecoveryService _service = RecoveryService();
  late Future<List<ShelterModel>> _sheltersFuture;
  String _selectedDistrict = 'All';

  @override
  void initState() {
    super.initState();
    _loadShelters();
  }

  void _loadShelters() {
    setState(() {
      _sheltersFuture = _service.fetchShelters(district: _selectedDistrict == 'All' ? null : _selectedDistrict);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Emergency Shelters'),
        backgroundColor: Colors.teal[700],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Row(
              children: [
                const Text('Filter District: ', style: TextStyle(fontWeight: FontWeight.bold)),
                DropdownButton<String>(
                  value: _selectedDistrict,
                  items: ['All', 'Kalutara', 'Ratnapura', 'Matara', 'Colombo']
                      .map((d) => DropdownMenuItem(value: d, child: Text(d)))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) {
                      _selectedDistrict = val;
                      _loadShelters();
                    }
                  },
                ),
              ],
            ),
          ),
          Expanded(
            child: FutureBuilder<List<ShelterModel>>(
              future: _sheltersFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Text('Error: ${snapshot.error}'));
                }
                final shelters = snapshot.data ?? [];
                if (shelters.isEmpty) {
                  return const Center(child: Text('No active shelters found for district.'));
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: shelters.length,
                  itemBuilder: (context, index) {
                    final s = shelters[index];
                    final isFull = s.status == 'Full';

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(s.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: isFull ? Colors.red[100] : Colors.green[100],
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    s.status,
                                    style: TextStyle(color: isFull ? Colors.red[800] : Colors.green[800], fontWeight: FontWeight.bold, fontSize: 12),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text('📍 ${s.location} (${s.district})', style: const TextStyle(color: Colors.grey)),
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Occupancy: ${s.currentOccupancy} / ${s.capacity}'),
                                Text(
                                  '${((s.currentOccupancy / s.capacity) * 100).round()}%',
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            LinearProgressIndicator(
                              value: s.currentOccupancy / s.capacity,
                              backgroundColor: Colors.grey[200],
                              color: isFull ? Colors.red : Colors.teal,
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                const Icon(Icons.phone, size: 16, color: Colors.grey),
                                const SizedBox(width: 4),
                                Text('${s.contactPerson} (${s.contactPhone})', style: const TextStyle(fontSize: 13)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
