# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.2] - 2026-10-31

### Added
- **Official Product Grounding for Loony AI:** Embedded official system facts into conversational prompts (English and Indonesian) covering creator identity (Jipung / Lone Steed Studio), MIT open-source licensing, local LAN port 47831 architecture, and direct `Downloads/LoonyBridge` file destinations.
- **Offline Help & Bug Report Routing:** Added rule-based fallback responses in `runLocalLoonyBrain` for developer queries, bug reporting, mobile bridge guidance, and license information without requiring an active AI API key.
- **Tactile Physics Preview:** Added `loony-bounce.gif` to Section 1 of both `README.md` and `README.id.md` to demonstrate Framer Motion spring and bounce interactions.

### Fixed
- **AI Hallucination on Bug Reports & Support:** Eliminated AI hallucinations where Loony previously invented non-existent support email addresses (`support@loonylabs.com`), fabricated in-app settings menus, and incorrectly suggested port 443. All bug and feedback inquiries now correctly route to official [GitHub Issues](https://github.com/Jipung7/Loony/issues).

---

## [1.0.1] - 2026-10-29

### Fixed
- **Universal Mobile Clipboard Fallback:** Resolved an issue where mobile browsers (Chrome on Android, Safari on iOS) blocked `navigator.clipboard.writeText()` over local HTTP connections (`http://192.168.x.x`). Added a detached `<textarea>` fallback using `document.execCommand('copy')` in `src/utils/clipboard.ts`.
- **Windows Background Media Detection:** Fixed music playback detection in packaged builds by enumerating all active media sessions in `GetSessions()` (`PlaybackStatus -eq 4`) instead of relying solely on `GetCurrentSession()`. Loony now reliably equips its cyan headset across Spotify, YouTube, VLC, and Windows media players.
- **PowerShell Script Execution from ASAR:** Added automated script extraction to `%TEMP%\loony-scripts` as a fallback for external processes that cannot read inside packed `app.asar`.

### Added
- **Native Windows System Tray Icon:** Integrated `.ico` format support (`public/icon.ico` and `electron/icon.ico`) to ensure crisp rendering in the Windows notification area.
- **Clarified Pairing Guidance:** Updated on-screen mobile bridge instructions to explicitly state that the PC and mobile device must be connected to the same Wi-Fi or hotspot network.

---

## [1.0.0] - 2026-10-28

### Added
- **Compact Dark Obsidian Capsule:** Minimalist desktop overlay (`#0b0b0f` to `#121218`) with Win32 click-through transparency (`mainWindow.setIgnoreMouseEvents`) allowing full interaction with underlying Windows apps.
- **Magnetic Screen Edge Docking:** Smooth physics-based snap and expansion along any monitor edge with Framer Motion spring damping.
- **Expressive Holo-Visor Robot Eyes (`[■━■]`):** Responsive mascot that blinks, enters sleep state during user inactivity, reacts happily to hover, and bobs rhythmically to system media playback.
- **Zero-Friction Phone ⇄ PC Bridge:** Instant local pairing via QR code without account creation, passwords, or third-party cloud servers. Includes two-way clipboard sharing and LAN-speed direct file transfer.
- **Natural Language Quick Omnibox:** Single-input parser for rapidly logging tasks, schedules, ideas, and expenses.
- **Safe-to-Spend Daily Allowance:** Automatic budget calculation dividing remaining active balance across remaining days until payday.
- **IOU & Debt Ledger:** Transparent record-keeping for borrowed or lent funds that stays visible until marked settled.
- **Micro-Habit Streaks:** Daily micro-routine tracking with a night-owl-friendly reset time at 04:00 AM.
- **Clock & Prayer Times:** Built-in prayer timetable calculation using official Kemenag RI method, complete with quick meeting mute switch.
- **100% Offline-First Architecture:** Zero telemetry, local-only data persistence, and AES-256 encrypted payload transfers over LAN.
