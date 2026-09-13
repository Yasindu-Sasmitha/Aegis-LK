class ShelterModel {
  final String id;
  final String name;
  final String location;
  final String district;
  final double latitude;
  final double longitude;
  final int capacity;
  final int currentOccupancy;
  final String status;
  final String contactPerson;
  final String contactPhone;
  final String facilities;

  ShelterModel({
    required this.id,
    required this.name,
    required this.location,
    required this.district,
    required this.latitude,
    required this.longitude,
    required this.capacity,
    required this.currentOccupancy,
    required this.status,
    required this.contactPerson,
    required this.contactPhone,
    required this.facilities,
  });

  factory ShelterModel.fromJson(Map<String, dynamic> json) {
    return ShelterModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      location: json['location'] ?? '',
      district: json['district'] ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      capacity: json['capacity'] ?? 0,
      currentOccupancy: json['currentOccupancy'] ?? 0,
      status: json['status'] ?? 'Active',
      contactPerson: json['contactPerson'] ?? '',
      contactPhone: json['contactPhone'] ?? '',
      facilities: json['facilities'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'location': location,
        'district': district,
        'latitude': latitude,
        'longitude': longitude,
        'capacity': capacity,
        'contactPerson': contactPerson,
        'contactPhone': contactPhone,
        'facilities': facilities,
      };
}

class AidRequestModel {
  final String id;
  final String victimName;
  final String contactPhone;
  final String district;
  final String aidType;
  final int familySize;
  final String urgency;
  final String status;
  final String? shelterName;
  final String notes;
  final String createdAt;

  AidRequestModel({
    required this.id,
    required this.victimName,
    required this.contactPhone,
    required this.district,
    required this.aidType,
    required this.familySize,
    required this.urgency,
    required this.status,
    this.shelterName,
    required this.notes,
    required this.createdAt,
  });

  factory AidRequestModel.fromJson(Map<String, dynamic> json) {
    return AidRequestModel(
      id: json['id'] ?? '',
      victimName: json['victimName'] ?? '',
      contactPhone: json['contactPhone'] ?? '',
      district: json['district'] ?? '',
      aidType: json['aidType'] ?? 'Shelter',
      familySize: json['familySize'] ?? 1,
      urgency: json['urgency'] ?? 'Medium',
      status: json['status'] ?? 'Pending',
      shelterName: json['shelterName'],
      notes: json['notes'] ?? '',
      createdAt: json['createdAt'] ?? '',
    );
  }
}

class InfrastructureDamageItem {
  final String assetName;
  final String assetType;
  final String damageLevel;
  final double estimatedCost;
  final String? description;

  InfrastructureDamageItem({
    required this.assetName,
    required this.assetType,
    required this.damageLevel,
    required this.estimatedCost,
    this.description,
  });

  Map<String, dynamic> toJson() => {
        'assetName': assetName,
        'assetType': assetType,
        'damageLevel': damageLevel,
        'estimatedCost': estimatedCost,
        'description': description ?? '',
      };
}

class DamageIntakeModel {
  final String district;
  final String disasterType;
  final String location;
  final int housesDamaged;
  final int displacedFamilies;
  final String reportedBy;
  final String reporterContact;
  final String? notes;
  final List<InfrastructureDamageItem> infrastructureDamage;

  DamageIntakeModel({
    required this.district,
    required this.disasterType,
    required this.location,
    required this.housesDamaged,
    required this.displacedFamilies,
    required this.reportedBy,
    required this.reporterContact,
    this.notes,
    required this.infrastructureDamage,
  });

  Map<String, dynamic> toJson() => {
        'district': district,
        'disasterType': disasterType,
        'location': location,
        'housesDamaged': housesDamaged,
        'displacedFamilies': displacedFamilies,
        'reportedBy': reportedBy,
        'reporterContact': reporterContact,
        'notes': notes,
        'infrastructureDamage': infrastructureDamage.map((e) => e.toJson()).toList(),
      };
}
