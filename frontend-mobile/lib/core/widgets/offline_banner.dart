import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../network/connectivity_cubit.dart';

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ConnectivityCubit, bool>(
      builder: (context, isOnline) {
        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          height: isOnline ? 0 : 40,
          color: const Color(0xFFFACC15), // yellow-400
          child: isOnline
              ? const SizedBox.shrink()
              : Semantics(
                  liveRegion: true,
                  label: "You're offline. Check your connection.",
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.wifi_off, size: 16, color: Color(0xFF713F12)),
                      SizedBox(width: 8),
                      Text(
                        "You're offline. Check your connection.",
                        style: TextStyle(
                          color: Color(0xFF713F12),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
        );
      },
    );
  }
}
