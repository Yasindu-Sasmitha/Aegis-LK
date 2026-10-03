# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution/project files first for layer-cached restore
COPY backend/Aegis.slnx ./backend/Aegis.slnx
COPY backend/Aegis.Api/Aegis.Api.csproj ./backend/Aegis.Api/Aegis.Api.csproj
COPY backend/Aegis.Shared/Aegis.Shared.csproj ./backend/Aegis.Shared/Aegis.Shared.csproj
COPY backend/Aegis.Incident/Aegis.Incident.csproj ./backend/Aegis.Incident/Aegis.Incident.csproj
COPY backend/Aegis.Recovery/Aegis.Recovery.csproj ./backend/Aegis.Recovery/Aegis.Recovery.csproj
COPY backend/Aegis.Resource/Aegis.Resource.csproj ./backend/Aegis.Resource/Aegis.Resource.csproj
COPY backend/Aegis.Weather/Aegis.Weather.csproj ./backend/Aegis.Weather/Aegis.Weather.csproj
COPY backend/Aegis.Data/Aegis.Data.csproj ./backend/Aegis.Data/Aegis.Data.csproj

# Restore all dependencies
RUN dotnet restore backend/Aegis.Api/Aegis.Api.csproj

# Copy all backend source
COPY backend/ ./backend/

# Publish Release build
RUN dotnet publish backend/Aegis.Api/Aegis.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Copy published output only — no source, no SDK, no secrets
COPY --from=build /app/publish ./

# Render provides PORT at runtime; default to 10000
ENV PORT=10000
EXPOSE 10000

# Run the API
ENTRYPOINT ["dotnet", "Aegis.Api.dll"]
