using Aegis.Shared.Auth.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Aegis.Shared.Auth.Data;

public static class AuthDataSeeder
{
    public const string DefaultPassword = "Aegis@123";

    public static async Task SeedAsync(AuthDbContext db)
    {
        // Ensure schema and table exist if migrations are running or dev environment
        await db.Database.EnsureCreatedAsync();

        var hasher = new PasswordHasher<User>();

        var defaultUsers = new List<(string email, string name, string role, string district, string phone)>
        {
            ("admin@aegis.lk", "System Administrator", Roles.Admin, "Colombo", "+94112345670"),
            ("officer@aegis.lk", "DMC Disaster Officer", Roles.DisasterOfficer, "Kandy", "+94812345671"),
            ("responder@aegis.lk", "Search & Rescue Team Lead", Roles.Responder, "Ratnapura", "+94452345672"),
            ("citizen@aegis.lk", "Kasun Perera", Roles.Citizen, "Gampaha", "+94332345673")
        };

        foreach (var (email, name, role, district, phone) in defaultUsers)
        {
            var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (existing == null)
            {
                var user = new User
                {
                    Email = email,
                    FullName = name,
                    Role = role,
                    District = district,
                    PhoneNumber = phone,
                    PasswordHash = "", // set below
                    CreatedAt = DateTime.UtcNow
                };
                user.PasswordHash = hasher.HashPassword(user, DefaultPassword);
                db.Users.Add(user);
            }
        }

        await db.SaveChangesAsync();
    }
}
