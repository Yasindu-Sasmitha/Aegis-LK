namespace Aegis.Shared.Auth.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public required string Email { get; set; }

    public required string PasswordHash { get; set; }

    public required string FullName { get; set; }

    /// <summary>
    /// Role name: Admin, DisasterOfficer, Responder, Citizen
    /// </summary>
    public required string Role { get; set; }

    /// <summary>
    /// Plain string representation of district (e.g., "Colombo", "Kandy", "Ratnapura").
    /// Independent string field, not a foreign key to keep module schema boundaries strict.
    /// </summary>
    public string? District { get; set; }

    public string? PhoneNumber { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}

public static class Roles
{
    public const string Admin = "Admin";
    public const string DisasterOfficer = "DisasterOfficer";
    public const string Responder = "Responder";
    public const string Citizen = "Citizen";

    public static readonly string[] All = [Admin, DisasterOfficer, Responder, Citizen];

    public static bool IsValid(string role) => All.Contains(role);
}
