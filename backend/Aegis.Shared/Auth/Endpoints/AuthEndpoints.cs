using System.Security.Claims;
using Aegis.Shared.Auth.Data;
using Aegis.Shared.Auth.DTOs;
using Aegis.Shared.Auth.Entities;
using Aegis.Shared.Auth.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Aegis.Shared.Auth.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Authentication");

        // ── 1. Public Registration (Citizen Only) ───────────────────────────
        group.MapPost("/register", async (
            RegisterRequest req,
            AuthDbContext db,
            IJwtTokenService jwtService,
            IPasswordHasher<User> hasher) =>
        {
            var normalizedEmail = req.Email.Trim().ToLowerInvariant();
            var existing = await db.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
            if (existing)
            {
                return Results.BadRequest(new { error = "An account with this email address already exists." });
            }

            var user = new User
            {
                Email = normalizedEmail,
                FullName = req.FullName.Trim(),
                Role = Roles.Citizen, // Enforce Citizen role for public registrations
                District = req.District?.Trim(),
                PhoneNumber = req.PhoneNumber?.Trim(),
                PasswordHash = "",
                CreatedAt = DateTime.UtcNow
            };
            user.PasswordHash = hasher.HashPassword(user, req.Password);

            db.Users.Add(user);
            await db.SaveChangesAsync();

            var token = jwtService.GenerateToken(user);
            return Results.Created($"/api/auth/users/{user.Id}", new AuthResponse
            {
                Token = token,
                User = MapToProfile(user)
            });
        });

        // ── 2. Login ────────────────────────────────────────────────────────
        group.MapPost("/login", async (
            LoginRequest req,
            AuthDbContext db,
            IJwtTokenService jwtService,
            IPasswordHasher<User> hasher) =>
        {
            var normalizedEmail = req.Email.Trim().ToLowerInvariant();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

            if (user == null || !user.IsActive)
            {
                return Results.Unauthorized();
            }

            var verifyResult = hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
            if (verifyResult == PasswordVerificationResult.Failed)
            {
                return Results.Unauthorized();
            }

            var token = jwtService.GenerateToken(user);
            return Results.Ok(new AuthResponse
            {
                Token = token,
                User = MapToProfile(user)
            });
        });

        // ── 3. Current User Profile (Authenticated) ─────────────────────────
        group.MapGet("/me", async (
            ClaimsPrincipal principal,
            AuthDbContext db) =>
        {
            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Results.Unauthorized();
            }

            var user = await db.Users.FindAsync(userId);
            if (user == null || !user.IsActive)
            {
                return Results.NotFound(new { error = "User not found or account is deactivated." });
            }

            return Results.Ok(MapToProfile(user));
        }).RequireAuthorization();

        // ── Look up a single user by ID (any authenticated user) ────────────
        // Used by other modules (e.g. Incident) to show a reporter's contact
        // info to an officer — read-only, minimal profile only.
        group.MapGet("/users/{id:guid}", async (Guid id, AuthDbContext db) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user is null)
                return Results.NotFound();

            return Results.Ok(MapToProfile(user));
        }).RequireAuthorization();

        // ── 4. Staff Account Provisioning (Admin Only) ──────────────────────
        group.MapPost("/admin/users", async (
            CreateStaffUserRequest req,
            AuthDbContext db,
            IPasswordHasher<User> hasher) =>
        {
            if (!Roles.IsValid(req.Role))
            {
                return Results.BadRequest(new { error = $"Invalid role. Allowed roles: {string.Join(", ", Roles.All)}" });
            }

            var normalizedEmail = req.Email.Trim().ToLowerInvariant();
            var existing = await db.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
            if (existing)
            {
                return Results.BadRequest(new { error = "An account with this email address already exists." });
            }

            var user = new User
            {
                Email = normalizedEmail,
                FullName = req.FullName.Trim(),
                Role = req.Role,
                District = req.District?.Trim(),
                PhoneNumber = req.PhoneNumber?.Trim(),
                PasswordHash = "",
                CreatedAt = DateTime.UtcNow
            };
            user.PasswordHash = hasher.HashPassword(user, req.Password);

            db.Users.Add(user);
            await db.SaveChangesAsync();

            return Results.Created($"/api/auth/users/{user.Id}", MapToProfile(user));
        }).RequireAuthorization(policy => policy.RequireRole(Roles.Admin));

        // ── 5. Admin List Users (Admin Only) ────────────────────────────────
        group.MapGet("/admin/users", async (
            string? search,
            string? role,
            bool? isActive,
            AuthDbContext db) =>
        {
            var query = db.Users.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(u => u.FullName.ToLower().Contains(s) || u.Email.ToLower().Contains(s));
            }

            if (!string.IsNullOrWhiteSpace(role))
            {
                query = query.Where(u => u.Role == role);
            }

            if (isActive.HasValue)
            {
                query = query.Where(u => u.IsActive == isActive.Value);
            }

            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new UserProfileResponse
                {
                    Id = u.Id,
                    Email = u.Email,
                    FullName = u.FullName,
                    Role = u.Role,
                    District = u.District,
                    PhoneNumber = u.PhoneNumber,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    UpdatedAt = u.UpdatedAt
                })
                .ToListAsync();

            return Results.Ok(users);
        }).RequireAuthorization(policy => policy.RequireRole(Roles.Admin));

        // ── 6. Admin Update User Profile/Role (Admin Only) ───────────────────
        group.MapPut("/admin/users/{id:guid}", async (
            Guid id,
            UpdateAdminUserRequest req,
            ClaimsPrincipal principal,
            AuthDbContext db,
            IPasswordHasher<User> hasher) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user == null)
            {
                return Results.NotFound(new { error = "User not found." });
            }

            if (!Roles.IsValid(req.Role))
            {
                return Results.BadRequest(new { error = $"Invalid role. Allowed roles: {string.Join(", ", Roles.All)}" });
            }

            var normalizedEmail = req.Email.Trim().ToLowerInvariant();
            var emailInUse = await db.Users.AnyAsync(u => u.Id != id && u.Email.ToLower() == normalizedEmail);
            if (emailInUse)
            {
                return Results.BadRequest(new { error = "An account with this email address already exists." });
            }

            var currentUserIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                ?? principal.FindFirst("sub")?.Value;
            Guid.TryParse(currentUserIdClaim, out var currentUserId);

            if (currentUserId == id && user.Role == Roles.Admin && req.Role != Roles.Admin)
            {
                return Results.BadRequest(new { error = "Administrators cannot revoke their own Administrator role." });
            }

            if (user.Role == Roles.Admin && req.Role != Roles.Admin)
            {
                var activeAdminCount = await db.Users.CountAsync(u => u.Role == Roles.Admin && u.IsActive);
                if (activeAdminCount <= 1)
                {
                    return Results.BadRequest(new { error = "Cannot change the role of the last active Administrator." });
                }
            }

            if (!string.IsNullOrWhiteSpace(req.NewPassword))
            {
                if (req.NewPassword.Length < 6)
                {
                    return Results.BadRequest(new { error = "Password must be at least 6 characters." });
                }
                user.PasswordHash = hasher.HashPassword(user, req.NewPassword);
            }

            user.FullName = req.FullName.Trim();
            user.Email = normalizedEmail;
            user.Role = req.Role;
            user.District = req.District?.Trim();
            user.PhoneNumber = req.PhoneNumber?.Trim();
            user.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();

            return Results.Ok(MapToProfile(user));
        }).RequireAuthorization(policy => policy.RequireRole(Roles.Admin));

        // ── 7. Admin Update User Active Status (Admin Only) ──────────────────
        group.MapPatch("/admin/users/{id:guid}/status", async (
            Guid id,
            SetUserStatusRequest req,
            ClaimsPrincipal principal,
            AuthDbContext db) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user == null)
            {
                return Results.NotFound(new { error = "User not found." });
            }

            var currentUserIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                ?? principal.FindFirst("sub")?.Value;
            if (Guid.TryParse(currentUserIdClaim, out var currentUserId) && currentUserId == id && !req.IsActive)
            {
                return Results.BadRequest(new { error = "Administrators cannot deactivate their own account." });
            }

            if (!req.IsActive && user.Role == Roles.Admin)
            {
                var activeAdminCount = await db.Users.CountAsync(u => u.Role == Roles.Admin && u.IsActive);
                if (activeAdminCount <= 1)
                {
                    return Results.BadRequest(new { error = "Cannot deactivate the last active Administrator account." });
                }
            }

            user.IsActive = req.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();

            return Results.Ok(MapToProfile(user));
        }).RequireAuthorization(policy => policy.RequireRole(Roles.Admin));

        // ── 8. System Roles List ────────────────────────────────────────────
        group.MapGet("/roles", () => Results.Ok(Roles.All));

        return app;
    }

    private static UserProfileResponse MapToProfile(User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        FullName = user.FullName,
        Role = user.Role,
        District = user.District,
        PhoneNumber = user.PhoneNumber,
        IsActive = user.IsActive,
        CreatedAt = user.CreatedAt,
        UpdatedAt = user.UpdatedAt
    };
}
