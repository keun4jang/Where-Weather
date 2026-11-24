# 내 PC 자동 동기화 (Windows)

GitHub의 `main` 브랜치를 `C:\Projects\Where-Weather`에 자동으로 받아옵니다.
로그인할 때와 10분마다 조용히 실행됩니다 (창이 뜨지 않음).

## 설치 (한 번만)

1. [Git for Windows](https://git-scm.com/download/win) 설치 (이미 있으면 생략)
2. PowerShell을 열고 아래 두 줄 실행:

```powershell
iwr https://raw.githubusercontent.com/keun4jang/Where-Weather/main/scripts/windows/setup-auto-sync.ps1 -OutFile $env:TEMP\ww-sync.ps1
powershell -ExecutionPolicy Bypass -File $env:TEMP\ww-sync.ps1
```

`C:\Projects\Where-Weather`가 비어 있으면 자동으로 clone 합니다.
이미 `git clone`된 폴더면 그대로 씁니다.
파일이 있는데 git 저장소가 아니면, 덮어쓰지 않도록 멈춥니다.

## 동작 규칙

- 단방향: GitHub → PC. PC에서 고친 내용은 GitHub에 올리지 않습니다.
- PC에서 고친 파일과 겹치면 덮어쓰지 않고 건너뜁니다 (로그에 기록).
- 로그: `%LOCALAPPDATA%\WhereWeatherSync\sync.log`

## 끄기

```powershell
Unregister-ScheduledTask -TaskName WhereWeather-AutoSync -Confirm:$false
```
