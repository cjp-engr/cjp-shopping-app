import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';
import '../bloc/auth_state.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    context.read<AuthBloc>().add(AuthLoginRequested(
          email: _emailCtrl.text.trim(),
          password: _passwordCtrl.text,
        ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocListener<AuthBloc, AuthState>(
        listenWhen: (prev, curr) => prev.status != curr.status,
        listener: (context, state) {
          if (state.status == AuthStatus.failure) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage ?? AppStrings.genericError),
                backgroundColor: AppColors.danger,
              ),
            );
          }
        },
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSizes.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: AppSizes.xxl),
                // Header
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius:
                        BorderRadius.circular(AppSizes.radiusMd),
                  ),
                  child: const Icon(Icons.shopping_bag,
                      color: Colors.white, size: 32),
                ),
                const SizedBox(height: AppSizes.lg),
                Text(
                  'Welcome back',
                  style: Theme.of(context)
                      .textTheme
                      .headlineMedium
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: AppSizes.xs),
                const Text(
                  'Sign in to your ShopHub account',
                  style: TextStyle(
                      color: AppColors.textSecondary, fontSize: 15),
                ),
                const SizedBox(height: AppSizes.xl),
                // Form
                Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      AppTextField(
                        label: AppStrings.email,
                        controller: _emailCtrl,
                        keyboardType: TextInputType.emailAddress,
                        prefixIcon: Icons.email_outlined,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            return 'Email is required';
                          }
                          if (!v.contains('@')) return 'Enter a valid email';
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSizes.md),
                      AppTextField(
                        label: AppStrings.password,
                        controller: _passwordCtrl,
                        obscure: true,
                        prefixIcon: Icons.lock_outline,
                        validator: (v) {
                          if (v == null || v.isEmpty) {
                            return 'Password is required';
                          }
                          if (v.length < 6) {
                            return 'Password must be at least 6 characters';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSizes.xl),
                      BlocBuilder<AuthBloc, AuthState>(
                        buildWhen: (p, c) => p.status != c.status,
                        builder: (context, state) {
                          return AppButton(
                            label: AppStrings.login,
                            loading: state.status == AuthStatus.loading,
                            onPressed: _submit,
                          );
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSizes.lg),
                Center(
                  child: TextButton(
                    onPressed: () => context.push('/signup'),
                    child: const Text(AppStrings.noAccount),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
