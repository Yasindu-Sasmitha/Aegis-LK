@echo off
echo Creating Aegis-LK folder structure...

for %%D in (
    backend\Aegis.Api
    backend\Aegis.Shared
    backend\Aegis.Weather
    backend\Aegis.Incident
    backend\Aegis.Resource
    backend\Aegis.Recovery
    backend\Aegis.Data
    backend\Aegis.Tests
    agentic-ai\agents
    agentic-ai\orchestrator
    agentic-ai\tests
    react\src\features\weather
    react\src\features\incident
    react\src\features\resource
    react\src\features\recovery
    react\src\shared\api
    react\src\shared\auth
    react\src\shared\layout
    react\src\shared\components
    flutter\lib\features\weather
    flutter\lib\features\incident
    flutter\lib\features\resource
    flutter\lib\features\recovery
    flutter\lib\shared\api
    flutter\lib\shared\auth
    flutter\lib\shared\widgets
    flutter\lib\shared\router
    docs\adr
    docs\diagrams
    .github\workflows
) do (
    mkdir "%%D" 2>nul
    echo. > "%%D\.gitkeep"
)

echo Done. Folder structure created.
pause
