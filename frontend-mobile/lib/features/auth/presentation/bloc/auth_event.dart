import 'package:equatable/equatable.dart';

sealed class AuthEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

final class AuthCheckRequested extends AuthEvent {}

final class AuthLoginRequested extends AuthEvent {
  final String email;
  final String password;

  AuthLoginRequested({required this.email, required this.password});

  @override
  List<Object?> get props => [email, password];
}

final class AuthSignupRequested extends AuthEvent {
  final String email;
  final String password;
  final String firstName;
  final String lastName;

  AuthSignupRequested({
    required this.email,
    required this.password,
    required this.firstName,
    required this.lastName,
  });

  @override
  List<Object?> get props => [email, firstName, lastName];
}

final class AuthLogoutRequested extends AuthEvent {}

final class AuthProfileUpdateRequested extends AuthEvent {
  final Map<String, dynamic> data;
  AuthProfileUpdateRequested(this.data);

  @override
  List<Object?> get props => [data];
}

final class AuthAvatarUploadRequested extends AuthEvent {
  final String filePath;
  AuthAvatarUploadRequested(this.filePath);

  @override
  List<Object?> get props => [filePath];
}
