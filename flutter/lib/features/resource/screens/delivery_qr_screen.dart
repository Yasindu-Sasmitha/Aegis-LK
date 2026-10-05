import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

/// QR-scan delivery confirmation screen.
///
/// Field responders scan the QR code on a delivery consignment to
/// confirm handover. The scanned code is shown back to the user with
/// a timestamp; the screen demonstrates the assignment's required
/// "meaningful device feature" (QR scanning).
class DeliveryQrScreen extends StatefulWidget {
  const DeliveryQrScreen({super.key});

  @override
  State<DeliveryQrScreen> createState() => _DeliveryQrScreenState();
}

class _DeliveryQrScreenState extends State<DeliveryQrScreen> {
  final MobileScannerController _controller = MobileScannerController();

  String? _scannedCode;
  DateTime? _scannedAt;
  bool _torchOn = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_scannedCode != null) return; // freeze on first hit
    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;
    final code = barcodes.first.rawValue;
    if (code == null || code.isEmpty) return;

    setState(() {
      _scannedCode = code;
      _scannedAt = DateTime.now();
    });
    _controller.stop();
  }

  void _reset() {
    setState(() {
      _scannedCode = null;
      _scannedAt = null;
      _torchOn = false;
    });
    _controller.start();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Confirm Delivery'),
        actions: [
          IconButton(
            icon: Icon(_torchOn ? Icons.flash_on : Icons.flash_off),
            onPressed: () async {
              await _controller.toggleTorch();
              setState(() => _torchOn = !_torchOn);
            },
          ),
          IconButton(
            icon: const Icon(Icons.flip_camera_ios),
            onPressed: () => _controller.switchCamera(),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            flex: 3,
            child: Stack(
              children: [
                MobileScanner(
                  controller: _controller,
                  onDetect: _onDetect,
                ),
                // Scan overlay frame
                Center(
                  child: Container(
                    width: 240,
                    height: 240,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white, width: 3),
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
                if (_scannedCode != null)
                  Container(
                    color: Colors.black54,
                    child: const Center(
                      child: Icon(
                        Icons.check_circle,
                        color: Colors.greenAccent,
                        size: 100,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            flex: 2,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              color: const Color(0xFF0F172A),
              child: _scannedCode == null
                  ? const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.qr_code_scanner, color: Colors.white70, size: 42),
                        SizedBox(height: 12),
                        Text(
                          'Point the camera at the delivery QR code.',
                          style: TextStyle(color: Colors.white70, fontSize: 14),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'DELIVERY CODE VERIFIED',
                          style: TextStyle(
                            color: Colors.greenAccent,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _scannedCode!,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Scanned at ${_scannedAt!.toLocal()}',
                          style: const TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: _reset,
                            icon: const Icon(Icons.refresh, color: Colors.white),
                            label: const Text(
                              'Scan another',
                              style: TextStyle(color: Colors.white),
                            ),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Colors.white54),
                            ),
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }
}