import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/core/config/api_config.dart';

void main() {
  test('debug keeps the emulator fallback', () {
    expect(resolveApiBaseUrl('', release: false), 'http://10.0.2.2:5000/api');
  });
  test('uses the configured hosted API and normalizes a trailing slash', () {
    expect(resolveApiBaseUrl('https://api.example.com/api/', release: true),
        'https://api.example.com/api');
  });
  test('release rejects missing configuration and insecure URLs', () {
    for (final url in [
      '',
      'http://api.example.com/api',
      'https://localhost/api'
    ]) {
      expect(() => resolveApiBaseUrl(url, release: true), throwsArgumentError);
    }
  });
  test('rejects URLs without the API prefix and URLs containing credentials',
      () {
    for (final url in [
      'https://api.example.com',
      'https://user:pass@api.example.com/api'
    ]) {
      expect(() => resolveApiBaseUrl(url, release: true), throwsArgumentError);
    }
  });
}
