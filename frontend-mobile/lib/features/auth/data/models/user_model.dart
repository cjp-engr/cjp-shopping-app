import '../../domain/entities/user_entity.dart';

class SavedCardModel extends SavedCardEntity {
  const SavedCardModel({
    required super.id,
    required super.type,
    required super.last4,
    required super.cardHolder,
    required super.expiryMonth,
    required super.expiryYear,
    required super.isDefault,
  });

  factory SavedCardModel.fromJson(Map<String, dynamic> json) => SavedCardModel(
        id: json['_id']?.toString() ?? '',
        type: json['type'] ?? 'credit-card',
        last4: json['last4'] ?? '',
        cardHolder: json['cardHolder'] ?? '',
        expiryMonth: json['expiryMonth'] ?? '',
        expiryYear: json['expiryYear'] ?? '',
        isDefault: json['isDefault'] == true,
      );

  Map<String, dynamic> toJson() => {
        '_id': id,
        'type': type,
        'last4': last4,
        'cardHolder': cardHolder,
        'expiryMonth': expiryMonth,
        'expiryYear': expiryYear,
        'isDefault': isDefault,
      };
}

class SavedAddressModel extends SavedAddressEntity {
  const SavedAddressModel({
    required super.id,
    required super.label,
    required super.street,
    required super.city,
    required super.state,
    required super.zipCode,
    required super.country,
    required super.isDefault,
  });

  factory SavedAddressModel.fromJson(Map<String, dynamic> json) => SavedAddressModel(
    id: json['_id']?.toString() ?? '',
    label: json['label'] ?? 'Home',
    street: json['street'] ?? '',
    city: json['city'] ?? '',
    state: json['state'] ?? '',
    zipCode: json['zipCode'] ?? '',
    country: json['country'] ?? '',
    isDefault: json['isDefault'] == true,
  );
}

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
    super.savedCards = const [],
    super.savedAddresses = const [],
    required super.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    AddressEntity? address;
    if (json['address'] != null) {
      address = AddressModel.fromJson(json['address'] as Map<String, dynamic>);
    }
    final rawCards = json['savedCards'];
    final savedCards = rawCards is List
        ? rawCards.map((c) => SavedCardModel.fromJson(c as Map<String, dynamic>)).toList()
        : <SavedCardEntity>[];

    final rawAddrs = json['savedAddresses'];
    final savedAddresses = rawAddrs is List
        ? rawAddrs.map((a) => SavedAddressModel.fromJson(a as Map<String, dynamic>)).toList()
        : <SavedAddressEntity>[];

    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      role: json['role'] ?? 'buyer',
      avatar: json['avatar'],
      phone: json['phone'],
      address: address,
      savedCards: savedCards,
      savedAddresses: savedAddresses,
      createdAt: json['createdAt'] ?? '',
    );
  }
}
