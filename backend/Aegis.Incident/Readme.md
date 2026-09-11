# Aegis.Incident — Incident & Rescue Operations Module

Owns citizen disaster reports, officer assessment/approval workflow, and damage reporting.
See `INCIDENT_MODULE_PLAN.md` (project root) for the full design and build plan.

## Required local secrets

This module needs the following set via `dotnet user-secrets` in `backend/Aegis.Api/`
(these are never committed — each developer sets their own):

```powershell
cd backend/Aegis.Api
dotnet user-secrets set "Cloudinary:CloudName" "<your_cloud_name>"
dotnet user-secrets set "Cloudinary:ApiKey" "<your_api_key>"
dotnet user-secrets set "Cloudinary:ApiSecret" "<your_api_secret>"
```

Get these from a free account at https://cloudinary.com/users/register/free — see
Dashboard → "Go to API Keys". Free tier (25GB storage/bandwidth) is more than sufficient.

Used by `Services/CloudinaryService.cs` for `POST /api/incidents/{id}/photo`, which uploads a
citizen's incident photo and stores its permanent public URL on `IncidentReport.PhotoUrl`.
This URL is later consumed by the Plausibility Agent's image-analysis tool.

## Agent services (Python, run separately)

The Incident Assessment Agent runs as its own local process, same pattern as Weather's agent:

```powershell
cd agentic-ai/agents
# copy .env.example -> .env and fill in GOOGLE_API_KEY (see agentic-ai/agents/.env.example)
uvicorn incident_agent_service:app --host 127.0.0.1 --port 8002
```

`Aegis.Api`'s `IncidentAgentClient` calls this service at `http://127.0.0.1:8002`. If this
service isn't running, `POST /api/incidents/{id}/assess` degrades gracefully — it returns a
502 and logs the failure to `MissionLog` rather than crashing.

## Why photo upload uses Cloudinary, not local disk

Local static-file storage (e.g. saving to `wwwroot/uploads/`) would break on redeployment —
most free/student-tier cloud hosts use ephemeral or container-based filesystems, so anything
written to local disk is lost on restart, and may not even be shared across instances. Cloudinary
gives a genuinely permanent, publicly-fetchable URL regardless of where or how many times the API
is deployed. This also satisfies the assignment's third-party service integration requirement.