import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';

class VoucherModel {
  final String id;
  final String code;
  final String sellerId;
  final String discountType; // 'percentage' | 'fixed'
  final double discountValue;
  final double? maxDiscount;
  final double minOrderAmount;
  final String? expiresAt;
  final int? usageLimit;
  final int usedCount;
  final bool isActive;
  final String? description;

  const VoucherModel({
    required this.id,
    required this.code,
    required this.sellerId,
    required this.discountType,
    required this.discountValue,
    this.maxDiscount,
    required this.minOrderAmount,
    this.expiresAt,
    this.usageLimit,
    required this.usedCount,
    required this.isActive,
    this.description,
  });

  factory VoucherModel.fromJson(Map<String, dynamic> j) => VoucherModel(
        id: j['_id'] ?? j['id'] ?? '',
        code: j['code'] ?? '',
        sellerId: (j['sellerId'] is Map ? j['sellerId']['_id'] : j['sellerId']) ?? '',
        discountType: j['discountType'] ?? 'percentage',
        discountValue: (j['discountValue'] as num?)?.toDouble() ?? 0,
        maxDiscount: (j['maxDiscount'] as num?)?.toDouble(),
        minOrderAmount: (j['minOrderAmount'] as num?)?.toDouble() ?? 0,
        expiresAt: j['expiresAt'] as String?,
        usageLimit: j['usageLimit'] as int?,
        usedCount: (j['usedCount'] as num?)?.toInt() ?? 0,
        isActive: j['isActive'] as bool? ?? true,
        description: j['description'] as String?,
      );

  String get discountLabel {
    if (discountType == 'percentage') {
      final base = '${discountValue.toStringAsFixed(0)}% off';
      return maxDiscount != null ? '$base (max \$${maxDiscount!.toStringAsFixed(2)})' : base;
    }
    return '\$${discountValue.toStringAsFixed(2)} off';
  }

  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.tryParse(expiresAt!)?.isBefore(DateTime.now()) ?? false;
  }

  int? get daysLeft {
    if (expiresAt == null) return null;
    final exp = DateTime.tryParse(expiresAt!);
    if (exp == null) return null;
    return exp.difference(DateTime.now()).inDays;
  }
}

class ValidateResult {
  final VoucherModel coupon;
  final double discountAmount;
  const ValidateResult({required this.coupon, required this.discountAmount});
}

class VoucherRepository {
  final Dio _dio;
  VoucherRepository(ApiClient client) : _dio = client.dio;

  Future<List<VoucherModel>> getAvailable(String sellerId, double orderAmount) async {
    try {
      final res = await _dio.get('/coupons', queryParameters: {
        'sellerId': sellerId,
        'orderAmount': orderAmount,
      });
      final list = (res.data['coupons'] as List?) ?? [];
      return list.map((e) => VoucherModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<ValidateResult> validate(String code, String sellerId, double orderAmount) async {
    final res = await _dio.post('/coupons/validate', data: {
      'code': code,
      'sellerId': sellerId,
      'orderAmount': orderAmount,
    });
    if (res.data['success'] != true) {
      throw Exception(res.data['message'] ?? 'Invalid voucher');
    }
    return ValidateResult(
      coupon: VoucherModel.fromJson(res.data['coupon'] as Map<String, dynamic>),
      discountAmount: (res.data['discountAmount'] as num).toDouble(),
    );
  }

  // Seller CRUD
  Future<List<VoucherModel>> listMine() async {
    try {
      final res = await _dio.get('/coupons/seller');
      final list = (res.data['coupons'] as List?) ?? [];
      return list.map((e) => VoucherModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<VoucherModel> create(Map<String, dynamic> data) async {
    final res = await _dio.post('/coupons/seller', data: data);
    if (res.data['success'] != true) throw Exception(res.data['message'] ?? 'Failed');
    return VoucherModel.fromJson(res.data['coupon'] as Map<String, dynamic>);
  }

  Future<VoucherModel> update(String id, Map<String, dynamic> data) async {
    final res = await _dio.put('/coupons/seller/$id', data: data);
    if (res.data['success'] != true) throw Exception(res.data['message'] ?? 'Failed');
    return VoucherModel.fromJson(res.data['coupon'] as Map<String, dynamic>);
  }

  Future<void> delete(String id) async {
    final res = await _dio.delete('/coupons/seller/$id');
    if (res.data['success'] != true) throw Exception(res.data['message'] ?? 'Failed');
  }
}
