import 'package:equatable/equatable.dart';

class SavedCardEntity extends Equatable {
  final String id;
  final String type;
  final String last4;
  final String cardHolder;
  final String expiryMonth;
  final String expiryYear;
  final bool isDefault;

  const SavedCardEntity({
    required this.id,
    required this.type,
    required this.last4,
    required this.cardHolder,
    required this.expiryMonth,
    required this.expiryYear,
    required this.isDefault,
  });

  String get displayName => '${type.replaceAll('-', ' ')} •••• $last4';

  @override
  List<Object?> get props => [id, type, last4, cardHolder, expiryMonth, expiryYear, isDefault];
}

class SavedAddressEntity extends Equatable {
  final String id;
  final String label;
  final String street;
  final String city;
  final String state;
  final String zipCode;
  final String country;
  final bool isDefault;

  const SavedAddressEntity({
    required this.id,
    required this.label,
    required this.street,
    required this.city,
    required this.state,
    required this.zipCode,
    required this.country,
    required this.isDefault,
  });

  String get displayAddress {
    final parts = [street, city, state, zipCode].where((s) => s.isNotEmpty).toList();
    return parts.join(', ');
  }

  @override
  List<Object?> get props => [id, label, street, city, state, zipCode, country, isDefault];
}

class AddressEntity extends Equatable {
  final String street;
  final String city;
  final String state;
  final String zipCode;
  final String country;

  const AddressEntity({
    required this.street,
    required this.city,
    required this.state,
    required this.zipCode,
    required this.country,
  });

  @override
  List<Object?> get props => [street, city, state, zipCode, country];
}

class UserEntity extends Equatable {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String? avatar;
  final String? phone;
  final AddressEntity? address;
  final List<SavedCardEntity> savedCards;
  final List<SavedAddressEntity> savedAddresses;
  final String createdAt;

  const UserEntity({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.avatar,
    this.phone,
    this.address,
    this.savedCards = const [],
    this.savedAddresses = const [],
    required this.createdAt,
  });

  String get fullName => '$firstName $lastName';
  bool get isSeller => role == 'seller';

  UserEntity copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    String? role,
    String? avatar,
    String? phone,
    AddressEntity? address,
    List<SavedCardEntity>? savedCards,
    List<SavedAddressEntity>? savedAddresses,
    String? createdAt,
  }) => UserEntity(
    id: id ?? this.id,
    email: email ?? this.email,
    firstName: firstName ?? this.firstName,
    lastName: lastName ?? this.lastName,
    role: role ?? this.role,
    avatar: avatar ?? this.avatar,
    phone: phone ?? this.phone,
    address: address ?? this.address,
    savedCards: savedCards ?? this.savedCards,
    savedAddresses: savedAddresses ?? this.savedAddresses,
    createdAt: createdAt ?? this.createdAt,
  );

  @override
  List<Object?> get props => [id, email, firstName, lastName, role, avatar, phone, savedAddresses];
}
