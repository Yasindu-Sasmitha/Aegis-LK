import 'package:flutter/material.dart';
import '../../../shared/auth/auth_service.dart';
import '../models/weather_models.dart';
import '../services/weather_service.dart';

class PredictionHistoryScreen extends StatefulWidget {
  final bool showAppBar;
  final WeatherService? weatherService;

  const PredictionHistoryScreen({
    super.key,
    this.showAppBar = true,
    this.weatherService,
  });

  @override
  State<PredictionHistoryScreen> createState() => _PredictionHistoryScreenState();
}

class _PredictionHistoryScreenState extends State<PredictionHistoryScreen> {
  late final WeatherService _weatherService = widget.weatherService ?? WeatherService();

  List<PredictionItem> _predictions = [];
  List<District> _districts = [];
  bool _isLoading = true;
  String? _errorMessage;

  String _hazardFilter = 'All'; // All, Flood, Landslide, StrongWind
  String _outcomeFilter = 'All'; // All, Pending, Recorded
  String? _selectedDistrictId;
  String _sortOrder = 'desc'; // desc = newest, asc = oldest
  bool _isProcessingAction = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (_districts.isEmpty) {
        _districts = await _weatherService.fetchDistricts();
      }

      final hazardParam = _hazardFilter == 'All' ? null : _hazardFilter;
      final res = await _weatherService.fetchPredictions(
        districtId: _selectedDistrictId,
        hazardType: hazardParam,
        sortBy: 'createdAt',
        sortOrder: _sortOrder,
        pageSize: 100,
      );

      var items = res.items;
      if (_outcomeFilter == 'Pending') {
        items = items.where((p) => !p.hasOutcome).toList();
      } else if (_outcomeFilter == 'Recorded') {
        items = items.where((p) => p.hasOutcome).toList();
      }

