import 'package:patrol/patrol.dart';

import 'auth.dart';

final class Modules {
  Modules(this._$);
  final PatrolIntegrationTester _$;

  late final auth = Auth(_$);
}
