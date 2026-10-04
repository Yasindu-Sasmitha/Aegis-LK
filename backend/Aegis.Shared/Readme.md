# Aegis.Shared — Authentication, Authorization & Admin User Management

**Owned by:** All team members (shared module — edits require group-chat notice before merging)  
**Owns:** `backend/Aegis.Shared/`, `react/src/features/admin/`, `react/src/shared/auth/`

---

## 1. What this module does

`Aegis.Shared` is the centralized authentication and identity layer for the entire Aegis-LK platform. It:

- Issues and validates **JWT bearer tokens** used by every other module.
- Enforces **Role-Based Access Control (RBAC)** across all four domain modules.
- Provides the **Admin User Management** CRUD interface (view, create, edit, activate/deactivate users).
- Exposes `GET /api/auth/users/{id}` used by other modules (e.g. Incident) to resolve a reporter's minimal profile without crossing DB schema boundaries.

---

## 2. Roles

There are exactly **four roles** in this system. No others exist or should ever be added without updating `Roles.cs`:

| Role | Description |
|---|---|
| `Admin` | Full platform access. Manages users. |
| `DisasterOfficer` | Reviews AI predictions, approves missions and recovery plans. |
| `Responder` | Field responder — executes dispatches, confirms deliveries. |
| `Citizen` | Public user — submits incidents, aid requests, donations. |

> **IMPORTANT:** Public registration (`POST /api/auth/register`) **always creates a `Citizen`** account.  
> Staff roles are provisioned **only by Admins** via `POST /api/auth/admin/users`.

---

## 3. Pre-Seeded Demo Accounts

Password for all demo accounts: **`Aegis@123`**

| Email | Role | Use for |
|---|---|---|
| `admin@aegis.lk` | Admin | User management, full access |
| `officer@aegis.lk` | DisasterOfficer | Alert review, mission approval |
| `responder@aegis.lk` | Responder | Field delivery confirmation |
| `citizen@aegis.lk` | Citizen | Incident reporting, aid requests |

Quick-login buttons for all four accounts are available on both the React and Flutter login screens.

---

## 4. Directory Structure

```
backend/Aegis.Shared/
├── Auth/
│   ├── Data/
│   │   └── AuthDbContext.cs          # EF Core context, schema "auth"
│   ├── DTOs/
│   │   └── AuthDTOs.cs               # Request/response records for all auth endpoints
│   ├── Endpoints/
│   │   └── AuthEndpoints.cs          # All /api/auth/* minimal API endpoints
│   ├── Entities/
│   │   ├── User.cs                   # User entity with IsActive, Role, UpdatedAt
│   │   └── Roles.cs                  # Role constants + IsValid() + All list
│   └── Services/
│       ├── IJwtTokenService.cs       # Token generation interface
│       └── JwtTokenService.cs        # HS256 JWT implementation
└── Migrations/                       # EF Core migrations for "auth" schema

react/src/
├── shared/auth/
│   ├── authTypes.ts                  # TypeScript interfaces for all auth DTOs
│   ├── authApi.ts                    # Fetch clients for all /api/auth/* endpoints
│   └── AuthContext.tsx               # React context providing user/token state
└── features/admin/
    ├── UserManagementPage.tsx        # Full Admin User Management UI
    └── index.ts                      # Barrel export
```

---

## 5. API Endpoints

### Public

| Method & Route | Auth | Description |
|---|---|---|
| `POST /api/auth/register` | None | Public registration — **always creates `Citizen`** |
| `POST /api/auth/login` | None | Returns JWT + user profile |
| `GET /api/auth/roles` | None | Lists all valid roles |

### Authenticated

| Method & Route | Auth | Description |
|---|---|---|
| `GET /api/auth/me` | Any role | Returns current user's profile |
| `GET /api/auth/users/{id}` | Any role | Minimal profile lookup by ID (used by other modules) |

### Admin-Only

| Method & Route | Auth | Description |
|---|---|---|
| `GET /api/auth/admin/users` | Admin | List all users with optional `search`, `role`, `isActive` filters |
| `POST /api/auth/admin/users` | Admin | Create a staff account with any role |
| `PUT /api/auth/admin/users/{id}` | Admin | Update profile, role, district, phone, and optionally password |
| `PATCH /api/auth/admin/users/{id}/status` | Admin | Activate or deactivate a user account |

### Admin Safety Guards

- An Admin **cannot deactivate their own account**.
- An Admin **cannot revoke their own Admin role**.
- If only one active Admin exists, that account **cannot be downgraded or deactivated** (prevents total lockout).

---

## 6. JWT Token

- Algorithm: **HS256**
- Signing key: stored in `dotnet user-secrets` as `Jwt:SigningKey` — **never committed to git**.
- Claims: `sub` (user GUID), `email`, `role`, `name`.
- Expiry: configurable via `Jwt:ExpiryMinutes` in `appsettings.json`.
- All other modules read the `role` claim to enforce RBAC via `.RequireAuthorization(policy => policy.RequireRole(...))`.

---

## 7. React Admin User Management

An Admin-only view (`react/src/features/admin/UserManagementPage.tsx`) accessible from the main navigation.

**Features:**
- Search users by name or email.
- Filter by role and active status.
- Create new user (any role) via modal form.
- Edit profile, role, district, phone, and optionally reset password.
- Activate / Deactivate user with one click.
- Password hashes are **never returned** to the frontend — the API only returns `UserProfileResponse`.

**Navigation:** wired into `react/src/App.tsx` with `NavView = 'user-management'`; the sidebar link is visible only to `Admin` role.

---

## 8. Database

Schema: **`auth`** (`builder.HasDefaultSchema("auth")` in `AuthDbContext`).

| Column | Type | Notes |
|---|---|---|
| `Id` | `Guid` (PK) | Auto-generated |
| `Email` | `string` (unique) | Lowercased on write |
| `FullName` | `string` | |
| `Role` | `string` | One of the four valid roles |
| `District` | `string?` | Optional |
| `PhoneNumber` | `string?` | Optional |
| `PasswordHash` | `string` | ASP.NET Core `IPasswordHasher<User>` |
| `IsActive` | `bool` | Defaults `true`; deactivated users cannot log in |
| `CreatedAt` | `DateTime` | UTC |
| `UpdatedAt` | `DateTime?` | UTC; set on every admin edit |

---

## 9. Migration Commands

```powershell
# Add a migration
dotnet ef migrations add <Name> --project Aegis.Shared --startup-project Aegis.Api --context AuthDbContext

# Apply migrations
dotnet ef database update --project Aegis.Shared --startup-project Aegis.Api --context AuthDbContext
```

Set secrets (never edit appsettings.json directly):
```powershell
cd backend/Aegis.Api
dotnet user-secrets set "Jwt:SigningKey" "your-secret-key-here"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=aegis_lk;Username=postgres;Password=YOUR_PASSWORD"
```

---

## 10. Rules for Other Modules

1. **Never read `auth.Users` directly from another module's DbContext.** Call `GET /api/auth/users/{id}` instead.
2. **Never add a role** without updating `Roles.cs` and group-chat sign-off — other modules' RBAC depends on these constants.
3. **Never weaken** `POST /api/auth/register` — it must always enforce `Role = Citizen`.
4. New Admin-only endpoints must use `.RequireAuthorization(policy => policy.RequireRole(Roles.Admin))`.
