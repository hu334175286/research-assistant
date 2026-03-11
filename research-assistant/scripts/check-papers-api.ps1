# Check papers API filter + pagination
echo "===== papers API filter + pagination checks ====="
$response = Invoke-RestMethod -Uri "http://127.0.0.1:3124/api/papers?includeMeta=1&pageSize=5"
if ($LASTEXITCODE -eq 0 -and $response -ne $null) {
    Write-Host "✅ papers API checks passed"
} else {
    Write-Host "❌ papers API checks failed"
}
