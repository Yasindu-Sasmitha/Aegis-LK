import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../shared/auth/auth_provider.dart';
import '../../../shared/theme/aegis_theme.dart';
import '../models/incident_models.dart';
import '../services/incident_service.dart';

class MyReportsScreen extends StatefulWidget {
  final bool showAppBar;
  const MyReportsScreen({super.key, this.showAppBar = true});

  @override
  State<MyReportsScreen> createState() => _MyReportsScreenState();
}

class _MyReportsScreenState extends State<MyReportsScreen> {
  final IncidentService _service = IncidentService();
  late Future<List<MyIncidentReportModel>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<MyIncidentReportModel>> _load() {
    final user = context.read<AuthProvider>().user;
    if (user == null) return Future.value([]);
    return _service.fetchMyReports(user.id);
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  Future<void> _confirmClose(MyIncidentReportModel report) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Close incident'),
        content: const Text(
            'Has the rescue been completed? Closing this incident marks it as resolved.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Not yet'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Yes, close it'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    try {
      await _service.closeIncident(report.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Incident closed.')));
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    }
  }

  // Colors/icons per status. "Confirmed — merged..." gets its own distinct
  // treatment so a citizen can tell it apart from an ignored report.
  ({Color color, IconData icon, String hint}) _statusStyle(String displayStatus) {
    if (displayStatus.startsWith('Confirmed')) {
      return (
        color: kSuccess,
        icon: Icons.verified,
        hint: 'Others reported this too. Officers are already handling the event.',
      );
    }
    switch (displayStatus) {
      case 'Assessed':
        return (color: kAccent, icon: Icons.fact_check, hint: 'An officer is reviewing the situation.');
      case 'OnHold':
        return (color: kWarning, icon: Icons.pause_circle, hint: 'Real, but lower priority right now. It has not been forgotten.');
      case 'Rejected':
        return (color: kDanger, icon: Icons.cancel, hint: 'This report could not be confirmed.');
      case 'MissionApproved':
        return (color: kSuccess, icon: Icons.emergency, hint: 'A rescue mission has been approved.');
      case 'Closed':
        return (color: kTextMuted, icon: Icons.check_circle, hint: 'This incident has been resolved.');
      default:
        return (color: kWarning, icon: Icons.schedule, hint: 'Received. Our system is screening it.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = RefreshIndicator(
      onRefresh: _refresh,
      child: FutureBuilder<List<MyIncidentReportModel>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ListView(
              children: [
                const SizedBox(height: 80),
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      'Could not load your reports.\n${snapshot.error.toString().replaceFirst('Exception: ', '')}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: kDanger),
                    ),
                  ),
                ),
              ],
            );
          }
          final reports = snapshot.data ?? [];
          if (reports.isEmpty) {
            return ListView(
              children: const [
                SizedBox(height: 80),
                Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      "You haven't reported anything yet.",
                      style: TextStyle(color: kTextSecondary),
                    ),
                  ),
                ),
              ],
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: reports.length,
            itemBuilder: (context, i) => _ReportCard(
              report: reports[i],
              style: _statusStyle(reports[i].displayStatus),
              onClose: reports[i].displayStatus == 'MissionApproved'
                  ? () => _confirmClose(reports[i])
                  : null,
            ),
          );
        },
      ),
    );

    if (!widget.showAppBar) return body;
    return Scaffold(
      backgroundColor: kSurface,
      appBar: AppBar(title: const Text('My Reports'), backgroundColor: kNavBg, foregroundColor: Colors.white),
      body: body,
    );
  }
}

class _ReportCard extends StatelessWidget {
  final MyIncidentReportModel report;
  final ({Color color, IconData icon, String hint}) style;
  final VoidCallback? onClose;
  const _ReportCard({required this.report, required this.style, this.onClose});

  @override
  Widget build(BuildContext context) {
    final d = report.createdAt.toLocal();
    final date = '${d.day}/${d.month}/${d.year}';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: kCardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(report.disasterType,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextPrimary)),
              const SizedBox(width: 8),
              Text(date, style: const TextStyle(fontSize: 12, color: kTextMuted)),
              const Spacer(),
              Text(report.severityReported,
                  style: const TextStyle(fontSize: 12, color: kTextSecondary, fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 8),
          Text(report.description,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: kTextSecondary)),
          if (report.photoUrl != null) ...[
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(report.photoUrl!, height: 140, width: double.infinity, fit: BoxFit.cover),
            ),
          ],
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: style.color.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(style.icon, size: 18, color: style.color),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(report.displayStatus,
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: style.color)),
                      const SizedBox(height: 2),
                      Text(style.hint, style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (onClose != null) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onClose,
                icon: const Icon(Icons.task_alt, size: 18),
                label: const Text('Close incident'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: kSuccess,
                  side: const BorderSide(color: kSuccess),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}