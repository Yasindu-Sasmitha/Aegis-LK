import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ── Aegis-LK Design Tokens ────────────────────────────────────────────────────
// Mirrors the React frontend CSS variables exactly.

const kNavBg = Color(0xFF07162C);       // Main top nav background
const kSubNavBg = Color(0xFF0C2242);    // Sub-tab nav background
const kAccent = Color(0xFF38BDF8);      // Sky blue accent
const kSurface = Color(0xFFF1F5F9);     // Page background (slate-100)
const kCardBg = Colors.white;
const kTextPrimary = Color(0xFF0F172A);
const kTextSecondary = Color(0xFF475569);
const kTextMuted = Color(0xFF94A3B8);
const kDanger = Color(0xFFEF4444);
const kSuccess = Color(0xFF10B981);
const kWarning = Color(0xFFF59E0B);
const kBorder = Color(0xFFE2E8F0);

// ── Roles ─────────────────────────────────────────────────────────────────────
const kRoleColors = {
  'Admin': Color(0xFFC084FC),
  'DisasterOfficer': Color(0xFF60A5FA),
  'Responder': Color(0xFFFCD34D),
  'Citizen': Color(0xFF6EE7B7),
};

// ── Theme ─────────────────────────────────────────────────────────────────────
ThemeData buildAegisTheme() {
  final base = ThemeData.light(useMaterial3: true);
  return base.copyWith(
    scaffoldBackgroundColor: kSurface,
    colorScheme: base.colorScheme.copyWith(
      primary: kAccent,
      secondary: kAccent,
      surface: kSurface,
    ),
    textTheme: GoogleFonts.interTextTheme(base.textTheme).copyWith(
      displayLarge: GoogleFonts.plusJakartaSans(
        fontWeight: FontWeight.w800,
        color: kTextPrimary,
      ),
      displayMedium: GoogleFonts.plusJakartaSans(
        fontWeight: FontWeight.w700,
        color: kTextPrimary,
      ),
      headlineLarge: GoogleFonts.plusJakartaSans(
        fontWeight: FontWeight.w700,
        color: kTextPrimary,
      ),
      headlineMedium: GoogleFonts.plusJakartaSans(
        fontWeight: FontWeight.w600,
        color: kTextPrimary,
      ),
      titleLarge: GoogleFonts.plusJakartaSans(
        fontWeight: FontWeight.w700,
        color: kTextPrimary,
      ),
      titleMedium: GoogleFonts.plusJakartaSans(
        fontWeight: FontWeight.w600,
        color: kTextPrimary,
      ),
      bodyLarge: GoogleFonts.inter(color: kTextPrimary),
      bodyMedium: GoogleFonts.inter(color: kTextSecondary),
      bodySmall: GoogleFonts.inter(color: kTextMuted),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: kCardBg,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: kBorder),
      ),
      margin: EdgeInsets.zero,
    ),
    dividerColor: kBorder,
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: kAccent,
    ),
    chipTheme: ChipThemeData(
      selectedColor: kAccent,
      backgroundColor: const Color(0xFFF1F5F9),
      labelStyle: GoogleFonts.inter(fontSize: 12),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    ),
  );
}
