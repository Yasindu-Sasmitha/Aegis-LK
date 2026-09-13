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

        // ── 5. System Roles List ────────────────────────────────────────────
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
        CreatedAt = user.CreatedAt
    };
}
