<#
  Where Weather — GitHub → 내 PC 자동 동기화 설정 (한 번만 실행)

  하는 일
    1. 폴더가 비어 있으면 GitHub에서 clone 한다.
    2. 작업 스케줄러에 "WhereWeather-AutoSync" 작업을 등록한다.
       로그인할 때 + 10분마다 GitHub의 main 브랜치를 받아온다 (창 안 뜸).

  실행 방법 (PowerShell, 관리자 권한 필요 없음)
    powershell -ExecutionPolicy Bypass -File .\setup-auto-sync.ps1

  끄기
    Unregister-ScheduledTask -TaskName WhereWeather-AutoSync -Confirm:$false

  안전장치
    - 내 PC에서 고친 파일은 덮어쓰지 않는다 (fast-forward만, 충돌 나면 건너뛰고 로그만 남김).
    - main이 아닌 다른 브랜치를 체크아웃해 두었으면 받아오기만 하고 파일은 건드리지 않는다.
    - 로그: %LOCALAPPDATA%\WhereWeatherSync\sync.log
#>
param(
  [string]$Path = 'C:\Projects\Where-Weather',
  [string]$RepoUrl = 'https://github.com/keun4jang/Where-Weather.git',
  [string]$Branch = 'main',
  [int]$Minutes = 10
)

$ErrorActionPreference = 'Stop'
$TaskName = 'WhereWeather-AutoSync'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host 'Git이 설치돼 있지 않아요. https://git-scm.com/download/win 에서 설치한 뒤 다시 실행하세요.' -ForegroundColor Red
  exit 1
}
$GitExe = (Get-Command git).Source

# ── 1. 저장소 준비 ────────────────────────────────────────────────────────────
if (-not (Test-Path (Join-Path $Path '.git'))) {
  $hasFiles = (Test-Path $Path) -and (Get-ChildItem -Force $Path | Select-Object -First 1)
  if ($hasFiles) {
    Write-Host "$Path 에 파일이 있지만 git 저장소가 아니에요." -ForegroundColor Red
    Write-Host '덮어쓰지 않도록 멈춥니다. 폴더를 비우거나 다른 이름으로 옮긴 뒤 다시 실행하세요.'
    exit 1
  }
  Write-Host "GitHub에서 받아오는 중 → $Path"
  & $GitExe clone --branch $Branch $RepoUrl $Path
  if ($LASTEXITCODE -ne 0) { Write-Host 'clone 실패' -ForegroundColor Red; exit 1 }
} else {
  Write-Host "기존 저장소 사용: $Path"
}

# ── 2. 동기화 스크립트 (저장소 밖에 둬서 pull 중에 바뀌지 않게) ─────────────
$Home2 = Join-Path $env:LOCALAPPDATA 'WhereWeatherSync'
New-Item -ItemType Directory -Force -Path $Home2 | Out-Null
$SyncPs1 = Join-Path $Home2 'sync.ps1'
$Launcher = Join-Path $Home2 'run-hidden.vbs'
$Log = Join-Path $Home2 'sync.log'

@"
`$ErrorActionPreference = 'Continue'
`$git = '$GitExe'
`$repo = '$Path'
`$branch = '$Branch'
`$log = '$Log'
function Log(`$m) { Add-Content -Path `$log -Value ("{0:yyyy-MM-dd HH:mm:ss}  {1}" -f (Get-Date), `$m) -Encoding UTF8 }

# 로그가 너무 커지지 않게 (1MB 넘으면 새로 시작)
if ((Test-Path `$log) -and ((Get-Item `$log).Length -gt 1MB)) { Remove-Item `$log }

& `$git -C `$repo fetch --quiet origin `$branch 2>&1 | Out-Null
if (`$LASTEXITCODE -ne 0) { Log 'fetch 실패 (오프라인?)'; exit 0 }

`$current = (& `$git -C `$repo rev-parse --abbrev-ref HEAD).Trim()
if (`$current -ne `$branch) { Log "현재 브랜치가 `$current 라서 파일은 건드리지 않음 (fetch만 함)"; exit 0 }

`$local = (& `$git -C `$repo rev-parse HEAD).Trim()
`$remote = (& `$git -C `$repo rev-parse "origin/`$branch").Trim()
if (`$local -eq `$remote) { exit 0 }

`$out = & `$git -C `$repo merge --ff-only "origin/`$branch" 2>&1
if (`$LASTEXITCODE -eq 0) {
  Log ("업데이트: {0} → {1}" -f `$local.Substring(0,7), `$remote.Substring(0,7))
} else {
  Log ("건너뜀 (내 PC에서 고친 파일과 겹침): " + (`$out | Out-String).Trim())
}
"@ | Set-Content -Path $SyncPs1 -Encoding UTF8

# PowerShell 창이 10분마다 깜빡이지 않도록 VBS로 숨겨서 실행
@"
CreateObject("WScript.Shell").Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File ""$SyncPs1""", 0, False
"@ | Set-Content -Path $Launcher -Encoding ASCII

# ── 3. 작업 스케줄러 등록 ─────────────────────────────────────────────────────
$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "`"$Launcher`""
$atLogon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$every = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $Minutes)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew

try {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($atLogon, $every) `
    -Settings $settings -Description "GitHub $Branch → $Path 자동 동기화" -Force | Out-Null
} catch {
  # 일부 PC는 관리자 권한 없이 '로그인 시' 트리거를 막는다 → 10분 반복만 등록
  Write-Host '로그인 시 실행은 권한 문제로 빼고, 10분마다 실행만 등록합니다.' -ForegroundColor Yellow
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $every `
    -Settings $settings -Description "GitHub $Branch → $Path 자동 동기화" -Force | Out-Null
}

# 바로 한 번 실행
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $SyncPs1

Write-Host ''
Write-Host '완료! 이제 로그인할 때와' $Minutes '분마다 GitHub main을 자동으로 받아옵니다.' -ForegroundColor Green
Write-Host "로그: $Log"
Write-Host "끄기: Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false"
