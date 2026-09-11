class AuthUser {
  final String id;
  final String email;
  final String fullName;
  final String role;
  final String? district;
  final String? phoneNumber;
  final String? createdAt;

  const AuthUser({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.district,
    this.phoneNumber,
    this.createdAt,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        email: json['email'] as String,
        fullName: json['fullName'] as String,
        role: json['role'] as String,
        district: json['district'] as String?,
        phoneNumber: json['phoneNumber'] as String?,
        createdAt: json['createdAt'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'fullName': fullName,
        'role': role,
        'district': district,
        'phoneNumber': phoneNumber,
        'createdAt': createdAt,
      };

  bool get isOfficerOrAdmin => role == 'DisasterOfficer' || role == 'Admin';
}

class AuthResponse {
  final String token;
  final AuthUser user;

  const AuthResponse({
    required this.token,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) => AuthResponse(
        token: json['token'] as String,
        user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
      );
}
