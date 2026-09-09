using System;
using System.Collections.Generic;

namespace Aegis.Recovery.Models;

public class Shelter
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int Capacity { get; set; }
    public int CurrentOccupancy { get; set; }
    public string Status { get; set; } = "Active"; // Active | Full | Inactive
    public string ContactPerson { get; set; } = string.Empty;
    public string ContactPhone { get; set; } = string.Empty;
    public string Facilities { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<AidRequest> AidRequests { get; set; } = new List<AidRequest>();
    public ICollection<Donation> Donations { get; set; } = new List<Donation>();
}
