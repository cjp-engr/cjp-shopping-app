import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

class ThemeCubit extends Cubit<ThemeMode> {
  ThemeCubit() : super(ThemeMode.light);

  void toggle() => emit(state == ThemeMode.light ? ThemeMode.dark : ThemeMode.light);

  void setMode(ThemeMode mode) => emit(mode);
}
