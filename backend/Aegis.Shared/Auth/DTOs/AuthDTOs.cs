using System.ComponentModel.DataAnnotations;

namespace Aegis.Shared.Auth.DTOs;

public class RegisterRequest
{
    [Required, EmailAddress]
    public required string Email { get; set; }

    [Required, MinLength(6)]
    public required string Password { get; set; }

    [Required, MinLength(2)]
    public required string FullName { get; set; }

    public string? District { get; set; }

    public string? PhoneNumber { get; set; }
}

public class CreateStaffUserRequest
{
    [Required, EmailAddress]
    public required string Email { get; set; }

    [Required, MinLength(6)]
    public required string Password { get; set; }

    [Required, MinLength(2)]
    public required string FullName { get; set; }

    [Required]
    public required string Role { get; set; }

    public string? District { get; set; }

    public string? PhoneNumber { get; set; }
}

public class LoginRequest
{
    [Required, EmailAddress]
    public required string Email { get; set; }

    [Required]
    public required string Password { get; set; }
}

public class AuthResponse
{
    public required string Token { get; set; }
    public required UserProfileResponse User { get; set; }
}

public class UserProfileResponse
{
    public Guid Id { get; set; }
    public required string Email { get; set; }
    public required string FullName { get; set; }
    public required string Role { get; set; }
    public string? District { get; set; }
    public string? PhoneNumber { get; set; }
    public DateTime CreatedAt { get; set; }
}
