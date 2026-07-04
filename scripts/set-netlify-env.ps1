param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("estraha6", "wc2026")]
  [string]$Site,

  [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY,
  [string]$FootballToken = $env:FOOTBALL_DATA_TOKEN
)

$ErrorActionPreference = "Stop"

$sites = @{
  estraha6 = @{
    Id = "7bcbff48-13f4-419d-97d3-c876d44d669f"
    Vars = @{
      SUPABASE_URL = "https://rodqybmuajlebyotmgmq.supabase.co"
      SUPABASE_ANON_KEY = "sb_publishable_HqmySh_KmRBO-UMKMnPTCA_9SB7wnV8"
      FOOTBALL_DATA_TOKEN = "c1f8079b0d644de2b86381c6aad8ddc3"
      SITE_GROUP_NAME = "استراحة 6"
      SITE_TAGLINE = "توقّعات لاستراحة 6. بطلٌ واحد. وافتخارٌ طوال الصيف."
      SITE_BOARD_EMPTY = "🏆 يظهر الترتيب عند انطلاق كأس العالم. سجّلوا استراحة 6 وابدؤوا التوقّع!"
    }
  }
  wc2026 = @{
    Id = "e3e9df13-7fd8-408e-a5e9-d04c93da0c1c"
    Vars = @{
      SUPABASE_URL = "https://aihjrgdzglrerkuxatvv.supabase.co"
      SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpaGpyZ2R6Z2xyZXJrdXhhdHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDc5NjEsImV4cCI6MjA5NjIyMzk2MX0.P9f2uW1_g3SxDvaKRcJafx5fXUED6oGGozskDNAjPk4"
      SITE_GROUP_NAME = "توقعاتنا"
      SITE_TAGLINE = "توقّعات مجموعتنا. بطلٌ واحد. وافتخارٌ طوال الصيف."
      SITE_BOARD_EMPTY = "🏆 يظهر الترتيب عند انطلاق كأس العالم. سجّلوا توقعاتكم وابدؤوا التوقّع!"
    }
  }
}

$cfg = $sites[$Site]
if ($ServiceRoleKey) { $cfg.Vars["SUPABASE_SERVICE_ROLE_KEY"] = $ServiceRoleKey }
if ($FootballToken -and $Site -eq "wc2026") { $cfg.Vars["FOOTBALL_DATA_TOKEN"] = $FootballToken }

foreach ($entry in $cfg.Vars.GetEnumerator()) {
  Write-Host "Setting $($entry.Key) on $Site..."
  netlify env:set $entry.Key $entry.Value --site $cfg.Id --context production --force
}

Write-Host "Done. Redeploy the site for build-time config to take effect."
