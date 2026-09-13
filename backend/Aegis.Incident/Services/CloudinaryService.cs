using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace Aegis.Incident.Services;

public class CloudinarySettings
{
    public string CloudName { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string ApiSecret { get; set; } = string.Empty;
}

public class CloudinaryService
{
    private readonly Cloudinary _cloudinary;

    public CloudinaryService(CloudinarySettings settings)
    {
        var account = new Account(settings.CloudName, settings.ApiKey, settings.ApiSecret);
        _cloudinary = new Cloudinary(account);
    }

    /// <summary>
    /// Uploads an incident photo to Cloudinary and returns its public, permanent URL.
    /// Returns null on failure — caller decides how to handle (never block report creation on this).
    /// </summary>
    public async Task<string?> UploadIncidentPhotoAsync(Stream fileStream, string fileName, Guid incidentId)
    {
        try
        {
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(fileName, fileStream),
                Folder = "aegis-lk/incidents",
                PublicId = incidentId.ToString(),
                Overwrite = true,
            };

            var result = await _cloudinary.UploadAsync(uploadParams);

            if (result.StatusCode != System.Net.HttpStatusCode.OK)
                return null;

            return result.SecureUrl?.ToString();
        }
        catch
        {
            return null;
        }
    }
}