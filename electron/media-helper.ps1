param(
    [string]$Action = "status"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "SilentlyContinue"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class Win32MediaKeys {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);

    public const int KEYEVENTF_EXTENDEDKEY = 0x0001;
    public const int KEYEVENTF_KEYUP = 0x0002;
    public const byte VK_MEDIA_NEXT_TRACK = 0xB0;
    public const byte VK_MEDIA_PREV_TRACK = 0xB1;
    public const byte VK_MEDIA_PLAY_PAUSE = 0xB3;
    public const int SW_RESTORE = 9;
    public const int SW_SHOW = 5;

    public static void TapKey(byte vk) {
        keybd_event(vk, 0, KEYEVENTF_EXTENDEDKEY, UIntPtr.Zero);
        keybd_event(vk, 0, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    public static void FocusWindow(IntPtr hWnd) {
        if (hWnd == IntPtr.Zero) return;
        if (IsIconic(hWnd)) {
            ShowWindow(hWnd, SW_RESTORE);
        } else {
            ShowWindow(hWnd, SW_SHOW);
        }
        SwitchToThisWindow(hWnd, true);
        SetForegroundWindow(hWnd);
    }
}
"@

function Invoke-WinRtAwait($WinRtTask, $ResultType) {
    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    })[0]
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(1500) | Out-Null
    return $netTask.Result
}

$gsmtcSession = $null
try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
    $mgr = Invoke-WinRtAwait ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
    if ($null -ne $mgr) {
        $gsmtcSession = $mgr.GetCurrentSession()
        if ($null -eq $gsmtcSession) {
            $allSessions = $mgr.GetSessions()
            if ($null -ne $allSessions) {
                foreach ($s in $allSessions) {
                    try {
                        $pb = $s.GetPlaybackInfo()
                        if ($null -ne $pb -and $pb.PlaybackStatus.ToString() -eq "Playing") {
                            $gsmtcSession = $s
                            break
                        }
                    } catch {}
                }
                if ($null -eq $gsmtcSession -and $allSessions.Count -gt 0) {
                    $gsmtcSession = $allSessions[0]
                }
            }
        }
    }
} catch {
    $gsmtcSession = $null
}

if ($Action -eq "play-pause") {
    $handled = $false
    if ($null -ne $gsmtcSession) {
        try {
            $res = Invoke-WinRtAwait ($gsmtcSession.TryTogglePlayPauseAsync()) ([bool])
            if ($res) { $handled = $true }
        } catch {}
    }
    if (-not $handled) {
        [Win32MediaKeys]::TapKey([Win32MediaKeys]::VK_MEDIA_PLAY_PAUSE)
    }
    Start-Sleep -Milliseconds 180
} elseif ($Action -eq "next") {
    $handled = $false
    if ($null -ne $gsmtcSession) {
        try {
            $res = Invoke-WinRtAwait ($gsmtcSession.TrySkipNextAsync()) ([bool])
            if ($res) { $handled = $true }
        } catch {}
    }
    if (-not $handled) {
        [Win32MediaKeys]::TapKey([Win32MediaKeys]::VK_MEDIA_NEXT_TRACK)
    }
    Start-Sleep -Milliseconds 220
} elseif ($Action -eq "prev") {
    $handled = $false
    if ($null -ne $gsmtcSession) {
        try {
            $res = Invoke-WinRtAwait ($gsmtcSession.TrySkipPreviousAsync()) ([bool])
            if ($res) { $handled = $true }
        } catch {}
    }
    if (-not $handled) {
        [Win32MediaKeys]::TapKey([Win32MediaKeys]::VK_MEDIA_PREV_TRACK)
    }
    Start-Sleep -Milliseconds 220
}

# Baca status & judul media terbaru
$title = ""
$artist = ""
$isPlaying = $false
$source = ""

