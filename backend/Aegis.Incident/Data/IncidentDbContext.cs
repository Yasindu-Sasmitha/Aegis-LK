using Aegis.Incident.Models;
using Microsoft.EntityFrameworkCore;

namespace Aegis.Incident.Data;

public class IncidentDbContext : DbContext
{
    public IncidentDbContext(DbContextOptions<IncidentDbContext> options) : base(options) { }

    public DbSet<IncidentReport> Incidents => Set<IncidentReport>();
    public DbSet<Victim> Victims => Set<Victim>();
    public DbSet<Volunteer> Volunteers => Set<Volunteer>();
    public DbSet<RescueTeam> RescueTeams => Set<RescueTeam>();
    public DbSet<RescueMission> RescueMissions => Set<RescueMission>();
    public DbSet<MissionLog> MissionLogs => Set<MissionLog>();
    public DbSet<DamageReport> DamageReports => Set<DamageReport>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("incident");

        builder.Entity<IncidentReport>()
            .HasOne(i => i.RescueMission)
            .WithOne(m => m.Incident)
            .HasForeignKey<RescueMission>(m => m.IncidentId);

        builder.Entity<IncidentReport>()
            .HasOne(i => i.DamageReport)
            .WithOne(d => d.Incident)
            .HasForeignKey<DamageReport>(d => d.IncidentId);

        builder.Entity<IncidentReport>()
            .HasMany(i => i.Victims)
            .WithOne(v => v.Incident)
            .HasForeignKey(v => v.IncidentId);

        builder.Entity<IncidentReport>()
            .HasMany(i => i.Logs)
            .WithOne(l => l.Incident)
            .HasForeignKey(l => l.IncidentId);
    }
}