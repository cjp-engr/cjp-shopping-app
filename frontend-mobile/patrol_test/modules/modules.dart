import 'package:patrol/patrol.dart';

import 'auth.dart';
import 'seller.dart';

final class Modules {
  Modules(this._$);
  final PatrolIntegrationTester _$;

  late final auth = Auth(_$);
  late final seller = Seller(_$);
}