try {
    if ($null -ne $mgr) {
        $gsmtcSession = $mgr.GetCurrentSession()
        if ($null -eq $gsmtcSession) {
            $allSessions = $mgr.GetSessions()
            if ($null -ne $allSessions) {
                foreach ($s in $allSessions) {
                    try {
                        $pb = $s.GetPlaybackInfo()
                        if ($null -ne $pb -and $pb.PlaybackStatus.ToString() -eq "Playing") {
                            $gsmtcSession = $s
                            break
                        }
                    } catch {}
                }
                if ($null -eq $gsmtcSession -and $allSessions.Count -gt 0) {
                    $gsmtcSession = $allSessions[0]
                }
            }
        }
    }
    if ($null -ne $gsmtcSession) {
        $info = Invoke-WinRtAwait ($gsmtcSession.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
        $playback = $gsmtcSession.GetPlaybackInfo()
        if ($null -ne $info) {
            $title = [string]$info.Title
            $artist = [string]$info.Artist
        }
        if ($null -ne $playback) {
            $statusStr = $playback.PlaybackStatus.ToString()
            $isPlaying = ($statusStr -eq "Playing")
        }
        $source = [string]$gsmtcSession.SourceAppUserModelId
    }
} catch {}

# Fallback: Jika GSMTC kosong atau tidak terdeteksi playing, cek judul jendela aplikasi pemutar musik / browser
if ([string]::IsNullOrWhiteSpace($title) -or -not $isPlaying) {
    try {
        $procs = Get-Process -Name "Spotify","vlc","Music.UI","AIMP","foobar2000","wmplayer","chrome","msedge","brave","firefox","opera" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" }
        foreach ($p in $procs) {
            $wTitle = $p.MainWindowTitle.Trim()
            $pName = $p.ProcessName.ToLower()
            if ($pName -eq "spotify") {
                if ($wTitle -notmatch "^Spotify(\s+Free|\s+Premium)?$") {
                    if ($wTitle -match "^(.+?)\s+-\s+(.+)$") {
                        $artist = $matches[1].Trim()
                        $title = $matches[2].Trim()
                    } else {
                        $title = $wTitle
                        $artist = "Spotify"
                    }
                    $isPlaying = $true
                    $source = "Spotify"
                    break
                }
            } elseif ($pName -in @("vlc","aimp","foobar2000","wmplayer","music.ui")) {
                $clean = $wTitle -replace "\s*-\s*VLC media player$",""
                if (-not [string]::IsNullOrWhiteSpace($clean) -and $clean -ne "VLC media player") {
                    $title = $clean
                    $artist = $p.ProcessName
                    $isPlaying = $true
                    $source = $p.ProcessName
                    break
                }
            } elseif ($wTitle -match "YouTube|Spotify|SoundCloud|Apple Music|Noice|Podcast|Music|Lagu|Audio|Deezer|Tidal|Joox") {
                $clean = $wTitle -replace "\s*-\s*(Google Chrome|Microsoft\s*Edge|Brave|Mozilla Firefox|Opera).*$",""
                $clean = $clean -replace "\s*-\s*YouTube(\s+Music)?$",""
                if (-not [string]::IsNullOrWhiteSpace($clean)) {
                    $title = $clean
                    $artist = "Media Pemutar"
                    $isPlaying = $true
                    $source = $p.ProcessName
                    break
                }
            }
        }
    } catch {}
}

if ($Action -eq "focus-app") {
    try {
        $targetHandle = [IntPtr]::Zero
        $srcLower = ([string]$source).ToLower()

        $procs = Get-Process -Name "Spotify","vlc","Music.UI","AIMP","foobar2000","wmplayer","chrome","msedge","brave","firefox","opera" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero }

        # Prioritas 1: Cocokkan dengan $source dari GSMTC atau fallback
        if (-not [string]::IsNullOrWhiteSpace($srcLower)) {
            foreach ($p in $procs) {
                $pName = $p.ProcessName.ToLower()
                if ($srcLower.Contains($pName) -or ($srcLower.Contains("spotify") -and $pName -eq "spotify") -or ($srcLower.Contains("chrome") -and $pName -eq "chrome") -or ($srcLower.Contains("msedge") -and $pName -eq "msedge") -or ($srcLower.Contains("brave") -and $pName -eq "brave") -or ($srcLower.Contains("firefox") -and $pName -eq "firefox")) {
                    $targetHandle = $p.MainWindowHandle
                    break
                }
            }
        }

        # Prioritas 2: Jika belum ketemu, cari jendela yang judulnya mengandung $title atau platform musik/browser
        if ($targetHandle -eq [IntPtr]::Zero -and -not [string]::IsNullOrWhiteSpace($title)) {
            foreach ($p in $procs) {
                if ($p.MainWindowTitle -like "*$title*") {
                    $targetHandle = $p.MainWindowHandle
                    break
                }
            }
        }

        # Prioritas 3: Ambil aplikasi media/browser aktif pertama
        if ($targetHandle -eq [IntPtr]::Zero -and $procs.Count -gt 0) {
            $targetHandle = $procs[0].MainWindowHandle
        }

        if ($targetHandle -ne [IntPtr]::Zero) {
            [Win32MediaKeys]::FocusWindow($targetHandle)
        }
    } catch {}
}

$result = [PSCustomObject]@{
    title = $title
    artist = $artist
    isPlaying = [bool]$isPlaying
    source = $source
}

$result | ConvertTo-Json -Compress
