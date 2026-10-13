import 'package:flutter/foundation.dart';

class ApiConfig {
  static String get baseUrl => resolveApiBaseUrl(
        const String.fromEnvironment('API_BASE_URL'),
        release: kReleaseMode,
      );
}

String resolveApiBaseUrl(String configured, {required bool release}) {
  final value = configured.trim();
  if (value.isEmpty) {
    if (release) {
      throw ArgumentError(
          'Release builds require --dart-define=API_BASE_URL=https://your-host/api');
    }
    return 'http://10.0.2.2:5000/api';
  }
  final uri = Uri.tryParse(value);
  if (uri == null ||
      !['http', 'https'].contains(uri.scheme) ||
      uri.host.isEmpty ||
      uri.userInfo.isNotEmpty ||
      uri.hasQuery ||
      uri.hasFragment ||
      !['/api', '/api/'].contains(uri.path)) {
    throw ArgumentError(
        'API_BASE_URL must be an HTTP(S) URL ending in /api without credentials, query, or fragment');
  }
  if (release &&
      (uri.scheme != 'https' ||
          ['localhost', '127.0.0.1', '::1', '10.0.2.2']
              .contains(uri.host.toLowerCase()))) {
    throw ArgumentError('Release builds require a hosted HTTPS API_BASE_URL');
  }
  return uri.replace(path: '/api').toString();
}