      setState(() {
        _predictions = items;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _showOutcomeDialog(PredictionItem item) async {
    bool occurred = true;
    final valueController = TextEditingController();
    final notesController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          title: Row(
            children: [
              Icon(Icons.fact_check, color: Colors.indigo[700]),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Confirm Ground Truth',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.blue.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.blue.withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'District: ${item.districtName ?? "District"}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Hazard: ${item.hazardType} (${item.riskProbabilityPct.toStringAsFixed(0)}% predicted risk)',
                        style: TextStyle(fontSize: 12, color: Colors.grey[800]),
                      ),
                      Text(
                        'Forecast: ${item.forecastValue.toStringAsFixed(1)} ${item.unit} (Threshold: ${item.historicalThreshold.toStringAsFixed(1)} ${item.unit})',
                        style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Did a disaster occur?',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => setDialogState(() => occurred = true),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: occurred ? Colors.red[700] : Colors.grey[200],
                            borderRadius: BorderRadius.circular(8),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'Yes — Occurred',
                            style: TextStyle(
                              color: occurred ? Colors.white : Colors.black87,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: InkWell(
                        onTap: () => setDialogState(() => occurred = false),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: !occurred ? Colors.green[700] : Colors.grey[200],
                            borderRadius: BorderRadius.circular(8),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'No Disaster',
                            style: TextStyle(
                              color: !occurred ? Colors.white : Colors.black87,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: valueController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: 'Actual Measured Value (${item.unit}) (Optional)',
                    hintText: 'e.g. 138.5',
                    border: const OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: notesController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Notes / Verification Source (Optional)',
                    hintText: 'e.g. Confirmed by DDMCU ground report',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.indigo[700],
                foregroundColor: Colors.white,
              ),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Save Outcome'),
            ),
          ],
        ),
      ),
    );

    if (confirmed != true) return;

    setState(() => _isProcessingAction = true);

    try {
      double? actualVal;
      final valText = valueController.text.trim();
      if (valText.isNotEmpty) {
        actualVal = double.tryParse(valText);
      }

      final notesText = notesController.text.trim();

      await _weatherService.recordPredictionOutcome(
        predictionId: item.id,
        actualDisasterOccurred: occurred,
        actualValue: actualVal,
        notes: notesText.isNotEmpty ? notesText : null,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ground truth outcome recorded for ${item.districtName ?? "district"}!'),
            backgroundColor: Colors.green[700],
          ),
        );
      }
      await _loadData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to record outcome: $e'),
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

  Color _getHazardColor(String hazardType) {
    switch (hazardType) {
      case 'Flood':
        return Colors.blue[700]!;
      case 'Landslide':
        return Colors.brown[700]!;
      case 'StrongWind':
        return Colors.teal[700]!;
      default:
        return Colors.grey[700]!;
    }
  }

  IconData _getHazardIcon(String hazardType) {
    switch (hazardType) {
      case 'Flood':
        return Icons.water;
      case 'Landslide':
        return Icons.landscape;
      case 'StrongWind':
        return Icons.air;
      default:
        return Icons.warning_amber_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isOfficer = AuthService.currentUser?.isOfficerOrAdmin ?? false;

    return Scaffold(
      appBar: widget.showAppBar
          ? AppBar(
              title: const Text('Prediction History & Ground Truth',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              backgroundColor: Colors.indigo[800],
              foregroundColor: Colors.white,
              actions: [
                IconButton(
                  icon: const Icon(Icons.refresh),
                  tooltip: 'Refresh',
                  onPressed: _loadData,
                ),
              ],
            )
          : null,
      body: Column(
        children: [
          // Filter & Sort Section
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Outcome filter chips + sort button
                Row(
                  children: [
                    const Text('Status: ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(width: 4),
                    Expanded(
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            for (final opt in ['All', 'Pending', 'Recorded'])
                              Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: ChoiceChip(
                                  label: Text(opt == 'Pending' ? 'Pending Ground Truth' : opt),
                                  selected: _outcomeFilter == opt,
                                  selectedColor: Colors.indigo[700],
                                  labelStyle: TextStyle(
                                    color: _outcomeFilter == opt ? Colors.white : Colors.black87,
                                    fontSize: 12,
                                    fontWeight: _outcomeFilter == opt ? FontWeight.bold : FontWeight.normal,
                                  ),
                                  onSelected: (selected) {
                                    if (selected) {
                                      setState(() => _outcomeFilter = opt);
                                      _loadData();
                                    }
                                  },
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    // Sort order button
                    IconButton(
                      icon: Icon(
                        _sortOrder == 'desc' ? Icons.arrow_downward : Icons.arrow_upward,
                        size: 20,
                        color: Colors.indigo[700],
                      ),
                      tooltip: _sortOrder == 'desc' ? 'Newest first' : 'Oldest first',
                      onPressed: () {
                        setState(() {
                          _sortOrder = _sortOrder == 'desc' ? 'asc' : 'desc';
                        });
                        _loadData();
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 6),

                // Hazard filter chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      const Text('Hazard: ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(width: 4),
                      for (final hz in ['All', 'Flood', 'Landslide', 'StrongWind'])
                        Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ChoiceChip(
                            label: Text(hz == 'StrongWind' ? 'Strong Wind' : hz),
                            selected: _hazardFilter == hz,
                            selectedColor: Colors.indigo[700],
                            labelStyle: TextStyle(
                              color: _hazardFilter == hz ? Colors.white : Colors.black87,
                              fontSize: 12,
                            ),
                            onSelected: (selected) {
                              if (selected) {
                                setState(() => _hazardFilter = hz);
                                _loadData();
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

          // Predictions List
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
                              Text('Failed to load predictions',
                                  style: TextStyle(color: Colors.grey[800], fontWeight: FontWeight.bold)),
                              const SizedBox(height: 6),
                              Text(_errorMessage!,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              const SizedBox(height: 16),
                              ElevatedButton(onPressed: _loadData, child: const Text('Retry')),
                            ],
                          ),
                        ),
                      )
                    : _predictions.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.history, size: 48, color: Colors.grey[400]),
                                const SizedBox(height: 12),
                                Text(
                                  'No predictions found matching current filters',
                                  style: TextStyle(color: Colors.grey[700], fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _loadData,
                            child: ListView.builder(
                              padding: const EdgeInsets.all(12),
                              itemCount: _predictions.length,
                              itemBuilder: (context, index) {
                                return _buildPredictionCard(_predictions[index], isOfficer);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildPredictionCard(PredictionItem item, bool isOfficer) {
    final hazardColor = _getHazardColor(item.hazardType);
    final hazardIcon = _getHazardIcon(item.hazardType);

    final bool hasOutcome = item.hasOutcome;
    final bool disasterOccurred = item.actualDisasterOccurred ?? false;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top row: District + Hazard + Outcome badge
            Row(
              children: [
                Icon(hazardIcon, color: hazardColor, size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.districtName ?? 'District',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Text(
                        item.hazardType == 'StrongWind' ? 'Strong Wind' : item.hazardType,
                        style: TextStyle(color: hazardColor, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                // Outcome state badge
                if (!hasOutcome)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.amber[100],
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.amber[600]!),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.hourglass_empty, size: 12, color: Colors.amber[900]),
                        const SizedBox(width: 4),
                        Text(
                          'Pending Ground Truth',
                          style: TextStyle(
                            color: Colors.amber[900],
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      color: disasterOccurred ? Colors.red[50] : Colors.green[50],
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: disasterOccurred ? Colors.red[400]! : Colors.green[600]!,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          disasterOccurred ? Icons.error_outline : Icons.check_circle_outline,
                          size: 13,
                          color: disasterOccurred ? Colors.red[700] : Colors.green[700],
                        ),
                        const SizedBox(width: 4),
                        Text(
                          disasterOccurred ? 'Disaster Occurred' : 'No Disaster',
                          style: TextStyle(
                            color: disasterOccurred ? Colors.red[700] : Colors.green[700],
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),

            // Metrics row: Risk probability & Confidence
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Predicted Risk', style: TextStyle(fontSize: 11, color: Colors.grey)),
                        const SizedBox(height: 2),
                        Text(
                          '${item.riskProbabilityPct.toStringAsFixed(1)}%',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: item.riskProbabilityPct >= 70
                                ? Colors.red[700]
                                : item.riskProbabilityPct >= 40
                                    ? Colors.orange[800]
                                    : Colors.green[700],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Confidence', style: TextStyle(fontSize: 11, color: Colors.grey)),
                        const SizedBox(height: 2),
                        Text(
                          '${item.confidencePct.toStringAsFixed(1)}%',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Forecast vs Threshold
            Row(
              children: [
                Text(
                  'Forecast: ${item.forecastValue.toStringAsFixed(1)} ${item.unit}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                ),
                const SizedBox(width: 8),
                Text(
                  'vs Threshold: ${item.historicalThreshold.toStringAsFixed(1)} ${item.unit}',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ],
            ),

            // Actual Ground Truth Details if present
            if (hasOutcome) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: disasterOccurred ? Colors.red.withValues(alpha: 0.05) : Colors.green.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: disasterOccurred ? Colors.red.withValues(alpha: 0.2) : Colors.green.withValues(alpha: 0.2),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (item.actualValue != null)
                      Text(
                        'Actual measured value: ${item.actualValue!.toStringAsFixed(1)} ${item.unit}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: disasterOccurred ? Colors.red[800] : Colors.green[800],
                        ),
                      ),
                    if (item.outcomeNotes != null && item.outcomeNotes!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          'Notes: ${item.outcomeNotes}',
                          style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Colors.grey[700]),
                        ),
                      ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 8),

            // Timestamp + Confirm Outcome Action
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Created: ${item.createdAt.length > 16 ? item.createdAt.substring(0, 16).replaceAll('T', ' ') : item.createdAt}',
                  style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                ),
                // Only provide Confirm Outcome for DisasterOfficer/Admin when hasOutcome is false
                if (!hasOutcome && isOfficer)
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.indigo[700],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      visualDensity: VisualDensity.compact,
                    ),
                    onPressed: _isProcessingAction ? null : () => _showOutcomeDialog(item),
                    icon: const Icon(Icons.add_task, size: 14),
                    label: const Text('Confirm Outcome'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
