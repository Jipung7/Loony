param(
    [int]$LoonyPid = 0
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "SilentlyContinue"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class Win32Sensor {
    [DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct MONITORINFO {
        public int cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public uint dwFlags;
    }

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);

    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsIconic(IntPtr hWnd);

    [DllImport("shell32.dll")]
    public static extern int SHQueryUserNotificationState(out int pquns);

    [StructLayout(LayoutKind.Sequential)]
    public struct LASTINPUTINFO {
        public uint cbSize;
        public uint dwTime;
    }

    [DllImport("user32.dll")]
    public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    [DllImport("kernel32.dll")]
    public static extern uint GetTickCount();

    public static uint GetSystemIdleMs() {
        LASTINPUTINFO lii = new LASTINPUTINFO();
        lii.cbSize = (uint)Marshal.SizeOf(lii);
        if (GetLastInputInfo(ref lii)) {
            uint tick = GetTickCount();
            if (tick >= lii.dwTime) {
                return tick - lii.dwTime;
            }
        }
        return 0;
    }

    public const int GWL_STYLE = -16;
    public const int WS_CAPTION = 0x00C00000;

    public static bool IsAnyTypingKeyPressed() {
        // Check Backspace (0x08), Enter (0x0D), Space (0x20)
        int[] baseKeys = new int[] { 0x08, 0x0D, 0x20 };
        foreach (int k in baseKeys) {
            if ((GetAsyncKeyState(k) & 0x8001) != 0) return true;
        }
        // Check 0-9 (0x30 - 0x39) and A-Z (0x41 - 0x5A)
        for (int k = 0x30; k <= 0x5A; k++) {
            if ((GetAsyncKeyState(k) & 0x8001) != 0) return true;
        }
        // Check Numpad & Punctuation (0x60 - 0x6F, 0xBA - 0xDE)
        for (int k = 0x60; k <= 0x6F; k++) {
            if ((GetAsyncKeyState(k) & 0x8001) != 0) return true;
        }
        for (int k = 0xBA; k <= 0xDE; k++) {
            if ((GetAsyncKeyState(k) & 0x8001) != 0) return true;
        }
        return false;
    }

    public static bool IsToastNotificationVisible() {
        IntPtr h1 = FindWindow("Windows.UI.Core.CoreWindow", "New notification");
        if (h1 != IntPtr.Zero) return true;
        IntPtr h2 = FindWindow("Windows.UI.Core.CoreWindow", "Notifikasi baru");
        if (h2 != IntPtr.Zero) return true;
        return false;
    }

    public static bool IsForegroundFullscreen(int loonyPid) {
        IntPtr hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return false;

        uint pid;
        GetWindowThreadProcessId(hwnd, out pid);
        if (pid == 0 || pid == (uint)loonyPid) return false;

        StringBuilder cls = new StringBuilder(256);
        GetClassName(hwnd, cls, 256);
        string className = cls.ToString();

        // System shell / desktop windows are never fullscreen apps
        if (className == "Progman" || className == "WorkerW" ||
            className == "Shell_TrayWnd" || className == "Shell_SecondaryTrayWnd" ||
            className == "Windows.UI.Core.CoreWindow" || className == "XamlExplorerHostIslandWindow" ||
            className == "SidekickOverlayWindow") {
            return false;
        }

        if (IsIconic(hwnd) || !IsWindowVisible(hwnd)) {
            return false;
        }

        RECT wRect;
        if (!GetWindowRect(hwnd, out wRect)) return false;

        int winW = wRect.Right - wRect.Left;
        int winH = wRect.Bottom - wRect.Top;
        if (winW < 200 || winH < 200) return false;

        IntPtr hMon = MonitorFromWindow(hwnd, 2); // MONITOR_DEFAULTTONEAREST
        if (hMon == IntPtr.Zero) return false;

        MONITORINFO mi = new MONITORINFO();
        mi.cbSize = Marshal.SizeOf(mi);
        if (!GetMonitorInfo(hMon, ref mi)) return false;

        int monW = mi.rcMonitor.Right - mi.rcMonitor.Left;
        int monH = mi.rcMonitor.Bottom - mi.rcMonitor.Top;
        if (monW < 200 || monH < 200) return false;

        // Condition 1: Must cover the monitor rect (with 2px tolerance)
        bool coversMonitor = (
            wRect.Left <= mi.rcMonitor.Left + 2 &&
            wRect.Top <= mi.rcMonitor.Top + 2 &&
            wRect.Right >= mi.rcMonitor.Right - 2 &&
            wRect.Bottom >= mi.rcMonitor.Bottom - 2
        );

        if (!coversMonitor) {
            return false;
        }

        // Check if taskbar is present on this monitor
        bool hasTaskbar = (mi.rcWork.Bottom < mi.rcMonitor.Bottom) ||
                          (mi.rcWork.Top > mi.rcMonitor.Top) ||
                          (mi.rcWork.Left > mi.rcMonitor.Left) ||
                          (mi.rcWork.Right < mi.rcMonitor.Right);

        if (hasTaskbar) {
            // Covering rcMonitor when taskbar is visible means it covers the taskbar -> TRUE FULLSCREEN
            return true;
        }

        // If taskbar is auto-hidden (rcWork == rcMonitor), check caption
        int style = GetWindowLong(hwnd, GWL_STYLE);
        bool hasCaption = (style & WS_CAPTION) == WS_CAPTION;
        if (!hasCaption) {
            return true;
        }

        int qstate = 0;
        SHQueryUserNotificationState(out qstate);
        if (qstate == 2 || qstate == 3 || qstate == 4 || qstate == 7) {
            return true;
        }

        return false;
    }
}
"@

$lastTypingEmit = $false
$lastTypingTime = [DateTime]::MinValue
$lastToastState = $false
$lastFullscreenState = $false
$lastAfkState = $false
$tickCount = 0

while ($true) {
    $now = [DateTime]::UtcNow

    # Deteksi aktivitas input sistem global (Keyboard & Mouse)
    $idleMs = [Win32Sensor]::GetSystemIdleMs()
    # AFK jika lebih dari 120 detik (2 menit) tanpa input sama sekali
    $isAfkNow = ($idleMs -gt 120000)

    $pressed = [Win32Sensor]::IsAnyTypingKeyPressed()
    if ($pressed) {
        $lastTypingTime = $now
    }

    $isTypingNow = (($now - $lastTypingTime).TotalMilliseconds -lt 750)
    $toastNow = [Win32Sensor]::IsToastNotificationVisible()
    $newToastTriggered = ($toastNow -and (-not $lastToastState))
    $lastToastState = $toastNow

    # Check fullscreen setiap 2 siklus
    $tickCount++
    if ($tickCount % 2 -eq 0) {
        $fullscreenNow = [Win32Sensor]::IsForegroundFullscreen($LoonyPid)
    } else {
        $fullscreenNow = $lastFullscreenState
    }

    $typingChanged = ($isTypingNow -ne $lastTypingEmit)
    $fullscreenChanged = ($fullscreenNow -ne $lastFullscreenState)
    $afkChanged = ($isAfkNow -ne $lastAfkState)

    if ($typingChanged -or $newToastTriggered -or $fullscreenChanged -or $afkChanged -or ($tickCount -eq 1)) {
        $lastTypingEmit = $isTypingNow
        $lastFullscreenState = $fullscreenNow
        $lastAfkState = $isAfkNow
        $payload = [PSCustomObject]@{
            isTyping = [bool]$isTypingNow
            newNotification = [bool]$newToastTriggered
            isFullscreen = [bool]$fullscreenNow
            isAfk = [bool]$isAfkNow
        }
        Write-Output ($payload | ConvertTo-Json -Compress)
    }

    # Efisiensi Baterai Cerdas (Blind Spot #3):
    # Saat pengguna AFK, perlambat sensor ke 1.200ms (menghemat CPU hingga ~0.0%)
    # Saat aktif, jalankan responsif normal 120ms
    $sleepDuration = if ($isAfkNow) { 1200 } else { 120 }
    Start-Sleep -Milliseconds $sleepDuration
}
