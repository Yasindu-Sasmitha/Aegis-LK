using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Aegis.Recovery.Models;
using Microsoft.EntityFrameworkCore;

namespace Aegis.Recovery.Data;

public static class RecoveryDataSeeder
{
    public static async Task SeedAsync(RecoveryDbContext db)
    {
        await db.Database.EnsureCreatedAsync();

        if (!await db.Shelters.AnyAsync())
        {
            var shelters = new List<Shelter>
            {
                new Shelter
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                    Name = "Kalutara Royal College Emergency Shelter",
                    Location = "Galle Road, Kalutara",
                    District = "Kalutara",
                    Latitude = 6.5854,
                    Longitude = 79.9607,
                    Capacity = 200,
                    CurrentOccupancy = 45,
                    Status = "Active",
                    ContactPerson = "Sunil Perera",
                    ContactPhone = "+94771234567",
                    Facilities = "Water, Medical, Food Supply, Sanitation"
                },
                new Shelter
                {
                    Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                    Name = "Ratnapura Town Hall Community Relief Center",
                    Location = "Main Street, Ratnapura",
                    District = "Ratnapura",
                    Latitude = 6.6828,
                    Longitude = 80.3992,
                    Capacity = 150,
                    CurrentOccupancy = 120,
                    Status = "Active",
                    ContactPerson = "Kamlika Jayasinghe",
                    ContactPhone = "+94719876543",
                    Facilities = "Water, Generator, Blankets, Kitchen"
                },
                new Shelter
                {
                    Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                    Name = "Matara Mahinda College Relief Shelter",
                    Location = "Beach Road, Matara",
                    District = "Matara",
                    Latitude = 5.9496,
                    Longitude = 80.5469,
                    Capacity = 300,
                    CurrentOccupancy = 300,
                    Status = "Full",
                    ContactPerson = "Nimal Siriwardena",
                    ContactPhone = "+94705554433",
                    Facilities = "Full Support Center, Medical Aid"
                }
            };
            db.Shelters.AddRange(shelters);
        }

        if (!await db.NGOs.AnyAsync())
        {
            var ngos = new List<NGO>
            {
                new NGO
                {
                    Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
                    Name = "Red Cross Sri Lanka",
                    ContactEmail = "info@redcross.lk",
                    ContactPhone = "+94112691095",
                    Sectors = "Medical, Emergency Relief, Water & Sanitation",
                    OperatingDistricts = "Kalutara, Ratnapura, Matara, Colombo",
                    AssignedBudget = 5000000.00m,
                    Status = "Active"
                },
                new NGO
                {
                    Id = Guid.Parse("55555555-5555-5555-5555-555555555555"),
                    Name = "Habitat for Humanity Sri Lanka",
                    ContactEmail = "contact@habitat.lk",
                    ContactPhone = "+94112508840",
                    Sectors = "Housing Reconstruction, Infrastructure, Shelter Repair",
                    OperatingDistricts = "Kalutara, Ratnapura, Galle",
                    AssignedBudget = 8500000.00m,
                    Status = "Active"
                },
                new NGO
                {
                    Id = Guid.Parse("66666666-6666-6666-6666-666666666666"),
                    Name = "Sarvodaya Shramadana Movement",
                    ContactEmail = "help@sarvodaya.org",
                    ContactPhone = "+94112655255",
                    Sectors = "Community Support, Food Distribution, Livelihood Recovery",
                    OperatingDistricts = "All Districts",
                    AssignedBudget = 3000000.00m,
                    Status = "Active"
                }
            };
            db.NGOs.AddRange(ngos);
        }

        await db.SaveChangesAsync();
    }
}
