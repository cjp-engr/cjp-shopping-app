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
    required this.createdAt,
  });

  String get fullName => '$firstName $lastName';
  bool get isSeller => role == 'seller';

  @override
  List<Object?> get props => [id, email, firstName, lastName, role, avatar, phone];
}
