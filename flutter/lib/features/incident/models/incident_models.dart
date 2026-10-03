class MyIncidentReportModel {
  final String id;
  final String disasterType;
  final String description;
  final String severityReported;
  final String? photoUrl;
  final String displayStatus;
  final DateTime createdAt;

  MyIncidentReportModel({
    required this.id,
    required this.disasterType,
    required this.description,
    required this.severityReported,
    required this.photoUrl,
    required this.displayStatus,
    required this.createdAt,
  });

  factory MyIncidentReportModel.fromJson(Map<String, dynamic> json) {
    return MyIncidentReportModel(
      id: json['id'] as String,
      disasterType: json['disasterType'] as String? ?? '',
      description: json['description'] as String? ?? '',
      severityReported: json['severityReported'] as String? ?? '',
      photoUrl: json['photoUrl'] as String?,
      displayStatus: json['displayStatus'] as String? ?? 'Reported',
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  /// True when the Dedup Agent linked this report to an existing one.
  bool get isMerged => displayStatus.startsWith('Confirmed');
}

class CreatedIncidentModel {
  final String id;
  CreatedIncidentModel({required this.id});

  factory CreatedIncidentModel.fromJson(Map<String, dynamic> json) {
    return CreatedIncidentModel(id: json['id'] as String);
  }
}