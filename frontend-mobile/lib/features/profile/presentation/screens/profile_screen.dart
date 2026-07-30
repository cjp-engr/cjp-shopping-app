import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../shared/services/media_permission_service.dart';
import '../../../auth/domain/entities/user_entity.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../auth/presentation/bloc/auth_event.dart';
import '../../../auth/presentation/bloc/auth_state.dart';
import '../../../follow/data/datasources/follow_remote_datasource.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/theme/theme_cubit.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_dialog.dart';
import '../../../../shared/widgets/app_text_field.dart';

class ProfileScreen extends StatefulWidget {
  final FollowRemoteDataSource? followDs;
  const ProfileScreen({super.key, this.followDs});

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
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final granted = await MediaPermissionService.requestGallery(context);
    if (!granted || !mounted) return;
    try {
      final image = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
      );
      if (image == null || !mounted) return;
      setState(() => _uploadingPhoto = true);
      context.read<AuthBloc>().add(AuthAvatarUploadRequested(image.path));
    } catch (_) {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  Future<void> _confirmBecomeSeller(BuildContext context) async {
    final confirm = await AppDialog.show(
      context,
      icon: Icons.storefront_outlined,
      iconColor: AppColors.primary,
      iconBackground: AppColors.primaryLight,
      title: AppStrings.becomeSeller,
      body: AppStrings.becomeSellerBody,
      cancelLabel: AppStrings.notNow,
      confirmLabel: AppStrings.yesContinue,
    );
    if (confirm == true && context.mounted) {
      context.read<AuthBloc>().add(AuthProfileUpdateRequested(const {'role': 'seller'}));
    }
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;

    final addressData = {
      'street': _streetCtrl.text.trim(),
      'city': _cityCtrl.text.trim(),
      'state': _stateCtrl.text.trim(),
      'zipCode': _zipCtrl.text.trim(),
    };
    final hasAddress = addressData.values.any((v) => v.isNotEmpty);

    context.read<AuthBloc>().add(AuthProfileUpdateRequested({
          'firstName': _firstCtrl.text.trim(),
          'lastName': _lastCtrl.text.trim(),
          'phone': _phoneCtrl.text.trim(),
          if (hasAddress) 'address': addressData,
        }));
    setState(() => _isEditing = false);
  }

  Widget _buildAvatar(String? avatar, String firstName) {
    if (avatar != null && avatar.isNotEmpty) {
      return Image.network(
        avatar,
        width: 100,
        height: 100,
        fit: BoxFit.cover,
        loadingBuilder: (_, child, p) =>
            p == null ? child : _avatarFallback(firstName),
        errorBuilder: (_, __, ___) => _avatarFallback(firstName),
      );
    }
    return _avatarFallback(firstName);
  }

  Widget _avatarFallback(String name) {
    return Container(
      width: 100,
      height: 100,
      color: AppColors.primary.withAlpha(26),
      alignment: Alignment.center,
      child: Text(
        name.isNotEmpty ? name[0].toUpperCase() : '?',
        style: const TextStyle(
          fontSize: 38,
          fontWeight: FontWeight.w800,
          color: AppColors.primary,
        ),
      ),
    );
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
              child: const Text(AppStrings.cancel),
            ),
        ],
      ),
      body: BlocConsumer<AuthBloc, AuthState>(
        listenWhen: (p, c) => p.status != c.status,
        listener: (context, state) {
          if (state.status == AuthStatus.failure) {
            setState(() => _uploadingPhoto = false);
          }
          if (state.status == AuthStatus.authenticated) {
            setState(() => _uploadingPhoto = false);
          }
        },
        builder: (context, state) {
          final user = state.user;
          if (user == null) return const SizedBox.shrink();

          return SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(
                AppSizes.md, AppSizes.md, AppSizes.md, AppSizes.xl),
            child: Column(
              children: [
                // ── Avatar + identity header ─────────────────────────────────
                _ProfileHeader(
                  user: user,
                  uploadingPhoto: _uploadingPhoto,
                  buildAvatar: _buildAvatar,
                  onPickPhoto: _pickPhoto,
                  followDs: widget.followDs,
                ),

                const SizedBox(height: AppSizes.lg),

                if (_isEditing) ...[
                  // ── Edit form ──────────────────────────────────────────────
                  Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _SectionLabel(AppStrings.personalDetails),
                        const SizedBox(height: AppSizes.xs),
                        _FormCard(
                          child: Column(
                            children: [
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
                                label: AppStrings.phone,
                                controller: _phoneCtrl,
                                keyboardType: TextInputType.phone,
                                prefixIcon: Icons.phone_outlined,
                                prefix: '+63 ',
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSizes.md),
                        const _SectionLabel(AppStrings.address),
                        const SizedBox(height: AppSizes.xs),
                        _FormCard(
                          child: Column(
                            children: [
                              AppTextField(
                                label: AppStrings.street,
                                controller: _streetCtrl,
                                prefixIcon: Icons.location_on_outlined,
                              ),
                              const SizedBox(height: AppSizes.sm),
                              Row(
                                children: [
                                  Expanded(
                                    child: AppTextField(
                                      label: AppStrings.city,
                                      controller: _cityCtrl,
                                    ),
                                  ),
                                  const SizedBox(width: AppSizes.sm),
                                  Expanded(
                                    child: AppTextField(
                                      label: AppStrings.state,
                                      controller: _stateCtrl,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: AppSizes.sm),
                              AppTextField(
                                label: AppStrings.zipCode,
                                controller: _zipCtrl,
                                keyboardType: TextInputType.number,
                              ),
                            ],
                          ),
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
                  ),
                ] else ...[
                  // ── View mode ──────────────────────────────────────────────
                  const _SectionLabel(AppStrings.personalInformation),
                  const SizedBox(height: AppSizes.xs),
                  _InfoCard(
                    items: [
                      _InfoItem(
                        Icons.person_outlined,
                        AppStrings.firstName,
                        user.firstName.isNotEmpty ? user.firstName : '—',
                      ),
                      _InfoItem(
                        Icons.person_outlined,
                        AppStrings.lastName,
                        user.lastName.isNotEmpty ? user.lastName : '—',
                      ),
                      _InfoItem(Icons.email_outlined, AppStrings.email, user.email),
                      _InfoItem(
                        Icons.phone_outlined,
                        AppStrings.phone,
                        (user.phone != null && user.phone!.isNotEmpty)
                            ? user.phone!
                            : '—',
                      ),
                      _InfoItem(
                        Icons.location_on_outlined,
                        AppStrings.address,
                        user.address != null
                            ? [
                                user.address!.street,
                                user.address!.city,
                                user.address!.state,
                                user.address!.zipCode,
                              ].where((s) => s.isNotEmpty).join(', ')
                            : '—',
                      ),
                    ],
                  ),

                  const SizedBox(height: AppSizes.md),

                  // ── Saved Addresses ────────────────────────────────────────
                  const _SectionLabel(AppStrings.savedAddresses),
                  const SizedBox(height: AppSizes.xs),
                  _SavedAddressList(addresses: user.savedAddresses),

                  const SizedBox(height: AppSizes.md),

                  // ── Settings card ──────────────────────────────────────────
                  _SettingsCard(
                    children: [
                      if (user.isSeller)
                        _SettingsRow(
                          icon: Icons.storefront_outlined,
                          label: AppStrings.myShop,
                          onTap: () => context.go('/seller'),
                          showChevron: true,
                        )
                      else
                        _SettingsRow(
                          icon: Icons.store_outlined,
                          label: AppStrings.becomeSeller,
                          onTap: () => _confirmBecomeSeller(context),
                          showChevron: true,
                        ),
                      const _SettingsDivider(),
                      BlocBuilder<ThemeCubit, ThemeMode>(
                        builder: (context, themeMode) {
                          final isDark = themeMode == ThemeMode.dark;
                          return _SettingsRow(
                            icon: isDark
                                ? Icons.dark_mode_rounded
                                : Icons.wb_sunny_rounded,
                            label: isDark ? AppStrings.darkMode : AppStrings.lightMode,
                            onTap: () => context.read<ThemeCubit>().toggle(),
                            trailing: _ThemeToggle(
                              isDark: isDark,
                              onToggle: () =>
                                  context.read<ThemeCubit>().toggle(),
                            ),
                          );
                        },
                      ),
                    ],
                  ),

                  const SizedBox(height: AppSizes.sm),

                  // ── Danger card ────────────────────────────────────────────
                  _SettingsCard(
                    children: [
                      _SettingsRow(
                        icon: Icons.logout_rounded,
                        label: AppStrings.logout,
                        color: AppColors.danger,
                        onTap: () =>
                            context.read<AuthBloc>().add(AuthLogoutRequested()),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

// ── Profile header ────────────────────────────────────────────────────────────

class _ProfileHeader extends StatelessWidget {
  final UserEntity user;
  final bool uploadingPhoto;
  final Widget Function(String?, String) buildAvatar;
  final VoidCallback onPickPhoto;
  final FollowRemoteDataSource? followDs;

  const _ProfileHeader({
    required this.user,
    required this.uploadingPhoto,
    required this.buildAvatar,
    required this.onPickPhoto,
    this.followDs,
  });

  @override
  Widget build(BuildContext context) {
    final isSeller = user.isSeller;
    return Column(
      children: [
        Stack(
          alignment: Alignment.bottomRight,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.primary, width: 2.5),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withAlpha(40),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: uploadingPhoto
                  ? Container(
                      color: AppColors.primary.withAlpha(20),
                      child: const Center(
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: AppColors.primary),
                      ),
                    )
                  : buildAvatar(user.avatar, user.firstName),
            ),
            GestureDetector(
              onTap: uploadingPhoto ? null : onPickPhoto,
              child: Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: const Icon(Icons.camera_alt_rounded,
                    size: 14, color: Colors.white),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSizes.sm),
        Text(
          user.fullName,
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 2),
        Text(
          user.email,
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface.withAlpha(140),
            fontSize: 13,
          ),
        ),
        const SizedBox(height: AppSizes.xs),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: isSeller
                ? AppColors.primary.withAlpha(20)
                : AppColors.success.withAlpha(20),
            borderRadius: BorderRadius.circular(AppSizes.radiusFull),
          ),
          child: Text(
            user.role.toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
              color: isSeller ? AppColors.primary : AppColors.success,
            ),
          ),
        ),
        if (followDs != null) ...[
          const SizedBox(height: AppSizes.md),
          _FollowStatsRow(userId: user.id, followDs: followDs!),
        ],
      ],
    );
  }
}

// ── Section label (accent bar) ────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 0),
      child: Row(
        children: [
          Container(
            width: 3,
            height: 16,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            text,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Theme.of(context).colorScheme.onSurface,
              letterSpacing: 0.1,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Form card ─────────────────────────────────────────────────────────────────

class _FormCard extends StatelessWidget {
  final Widget child;
  const _FormCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSizes.md),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ??
            Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
  }
}

// ── Info card (view mode) ─────────────────────────────────────────────────────

class _InfoItem {
  final IconData icon;
  final String label;
  final String value;
  const _InfoItem(this.icon, this.label, this.value);
}

class _InfoCard extends StatelessWidget {
  final List<_InfoItem> items;
  const _InfoCard({required this.items});

  @override
  Widget build(BuildContext context) {
    final cardColor = Theme.of(context).cardTheme.color ??
        Theme.of(context).colorScheme.surface;

    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          for (int i = 0; i < items.length; i++) ...[
            _InfoRow(item: items[i]),
            if (i < items.length - 1)
              Divider(
                height: 1,
                indent: 52,
                color: Theme.of(context).dividerColor.withAlpha(80),
              ),
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final _InfoItem item;
  const _InfoRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurface.withAlpha(130);
    return Padding(
      padding:
          const EdgeInsets.symmetric(horizontal: AppSizes.md, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.primary.withAlpha(16),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(item.icon, size: 18, color: AppColors.primary),
          ),
          const SizedBox(width: AppSizes.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.label,
                  style: TextStyle(fontSize: 11, color: muted),
                ),
                const SizedBox(height: 2),
                Text(
                  item.value,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Theme toggle ──────────────────────────────────────────────────────────────

class _ThemeToggle extends StatefulWidget {
  final bool isDark;
  final VoidCallback onToggle;
  const _ThemeToggle({required this.isDark, required this.onToggle});

  @override
  State<_ThemeToggle> createState() => _ThemeToggleState();
}

class _ThemeToggleState extends State<_ThemeToggle>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _progress;
  bool _pressed = false;

  // Track + thumb geometry
  static const _trackW = 56.0;
  static const _trackH = 30.0;
  static const _thumbD = 24.0;
  static const _thumbPad = 3.0;
  static const _thumbTravel = _trackW - _thumbD - (_thumbPad * 2);

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
      value: widget.isDark ? 1.0 : 0.0,
    );
    _progress = CurvedAnimation(parent: _ctrl, curve: Curves.easeInOutCubic);
  }

  @override
  void didUpdateWidget(_ThemeToggle old) {
    super.didUpdateWidget(old);
    if (old.isDark != widget.isDark) {
      widget.isDark ? _ctrl.forward() : _ctrl.reverse();
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onToggle,
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.92 : 1.0,
        duration: const Duration(milliseconds: 80),
        child: AnimatedBuilder(
          animation: _progress,
          builder: (_, __) {
            final t = _progress.value;
            const trackColor = AppColors.primary;
            final thumbLeft = _thumbPad + (_thumbTravel * t);

            return SizedBox(
              width: _trackW,
              height: _trackH,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: trackColor,
                  borderRadius: BorderRadius.circular(_trackH / 2),
                  boxShadow: [
                    BoxShadow(
                      color: trackColor.withAlpha(90),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    // Sun icon — visible in track when dark (thumb is on right)
                    Positioned(
                      left: 7,
                      top: (_trackH - 14) / 2,
                      child: Opacity(
                        opacity: (t * 0.75).clamp(0.0, 1.0),
                        child: const Icon(
                          Icons.wb_sunny_rounded,
                          size: 14,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    // Moon icon — visible in track when light (thumb is on left)
                    Positioned(
                      right: 7,
                      top: (_trackH - 14) / 2,
                      child: Opacity(
                        opacity: ((1.0 - t) * 0.75).clamp(0.0, 1.0),
                        child: const Icon(
                          Icons.dark_mode_rounded,
                          size: 14,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    // Sliding thumb
                    Positioned(
                      left: thumbLeft,
                      top: _thumbPad,
                      child: Container(
                        width: _thumbD,
                        height: _thumbD,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(40),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        alignment: Alignment.center,
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 200),
                          transitionBuilder: (child, anim) => ScaleTransition(
                            scale: anim,
                            child: FadeTransition(opacity: anim, child: child),
                          ),
                          child: Icon(
                            t > 0.5
                                ? Icons.dark_mode_rounded
                                : Icons.wb_sunny_rounded,
                            key: ValueKey(t > 0.5),
                            size: 13,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

// ── Settings card ─────────────────────────────────────────────────────────────

class _SettingsCard extends StatelessWidget {
  final List<Widget> children;
  const _SettingsCard({required this.children});

  @override
  Widget build(BuildContext context) {
    final cardColor = Theme.of(context).cardTheme.color ??
        Theme.of(context).colorScheme.surface;

    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }
}

class _SettingsDivider extends StatelessWidget {
  const _SettingsDivider();

  @override
  Widget build(BuildContext context) {
    return Divider(
      height: 1,
      indent: 52,
      color: Theme.of(context).dividerColor.withAlpha(80),
    );
  }
}

// ── Saved Address List ────────────────────────────────────────────────────────

class _SavedAddressList extends StatefulWidget {
  final List<SavedAddressEntity> addresses;
  const _SavedAddressList({required this.addresses});

  @override
  State<_SavedAddressList> createState() => _SavedAddressListState();
}

class _SavedAddressListState extends State<_SavedAddressList> {
  final _labelCtrl = TextEditingController(text: 'Home');
  final _streetCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _stateCtrl = TextEditingController();
  final _zipCtrl = TextEditingController();

  @override
  void dispose() {
    _labelCtrl.dispose();
    _streetCtrl.dispose();
    _cityCtrl.dispose();
    _stateCtrl.dispose();
    _zipCtrl.dispose();
    super.dispose();
  }

  void _showAddSheet() {
    _labelCtrl.text = 'Home';
    _streetCtrl.clear();
    _cityCtrl.clear();
    _stateCtrl.clear();
    _zipCtrl.clear();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(AppSizes.radiusLg)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: AppSizes.md,
          right: AppSizes.md,
          top: AppSizes.md,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSizes.md,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(AppStrings.addAddress,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Theme.of(ctx).colorScheme.onSurface,
                )),
            const SizedBox(height: AppSizes.sm),
            AppTextField(label: AppStrings.label, controller: _labelCtrl),
            const SizedBox(height: AppSizes.xs),
            AppTextField(
              label: AppStrings.streetAddress,
              controller: _streetCtrl,
              prefixIcon: Icons.home_outlined,
              keyboardType: TextInputType.streetAddress,
            ),
            const SizedBox(height: AppSizes.xs),
            Row(children: [
              Expanded(
                  child: AppTextField(label: AppStrings.city, controller: _cityCtrl)),
              const SizedBox(width: AppSizes.sm),
              Expanded(
                  child: AppTextField(label: AppStrings.state, controller: _stateCtrl)),
            ]),
            const SizedBox(height: AppSizes.xs),
            AppTextField(
              label: AppStrings.zipCode,
              controller: _zipCtrl,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: AppSizes.md),
            BlocBuilder<AuthBloc, AuthState>(
              buildWhen: (p, c) => p.status != c.status,
              builder: (bCtx, s) => AppButton(
                label: AppStrings.saveAddress,
                loading: s.status == AuthStatus.loading,
                onPressed: () {
                  if (_streetCtrl.text.trim().isEmpty ||
                      _cityCtrl.text.trim().isEmpty) {
                    return;
                  }
                  context.read<AuthBloc>().add(AuthAddressAddRequested({
                        'label': _labelCtrl.text.trim().isNotEmpty
                            ? _labelCtrl.text.trim()
                            : 'Home',
                        'street': _streetCtrl.text.trim(),
                        'city': _cityCtrl.text.trim(),
                        'state': _stateCtrl.text.trim(),
                        'zipCode': _zipCtrl.text.trim(),
                        'country': '',
                      }));
                  Navigator.pop(ctx);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cardColor = Theme.of(context).cardTheme.color ??
        Theme.of(context).colorScheme.surface;

    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          if (widget.addresses.isEmpty)
            Padding(
              padding: const EdgeInsets.all(AppSizes.md),
              child: Text(
                AppStrings.noSavedAddresses,
                style: TextStyle(
                  fontSize: 13,
                  color: Theme.of(context).colorScheme.onSurface.withAlpha(130),
                ),
              ),
            ),
          ...widget.addresses.asMap().entries.map((entry) {
            final i = entry.key;
            final addr = entry.value;
            final displayAddr = [
              addr.street,
              addr.city,
              addr.state,
              addr.zipCode
            ].where((s) => s.isNotEmpty).join(', ');
            return Column(
              children: [
                if (i > 0)
                  Divider(
                    height: 1,
                    indent: 52,
                    color: Theme.of(context).dividerColor.withAlpha(80),
                  ),
                Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: AppSizes.md, vertical: 10),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withAlpha(16),
                          borderRadius: BorderRadius.circular(9),
                        ),
                        child: const Icon(Icons.location_on_outlined,
                            size: 18, color: AppColors.primary),
                      ),
                      const SizedBox(width: AppSizes.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(children: [
                              Text(
                                addr.label,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color:
                                      Theme.of(context).colorScheme.onSurface,
                                ),
                              ),
                              if (addr.isDefault) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withAlpha(20),
                                    borderRadius: BorderRadius.circular(
                                        AppSizes.radiusFull),
                                  ),
                                  child: const Text(
                                    AppStrings.defaultLabel,
                                    style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.primary),
                                  ),
                                ),
                              ],
                            ]),
                            Text(
                              displayAddr.isNotEmpty ? displayAddr : '—',
                              style: TextStyle(
                                fontSize: 11,
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurface
                                    .withAlpha(130),
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      if (!addr.isDefault)
                        IconButton(
                          icon: Icon(Icons.star_border_rounded,
                              size: 20,
                              color: AppColors.primary.withAlpha(180)),
                          tooltip: AppStrings.setAsDefault,
                          onPressed: () => context
                              .read<AuthBloc>()
                              .add(AuthAddressSetDefaultRequested(addr.id)),
                          padding: const EdgeInsets.all(6),
                          constraints:
                              const BoxConstraints(minWidth: 36, minHeight: 36),
                        ),
                      IconButton(
                        icon: Icon(Icons.delete_outline,
                            size: 20, color: Colors.red.withAlpha(200)),
                        tooltip: AppStrings.deleteAddress,
                        onPressed: () => context
                            .read<AuthBloc>()
                            .add(AuthAddressDeleteRequested(addr.id)),
                        padding: const EdgeInsets.all(6),
                        constraints:
                            const BoxConstraints(minWidth: 36, minHeight: 36),
                      ),
                    ],
                  ),
                ),
              ],
            );
          }),
          Divider(
            height: 1,
            color: Theme.of(context).dividerColor.withAlpha(80),
          ),
          InkWell(
            onTap: _showAddSheet,
            borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(AppSizes.radiusLg)),
            child: const Padding(
              padding:
                  EdgeInsets.symmetric(horizontal: AppSizes.md, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add_rounded, size: 18, color: AppColors.primary),
                  SizedBox(width: 6),
                  Text(
                    AppStrings.addAddress,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Follow stats row ──────────────────────────────────────────────────────────

class _FollowStatsRow extends StatefulWidget {
  final String userId;
  final FollowRemoteDataSource followDs;
  const _FollowStatsRow({required this.userId, required this.followDs});

  @override
  State<_FollowStatsRow> createState() => _FollowStatsRowState();
}

class _FollowStatsRowState extends State<_FollowStatsRow> {
  int? _followers;
  int? _following;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final profile = await widget.followDs.getUserProfile(widget.userId);
      if (mounted) {
        setState(() {
          _followers = profile.followersCount;
          _following = profile.followingCount;
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_followers == null && _following == null) {
      return const SizedBox.shrink();
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _StatChip(
          label: AppStrings.followers,
          count: _followers ?? 0,
          onTap: () => context.push('/users/${widget.userId}'),
        ),
        Container(
          width: 1,
          height: 28,
          margin: const EdgeInsets.symmetric(horizontal: AppSizes.md),
          color: Theme.of(context).dividerColor,
        ),
        _StatChip(
          label: AppStrings.following,
          count: _following ?? 0,
          onTap: () => context.push('/users/${widget.userId}'),
        ),
      ],
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final int count;
  final VoidCallback onTap;
  const _StatChip(
      {required this.label, required this.count, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Text(
            '$count',
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppColors.primary,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).colorScheme.onSurface.withAlpha(140),
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;
  final bool showChevron;
  final Widget? trailing;

  const _SettingsRow({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
    this.showChevron = false,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? Theme.of(context).colorScheme.onSurface;
    final isMuted = color == null;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSizes.radiusLg),
      child: Padding(
        padding:
            const EdgeInsets.symmetric(horizontal: AppSizes.md, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: effectiveColor.withAlpha(isMuted ? 14 : 18),
                borderRadius: BorderRadius.circular(9),
              ),
              child: Icon(icon, size: 18, color: effectiveColor),
            ),
            const SizedBox(width: AppSizes.sm),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: effectiveColor,
                ),
              ),
            ),
            if (trailing != null) trailing!,
            if (showChevron)
              Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: Theme.of(context).colorScheme.onSurface.withAlpha(100),
              ),
          ],
        ),
      ),
    );
  }
}
