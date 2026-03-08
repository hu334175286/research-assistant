param(
  [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'

function Test-Url {
  param(
    [string]$Url,
    [int]$TimeoutSec = 2
  )

  try {
    $r = Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec $TimeoutSec -UseBasicParsing
    return @{ ok = $true; status = [int]$r.StatusCode }
  } catch {
    $code = $null
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $code = [int]$_.Exception.Response.StatusCode
    }
    return @{ ok = $false; status = $code }
  }
}

function Get-PortState {
  param([int]$Port)

  $listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $Port }
  if ($listeners) {
    return ($listeners | Select-Object -First 1).LocalAddress
  }

  return $null
}

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

$ports = @(3000, 3124)
$candidates = @()

Write-Host '== 端口巡检（3000 / 3124）==' -ForegroundColor Cyan
foreach ($port in $ports) {
  $baseUrl = "http://127.0.0.1:$port"
  $quickUrl = "$baseUrl/quick"
  $listenAddress = Get-PortState -Port $port
  $probe = Test-Url -Url $quickUrl

  $candidates += [PSCustomObject]@{
    port = $port
    baseUrl = $baseUrl
    quickUrl = $quickUrl
    listening = [bool]$listenAddress
    listenAddress = $listenAddress
    ok = [bool]$probe.ok
    status = $probe.status
  }

  $listenText = if ($listenAddress) { "LISTEN @$listenAddress" } else { 'not-listening' }
  $httpText = if ($probe.ok) { "HTTP $($probe.status)" } else { "HTTP fail" }
  Write-Host ("[{0}] {1} | {2}" -f $port, $listenText, $httpText)
}

$target = $candidates | Where-Object { $_.ok } | Select-Object -First 1

if (-not $target) {
  $startPort = 3124
  if ($candidates | Where-Object { $_.port -eq 3124 -and $_.listening }) {
    $startPort = 3000
  }

  Write-Host "`n未检测到可访问 /quick，启动开发服务（port=$startPort）..." -ForegroundColor Yellow
  Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$root'; npm run dev -- --port $startPort"
  )

  Start-Sleep -Seconds 4

  $target = [PSCustomObject]@{
    port = $startPort
    baseUrl = "http://127.0.0.1:$startPort"
    quickUrl = "http://127.0.0.1:$startPort/quick"
  }
}

Write-Host "`n推荐打开：$($target.quickUrl)" -ForegroundColor Green

if (-not $NoOpen) {
  Start-Process $target.quickUrl | Out-Null
}
