param([int]$Port = 3000)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

foreach ($provider in @("GOOGLE", "GITHUB")) {
  $clientId = [Environment]::GetEnvironmentVariable("SUPABASE_AUTH_EXTERNAL_${provider}_CLIENT_ID")
  $secret = [Environment]::GetEnvironmentVariable("SUPABASE_AUTH_EXTERNAL_${provider}_SECRET")
  $enabled = ![string]::IsNullOrWhiteSpace($clientId) -and ![string]::IsNullOrWhiteSpace($secret)
  [Environment]::SetEnvironmentVariable(
    "SUPABASE_AUTH_EXTERNAL_${provider}_ENABLED",
    $enabled.ToString().ToLowerInvariant()
  )
  if (!$enabled) {
    Write-Host "$provider OAuth is disabled locally until both provider credentials are set."
  }
}

Push-Location $root
try {
  & npx supabase start --workdir $root
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase failed to start. Check Docker Desktop and retry."
  }

  $status = @(& npx supabase status --workdir $root --output env)
  if ($LASTEXITCODE -ne 0) {
    throw "Could not read local Supabase connection details."
  }

  $values = @{}
  foreach ($line in $status) {
    if ($line -match '^([A-Z_]+)=(.*)$') {
      $values[$matches[1]] = $matches[2].Trim().Trim('"')
    }
  }

  if (!$values.API_URL -or !$values.ANON_KEY -or !$values.SERVICE_ROLE_KEY) {
    throw "Supabase did not return its API URL and keys. Run 'npx supabase status' to inspect the local stack."
  }

  $envFile = Join-Path $root ".env.local"
  $lines = if (Test-Path $envFile) { @(Get-Content -LiteralPath $envFile) } else { @() }
  $settings = [ordered]@{
    NEXT_PUBLIC_SUPABASE_URL = $values.API_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY = $values.ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY = $values.SERVICE_ROLE_KEY
  }

  foreach ($name in $settings.Keys) {
    $line = "$name=$($settings[$name])"
    $index = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
      if ($lines[$i] -match "^\s*$([regex]::Escape($name))=") {
        $index = $i
        break
      }
    }
    if ($index -ge 0) { $lines[$index] = $line } else { $lines += $line }
  }

  [System.IO.File]::WriteAllLines($envFile, $lines, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Local Supabase credentials saved to .env.local (git-ignored)."
  & npm run dev -- --port $Port
  if ($LASTEXITCODE -ne 0) {
    throw "Next.js development server exited with an error."
  }
}
finally {
  Pop-Location
}
