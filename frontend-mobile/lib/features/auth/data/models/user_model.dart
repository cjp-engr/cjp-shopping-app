import '../../domain/entities/user_entity.dart';

class AddressModel extends AddressEntity {
  const AddressModel({
    required super.street,
    required super.city,
    required super.state,
    required super.zipCode,
    required super.country,
  });

  factory AddressModel.fromJson(Map<String, dynamic> json) => AddressModel(
        street: json['street'] ?? '',
        city: json['city'] ?? '',
        state: json['state'] ?? '',
        zipCode: json['zipCode'] ?? '',
        country: json['country'] ?? '',
      );
}

class UserModel extends UserEntity {
  const UserModel({
    required super.id,
    required super.email,
    required super.firstName,
    required super.lastName,
    required super.role,
    super.avatar,
    super.phone,
    super.address,
    required super.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    AddressEntity? address;
    if (json['address'] != null) {
      address = AddressModel.fromJson(json['address'] as Map<String, dynamic>);
    }
    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      role: json['role'] ?? 'buyer',
      avatar: json['avatar'],
      phone: json['phone'],
      address: address,
      createdAt: json['createdAt'] ?? '',
    );
  }
}
