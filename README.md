# 🤖 Loony Gen 2

<p align="center">
  <br />
  <code>[ ■ ━ ■ ]</code>
  <br />
  <strong>A tactile, quirky desktop companion & minimalist productivity island for Windows.</strong>
  <br />
  <em>"Stay productive, without feeling overwhelmed."</em>
</p>

<p align="center">
  <a href="#-download--get-started"><img src="https://img.shields.io/badge/Release-v1.0.1-6366f1?style=flat-square" alt="Version"></a>
  <a href="#"><img src="https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d4?style=flat-square" alt="Windows"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-emerald?style=flat-square" alt="License"></a>
  <a href="#"><img src="https://img.shields.io/badge/Privacy-100%25%20Offline--First-amber?style=flat-square" alt="Offline First"></a>
  <a href="https://ko-fi.com/jipung"><img src="https://img.shields.io/badge/🍵_Matcha-Buy_me_a_Matcha-29ab87?style=flat-square&logo=kofi&logoColor=white" alt="Buy me a Matcha"></a>
</p>

<p align="center">
  <img src="assets/dashboard-overview.png" alt="Loony Dashboard Overview" width="850" style="border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.35);" />
</p>

---

## 💡 Why Loony Exists (The Creator's Note)

> *"I originally built Loony because I was tired of emailing links to myself, juggling heavy companion apps that eat my RAM, and staring at a cold, soulless desktop screen.*
>
> *I wanted something tactile and lightweight. A companion that lives at the top of my display like an elastic magnet—innocent and playful, but firm enough to keep me on track. Something that lets me drop files from my phone to my PC without passwords or cloud accounts.*
>
> *That’s how Loony was born. It started as a personal bridge, but it grew a soul of its own."*  
> — **Jipung**, Creator of Loony  
> *(Crafted with the help of AI)*

---

## ✨ What Makes Loony Feel Different

Most productivity suites feel like homework: 40 spreadsheet categories, monthly subscriptions, and endless notifications that guilt-trip you into working. 

Loony takes the opposite path:

### 🧲 1. A Living, Magnetic Island
Loony lives at the top bezel of your screen as an ultra-compact obsidian pill. Drag it anywhere across your monitors—let go near an edge, and it smoothly snaps like a soft magnet with natural squash-and-rebound physics.

<p align="center">
  <img src="assets/loony-dock.gif" alt="Magnetic Edge Snapping" width="480" style="border-radius: 10px; box-shadow: 0 6px 20px rgba(0,0,0,0.3);" />
</p>

- **Responsive Personality:** Pet Loony's head with your cursor and watch it purr `(^━^)`.
- **Sensory Awareness:** It dances subtly when your Spotify or browser plays music, gets dizzy if you shake it, and dozes off when you step away from your desk.

---

### 🌉 2. Zero-Friction Phone ⇄ PC Bridge
Connect your phone (Android or iPhone) to your Windows desktop in 3 seconds:

<p align="center">
  <img src="assets/mobile-bridge.png" alt="Mobile QR Pairing Bridge" width="750" style="border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.3);" />
</p>

- **Just Scan & Go:** No account registration, no passwords, no email verification. Scan the on-screen QR code and you're paired.
- **Shared Clipboard:** Copy a tracking code, address, or snippet on your phone—it's immediately on your PC clipboard.
- **Drop & Land:** Shoot a photo on your phone, tap send, and it lands right in your laptop’s `Downloads/LoonyBridge` folder over local Wi-Fi.
- **True Privacy (E2EE):** Everything is encrypted locally with AES-256 before transit. Your notes and files never touch a public cloud server.

---

### 📅 3. Natural Language Planning & Quick-Capture
No need to fiddle through complex calendars. Open Loony and quickly jot down what matters today:

<p align="center">
  <img src="assets/loony-schedule.gif" alt="Quick Schedule Planning" width="600" style="border-radius: 10px; box-shadow: 0 6px 25px rgba(0,0,0,0.3);" />
