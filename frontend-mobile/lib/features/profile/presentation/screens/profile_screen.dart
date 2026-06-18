import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../auth/presentation/bloc/auth_event.dart';
import '../../../auth/presentation/bloc/auth_state.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _firstCtrl;
  late final TextEditingController _lastCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _streetCtrl;
  late final TextEditingController _cityCtrl;
  late final TextEditingController _stateCtrl;
  late final TextEditingController _zipCtrl;
  late final TextEditingController _countryCtrl;
  bool _isEditing = false;
  bool _uploadingPhoto = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthBloc>().state.user;
    _firstCtrl = TextEditingController(text: user?.firstName ?? '');
    _lastCtrl = TextEditingController(text: user?.lastName ?? '');
    _phoneCtrl = TextEditingController(text: user?.phone ?? '');
    _streetCtrl = TextEditingController(text: user?.address?.street ?? '');
    _cityCtrl = TextEditingController(text: user?.address?.city ?? '');
    _stateCtrl = TextEditingController(text: user?.address?.state ?? '');
    _zipCtrl = TextEditingController(text: user?.address?.zipCode ?? '');
    _countryCtrl = TextEditingController(text: user?.address?.country ?? '');
  }

  @override
  void dispose() {
    _firstCtrl.dispose();
    _lastCtrl.dispose();
    _phoneCtrl.dispose();
    _streetCtrl.dispose();
    _cityCtrl.dispose();
    _stateCtrl.dispose();
    _zipCtrl.dispose();
    _countryCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    try {
      final image = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 75,
      );
      if (image == null || !mounted) return;

      setState(() => _uploadingPhoto = true);
      final bytes = await image.readAsBytes();
      final base64Avatar =
          'data:image/jpeg;base64,${base64Encode(bytes)}';

      if (mounted) {
        context.read<AuthBloc>().add(
              AuthProfileUpdateRequested({'avatar': base64Avatar}),
            );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not pick image')),
        );
        setState(() => _uploadingPhoto = false);
      }
    }
  }

  void _confirmBecomeSeller(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Become a Seller'),
        content: const Text(
          'You\'ll be able to list products and sell on TokoMart. Continue?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              context
                  .read<AuthBloc>()
                  .add(AuthProfileUpdateRequested(const {'role': 'seller'}));
            },
            child: const Text('Continue'),
          ),
        ],
      ),
    );
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;

    final addressData = {
      'street': _streetCtrl.text.trim(),
      'city': _cityCtrl.text.trim(),
      'state': _stateCtrl.text.trim(),
      'zipCode': _zipCtrl.text.trim(),
      'country': _countryCtrl.text.trim(),
    };
    final hasAddress =
        addressData.values.any((v) => v.isNotEmpty);

    context.read<AuthBloc>().add(AuthProfileUpdateRequested({
          'firstName': _firstCtrl.text.trim(),
          'lastName': _lastCtrl.text.trim(),
          'phone': _phoneCtrl.text.trim(),
          if (hasAddress) 'address': addressData,
        }));
    setState(() => _isEditing = false);
  }

  Widget _buildAvatar(String? avatar, String firstName) {
    if (avatar != null &&
        avatar.isNotEmpty &&
        avatar.startsWith('data:image')) {
      // base64 data URI — use Image.memory
      try {
        final b64 =
            avatar.contains(',') ? avatar.split(',')[1] : avatar;
        final bytes = base64Decode(b64);
        return Image.memory(
          bytes,
          width: 96,
          height: 96,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _avatarFallback(firstName),
        );
      } catch (_) {
        return _avatarFallback(firstName);
      }
    }

    if (avatar != null && avatar.isNotEmpty) {
      return Image.network(
        avatar,
        width: 96,
        height: 96,
        fit: BoxFit.cover,
        loadingBuilder: (_, child, p) =>
            p == null ? child : _avatarFallback(firstName),
        errorBuilder: (_, __, ___) => _avatarFallback(firstName),
      );
    }

    return _avatarFallback(firstName);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(AppStrings.profile),
        actions: [
          if (!_isEditing)
            TextButton(
              onPressed: () => setState(() => _isEditing = true),
              child: const Text(AppStrings.editProfile),
            )
          else
            TextButton(
              onPressed: () => setState(() => _isEditing = false),
              child: const Text('Cancel'),
            ),
        ],
      ),
      body: BlocConsumer<AuthBloc, AuthState>(
        listenWhen: (p, c) => p.status != c.status,
        listener: (context, state) {
          if (state.status == AuthStatus.failure) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content:
                    Text(state.errorMessage ?? AppStrings.genericError),
                backgroundColor: AppColors.danger,
              ),
            );
          }
          if (state.status == AuthStatus.authenticated) {
            setState(() => _uploadingPhoto = false);
          }
        },
        builder: (context, state) {
          final user = state.user;
          if (user == null) return const SizedBox.shrink();

          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppSizes.lg),
            child: Column(
              children: [
                // Avatar with camera button
                Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withAlpha(26),
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: AppColors.primary.withAlpha(77),
                            width: 3),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: _uploadingPhoto
                          ? const Center(
                              child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.primary),
                            )
                          : _buildAvatar(user.avatar, user.firstName),
                    ),
                    GestureDetector(
                      onTap: _uploadingPhoto ? null : _pickPhoto,
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                          border: Border.all(
                              color: Colors.white, width: 2),
                        ),
                        child: const Icon(Icons.camera_alt,
                            size: 14, color: Colors.white),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSizes.sm),
                Text(
                  user.fullName,
                  style: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.w800),
                ),
                Text(
                  user.email,
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 14),
                ),
                Container(
                  margin: const EdgeInsets.only(top: AppSizes.xs),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: user.isSeller
                        ? AppColors.primary.withAlpha(26)
                        : AppColors.success.withAlpha(26),
                    borderRadius:
                        BorderRadius.circular(AppSizes.radiusFull),
                  ),
                  child: Text(
                    user.role.toUpperCase(),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: user.isSeller
                          ? AppColors.primary
                          : AppColors.success,
                    ),
                  ),
                ),
                const SizedBox(height: AppSizes.xl),

                if (_isEditing)
                  Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _SectionLabel('Personal Details'),
                        Row(
                          children: [
                            Expanded(
                              child: AppTextField(
                                label: AppStrings.firstName,
                                controller: _firstCtrl,
                                validator: (v) =>
                                    v == null || v.trim().isEmpty
                                        ? 'Required'
                                        : null,
                              ),
                            ),
                            const SizedBox(width: AppSizes.sm),
                            Expanded(
                              child: AppTextField(
                                label: AppStrings.lastName,
                                controller: _lastCtrl,
                                validator: (v) =>
                                    v == null || v.trim().isEmpty
                                        ? 'Required'
                                        : null,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSizes.sm),
                        AppTextField(
                          label: 'Phone',
                          controller: _phoneCtrl,
                          keyboardType: TextInputType.phone,
                          prefixIcon: Icons.phone_outlined,
                        ),
                        const SizedBox(height: AppSizes.md),

                        const _SectionLabel('Address'),
                        AppTextField(
                          label: 'Street',
                          controller: _streetCtrl,
                          prefixIcon: Icons.location_on_outlined,
                        ),
                        const SizedBox(height: AppSizes.sm),
                        Row(
                          children: [
                            Expanded(
                              child: AppTextField(
                                label: 'City',
                                controller: _cityCtrl,
                              ),
                            ),
                            const SizedBox(width: AppSizes.sm),
                            Expanded(
                              child: AppTextField(
                                label: 'State',
                                controller: _stateCtrl,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSizes.sm),
                        Row(
                          children: [
                            Expanded(
                              child: AppTextField(
                                label: 'ZIP Code',
                                controller: _zipCtrl,
                                keyboardType: TextInputType.number,
                              ),
                            ),
                            const SizedBox(width: AppSizes.sm),
                            Expanded(
                              child: AppTextField(
                                label: 'Country',
                                controller: _countryCtrl,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSizes.lg),
                        BlocBuilder<AuthBloc, AuthState>(
                          buildWhen: (p, c) => p.status != c.status,
                          builder: (context, s) => AppButton(
                            label: AppStrings.saveChanges,
                            loading: s.status == AuthStatus.loading,
                            onPressed: _save,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(bottom: AppSizes.sm),
                        child: Text(
                          'Personal Information',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textSecondary,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      _InfoTile(Icons.person_outlined, 'First Name',
                          user.firstName.isNotEmpty
                              ? user.firstName
                              : '—'),
                      _InfoTile(Icons.person_outlined, 'Last Name',
                          user.lastName.isNotEmpty ? user.lastName : '—'),
                      _InfoTile(
                          Icons.email_outlined, 'Email', user.email),
                      _InfoTile(
                        Icons.phone_outlined,
                        'Phone',
                        (user.phone != null && user.phone!.isNotEmpty)
                            ? user.phone!
                            : '—',
                      ),
                      _InfoTile(
                        Icons.location_on_outlined,
                        'Address',
                        user.address != null
                            ? [
                                user.address!.street,
                                user.address!.city,
                                user.address!.state,
                                user.address!.zipCode,
                                user.address!.country,
                              ].where((s) => s.isNotEmpty).join(', ')
                            : '—',
                      ),
                      const SizedBox(height: AppSizes.xl),
                      if (user.isSeller)
                        _ActionTile(
                          icon: Icons.storefront_outlined,
                          label: 'My Shop',
                          onTap: () => context.go('/seller'),
                        )
                      else
                        _ActionTile(
                          icon: Icons.storefront_outlined,
                          label: 'Become a Seller',
                          onTap: () => _confirmBecomeSeller(context),
                        ),
                      const SizedBox(height: AppSizes.xs),
                      _ActionTile(
                        icon: Icons.logout,
                        label: AppStrings.logout,
                        color: AppColors.danger,
                        onTap: () => context
                            .read<AuthBloc>()
                            .add(AuthLogoutRequested()),
                      ),
                    ],
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _avatarFallback(String name) {
    return Container(
      width: 96,
      height: 96,
      color: AppColors.primary.withAlpha(26),
      alignment: Alignment.center,
      child: Text(
        name.isNotEmpty ? name[0].toUpperCase() : '?',
        style: const TextStyle(
          fontSize: 36,
          fontWeight: FontWeight.w800,
          color: AppColors.primary,
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSizes.sm),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: AppColors.textSecondary,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoTile(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: AppColors.primary),
      title: Text(label,
          style: const TextStyle(
              fontSize: 12, color: AppColors.textSecondary)),
      subtitle: Text(value,
          style: const TextStyle(
              fontSize: 15, fontWeight: FontWeight.w500)),
    );
  }
}

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;
  const _ActionTile(
      {required this.icon,
      required this.label,
      required this.onTap,
      this.color});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: color ?? AppColors.textPrimary),
      title: Text(label,
          style: TextStyle(
              color: color ?? AppColors.textPrimary,
              fontWeight: FontWeight.w500)),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
      contentPadding: EdgeInsets.zero,
    );
  }
}
