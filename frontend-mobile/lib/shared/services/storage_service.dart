import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const _tokenKey = 'auth_token';
  static const _userIdKey = 'user_id';

  final SharedPreferences _prefs;

  StorageService(this._prefs);

  static Future<StorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    return StorageService(prefs);
  }

  Future<void> saveToken(String token) => _prefs.setString(_tokenKey, token);
  Future<String?> getToken() async => _prefs.getString(_tokenKey);
  Future<void> saveUserId(String id) => _prefs.setString(_userIdKey, id);
  Future<String?> getUserId() async => _prefs.getString(_userIdKey);

  Future<void> clear() async {
    await _prefs.remove(_tokenKey);
    await _prefs.remove(_userIdKey);
  }
}