</p>

- `"Team retro tomorrow 2pm"` ➔ Added to your schedule with automatic conflict detection.
- `"Gas 35k"` ➔ Automatically logged to daily expenses.
- `"Idea: retro terminal theme"` ➔ Tucked away safely in your Idea Vault.

---

### 💰 4. "Safe-to-Spend" (Guilt-Free Daily Budget)
Forget complicated accounting. Tell Loony your balance and your payday. It calculates **one dynamic daily number**:
- *"You can safely spend $18 today."*
- Bought coffee? Enter it in two clicks. Loony recalibrates tomorrow's allowance automatically so you never run out of gas at the end of the month.

---

### 🌿 5. Unobtrusive Desktop Presence
Loony rests peacefully on your screen without cluttering your workspace, eating CPU, or getting in your way.

<p align="center">
  <img src="assets/capsule-desktop.png" alt="Loony on Desktop" width="750" style="border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.3);" />
</p>

---

## 📥 Download & Get Started

Loony is 100% free and open-source. Choose the package that fits your workflow:

| Package | Best For | Description |
| :--- | :--- | :--- |
| **[🚀 Loony Setup (v1.0.1)](https://github.com/Jipung7/Loony/releases/latest)** | **Recommended for Daily Use** | Standard Windows installer (.exe). Sets up desktop shortcuts and clean uninstall options. |
| **[📦 Loony Portable (v1.0.1)](https://github.com/Jipung7/Loony/releases/latest)** | **Travelers & Flash Drives** | Single standalone .exe. No installation required—just click and run anywhere. |

### System Requirements
- **OS:** Windows 10 (64-bit) or Windows 11.
- **Memory:** Extremely lightweight (~120 MB – 180 MB RAM).
- **Prerequisites:** **None.** You do *not* need Node.js, Git, or developer tools installed to run the application.

---

## 🛠️ For Developers & Tinkerers

Loony is crafted with modern web technologies packaged into an ultra-optimized native shell:
- **Core:** React 19, TypeScript, Tailwind CSS, Framer Motion.
- **Shell:** Electron with native Win32 sensor bridges.
- **Bridge Protocol:** W3C Web Crypto (AES-GCM-256), WebRTC P2P DataChannels, Local HTTP Server.

### Running from Source
```bash
# 1. Clone the repository
git clone https://github.com/Jipung7/Loony.git
cd Loony

# 2. Install dependencies
npm install

# 3. Start development mode
npm run dev

# 4. Build Windows binaries
npm run dist:win
```

---

## 🍵 Support the Project (Jajanin Loony)

Loony is an independent passion project built by a solo creator. If Loony brings a smile to your face, keeps your desktop serene, or makes your workday a little lighter, consider supporting its journey! *(Fun fact: Jipung doesn't drink coffee, but loves Matcha 🍵)*

### 🌏 International / Global Supporters:
- 🍵 **[Buy Jipung a Matcha on Ko-fi](https://ko-fi.com/jipung)** *(Supports PayPal, Credit / Debit Cards)*
- ⭐ **Star this repository** on GitHub (it helps more people discover Loony!)
- 💬 Share your feedback and ideas in [GitHub Discussions](https://github.com/Jipung7/Loony/discussions)

### 🇮🇩 Teman-Teman Indonesia (Dukungan Lokal):
- 🎁 **[Saweria (saweria.co/jipung)](https://saweria.co/jipung)** *(Bisa scan QRIS, GoPay, OVO, DANA, ShopeePay)*
- ⚡ **[SociaBuzz (sociabuzz.com/jipung)](https://sociabuzz.com/jipung)**

---

## 📄 License

Distributed under the **MIT License**. Free for personal and commercial use.  
Crafted with heart by **Jipung** ([@Jipung7](https://github.com/Jipung7)) with the help of AI — *Lone Steed Studio*.
