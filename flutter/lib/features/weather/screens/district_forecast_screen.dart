import 'package:flutter/material.dart';
import '../models/weather_models.dart';
import '../services/weather_service.dart';

class DistrictForecastScreen extends StatefulWidget {
  final District district;

  const DistrictForecastScreen({Key? key, required this.district}) : super(key: key);

  @override
  State<DistrictForecastScreen> createState() => _DistrictForecastScreenState();
}

class _DistrictForecastScreenState extends State<DistrictForecastScreen> {
  final WeatherService _weatherService = WeatherService();

  ForecastResponse? _forecast;
  PredictResponse? _prediction;
  bool _isLoadingForecast = true;
  bool _isRunningPrediction = false;
  String? _forecastError;
  String? _predictionError;

  @override
  void initState() {
    super.initState();
    _loadForecast();
  }

  Future<void> _loadForecast() async {
    setState(() {
      _isLoadingForecast = true;
      _forecastError = null;
    });

    try {
      final data = await _weatherService.fetchForecast(widget.district.id);
      setState(() {
        _forecast = data;
        _isLoadingForecast = false;
      });
    } catch (e) {
      setState(() {
        _forecastError = e.toString();
        _isLoadingForecast = false;
      });
    }
  }

  Future<void> _runAgentPrediction() async {
    setState(() {
      _isRunningPrediction = true;
      _predictionError = null;
    });

    try {
      final res = await _weatherService.runPrediction(widget.district.id);
      setState(() {
        _prediction = res;
        _isRunningPrediction = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Agent evaluation complete for ${widget.district.name}!'),
            backgroundColor: Colors.green[700],
          ),
        );
      }
    } catch (e) {
      setState(() {
        _predictionError = e.toString();
        _isRunningPrediction = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.district.name),
        backgroundColor: Colors.blue[800],
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoadingForecast ? null : _loadForecast,
          ),
        ],
      ),
      body: _isLoadingForecast
          ? const Center(child: CircularProgressIndicator())
          : _forecastError != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: Colors.red),
                        const SizedBox(height: 12),
                        Text('Failed to load forecast', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey[800])),
                        const SizedBox(height: 6),
                        Text(_forecastError!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: _loadForecast, child: const Text('Try Again')),
                      ],
                    ),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  children: [
                    // District Info Card
                    _buildDistrictHeader(),
                    const SizedBox(height: 16),

                    // Live 3-Day Forecast Section
                    _buildForecastSection(),
                    const SizedBox(height: 16),

                    // Historical Thresholds Section
                    _buildThresholdsSection(),
                    const SizedBox(height: 20),

                    // Run AI Prediction Button
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.indigo[700],
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 2,
                        ),
                        onPressed: _isRunningPrediction ? null : _runAgentPrediction,
                        icon: _isRunningPrediction
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Icon(Icons.psychology_outlined, size: 24),
                        label: Text(
                          _isRunningPrediction ? 'Agent Reasoning...' : 'Run Agentic AI Hazard Assessment',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),

                    if (_predictionError != null) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red[50],
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red[200]!),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: Colors.red, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _predictionError!,
                                style: TextStyle(color: Colors.red[800], fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    // Prediction Results Display
                    if (_prediction != null) ...[
                      const SizedBox(height: 20),
                      _buildPredictionResultsCard(),
                    ],
                  ],
                ),
    );
  }

  Widget _buildDistrictHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                widget.district.name,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              if (widget.district.isLandslideProne)
                Chip(
                  avatar: const Text('⛰️', style: TextStyle(fontSize: 12)),
                  label: const Text('Landslide Prone', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  backgroundColor: Colors.orange[50],
                  labelStyle: TextStyle(color: Colors.orange[900]),
                  padding: EdgeInsets.zero,
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${widget.district.province} Province • Latitude: ${widget.district.latitude.toStringAsFixed(3)}°, Longitude: ${widget.district.longitude.toStringAsFixed(3)}°',
            style: TextStyle(color: Colors.grey[600], fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildForecastSection() {
    final rain = _forecast?.rainfallMmNext3Days ?? [0, 0, 0];
    final wind = _forecast?.windSpeedKmhNext3Days ?? [0, 0, 0];
    final rainTotal = rain.fold<double>(0.0, (sum, item) => sum + item);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Live 3-Day Forecast (Open-Meteo)',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              Text(
                '3-Day Rain: ${rainTotal.toStringAsFixed(1)} mm',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.blue[700]),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              for (int i = 0; i < 3; i++)
                Expanded(
                  child: Container(
                    margin: EdgeInsets.only(right: i < 2 ? 8 : 0),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.blue[50]?.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.blue[100]!),
                    ),
                    child: Column(
                      children: [
                        Text('Day ${i + 1}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.water_drop, size: 14, color: Colors.blue),
                            const SizedBox(width: 2),
                            Text(
                              '${rain.length > i ? rain[i].toStringAsFixed(1) : "0"} mm',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.air, size: 14, color: Colors.teal),
                            const SizedBox(width: 2),
                            Text(
                              '${wind.length > i ? wind[i].toStringAsFixed(0) : "0"} km/h',
                              style: const TextStyle(fontSize: 12, color: Colors.black87),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildThresholdsSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Historical Threshold Baseline',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildThresholdItem(
                'Flood Threshold',
                '${_forecast?.floodThresholdMm?.toStringAsFixed(0) ?? "N/A"} mm',
                Icons.flood_outlined,
                Colors.blue,
              ),
              _buildThresholdItem(
                'Landslide Thresh.',
                _forecast?.landslideThresholdMm != null
                    ? '${_forecast!.landslideThresholdMm!.toStringAsFixed(0)} mm'
                    : 'N/A',
                Icons.landscape_outlined,
                Colors.brown,
              ),
              _buildThresholdItem(
                'High Wind Thresh.',
                '${_forecast?.highWindThresholdKmh?.toStringAsFixed(0) ?? "N/A"} km/h',
                Icons.wind_power_outlined,
                Colors.teal,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildThresholdItem(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
      ],
    );
  }

  Widget _buildPredictionResultsCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.indigo[100]!),
        boxShadow: [
          BoxShadow(color: Colors.indigo.withOpacity(0.08), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.auto_awesome, color: Colors.indigo, size: 20),
                  SizedBox(width: 8),
                  Text('AI Hazard Evaluation', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Run: ${_prediction!.agentRunId.substring(0, 8)}...',
                  style: TextStyle(fontSize: 11, color: Colors.grey[600], fontFamily: 'monospace'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          for (final res in _prediction!.results) ...[
            _buildHazardResultRow(res),
            const SizedBox(height: 10),
          ],
        ],
      ),
    );
  }

  Widget _buildHazardResultRow(HazardResult res) {
    Color statusColor;
    switch (res.alertStatus) {
      case 'Published':
        statusColor = Colors.red[600]!;
        break;
      case 'PendingReview':
        statusColor = Colors.orange[700]!;
        break;
      case 'SkippedDuplicate':
        statusColor = Colors.blue[600]!;
        break;
      default:
        statusColor = Colors.green[600]!;
        break;
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                res.hazardType,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const SizedBox(height: 2),
              Text(
                'Risk Probability: ${res.riskProbabilityPct.toStringAsFixed(1)}%',
                style: TextStyle(color: Colors.grey[700], fontSize: 12),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              res.alertStatus,
              style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
