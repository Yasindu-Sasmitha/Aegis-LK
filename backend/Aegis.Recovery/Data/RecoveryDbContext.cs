using Aegis.Recovery.Models;
using Microsoft.EntityFrameworkCore;

namespace Aegis.Recovery.Data;

public class RecoveryDbContext : DbContext
{
    public RecoveryDbContext(DbContextOptions<RecoveryDbContext> options) : base(options) { }

    public DbSet<Shelter> Shelters => Set<Shelter>();
    public DbSet<AidRequest> AidRequests => Set<AidRequest>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<Compensation> Compensations => Set<Compensation>();
    public DbSet<InfrastructureDamage> InfrastructureDamages => Set<InfrastructureDamage>();
    public DbSet<NGO> NGOs => Set<NGO>();
    public DbSet<RecoveryPlan> RecoveryPlans => Set<RecoveryPlan>();
    public DbSet<RecoveryTask> RecoveryTasks => Set<RecoveryTask>();
    public DbSet<RecoveryReport> RecoveryReports => Set<RecoveryReport>();
    public DbSet<RecoveryWorkflowLog> RecoveryWorkflowLogs => Set<RecoveryWorkflowLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("recovery");

        // Shelter
        builder.Entity<Shelter>()
            .HasIndex(s => s.District);
        builder.Entity<Shelter>()
            .HasIndex(s => s.Status);

        // AidRequest
        builder.Entity<AidRequest>()
            .HasOne(a => a.Shelter)
            .WithMany(s => s.AidRequests)
            .HasForeignKey(a => a.ShelterId)
            .OnDelete(DeleteBehavior.SetNull);
        builder.Entity<AidRequest>()
            .HasIndex(a => a.Status);
        builder.Entity<AidRequest>()
            .HasIndex(a => a.District);

        // Donation
        builder.Entity<Donation>()
            .HasOne(d => d.TargetShelter)
            .WithMany(s => s.Donations)
            .HasForeignKey(d => d.TargetShelterId)
            .OnDelete(DeleteBehavior.SetNull);
        builder.Entity<Donation>()
            .Property(d => d.AmountOrQuantity)
            .HasPrecision(18, 2);

        // Compensation
        builder.Entity<Compensation>()
            .HasIndex(c => c.NIC);
        builder.Entity<Compensation>()
            .HasIndex(c => c.Status);
        builder.Entity<Compensation>()
            .Property(c => c.ClaimAmount)
            .HasPrecision(18, 2);
        builder.Entity<Compensation>()
            .Property(c => c.ApprovedAmount)
            .HasPrecision(18, 2);

        // InfrastructureDamage
        builder.Entity<InfrastructureDamage>()
            .HasIndex(i => i.IncidentId);
        builder.Entity<InfrastructureDamage>()
            .Property(i => i.EstimatedRepairCost)
            .HasPrecision(18, 2);

        // NGO
        builder.Entity<NGO>()
            .HasIndex(n => n.Name);
        builder.Entity<NGO>()
            .Property(n => n.AssignedBudget)
            .HasPrecision(18, 2);

        // RecoveryPlan & Tasks
        builder.Entity<RecoveryPlan>()
            .HasIndex(p => p.IncidentId);
        builder.Entity<RecoveryPlan>()
            .HasIndex(p => p.Status);
        builder.Entity<RecoveryPlan>()
            .Property(p => p.EstimatedTotalBudget)
            .HasPrecision(18, 2);

        builder.Entity<RecoveryTask>()
            .HasOne(t => t.RecoveryPlan)
            .WithMany(p => p.Tasks)
            .HasForeignKey(t => t.RecoveryPlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<RecoveryTask>()
            .HasOne(t => t.AssignedNGO)
            .WithMany()
            .HasForeignKey(t => t.AssignedNGOId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<RecoveryTask>()
            .Property(t => t.EstimatedCost)
            .HasPrecision(18, 2);

        // RecoveryWorkflowLog — 1:1 with RecoveryPlan
        builder.Entity<RecoveryWorkflowLog>()
            .HasOne(w => w.RecoveryPlan)
            .WithOne(p => p.WorkflowLog)
            .HasForeignKey<RecoveryWorkflowLog>(w => w.RecoveryPlanId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Entity<RecoveryWorkflowLog>()
            .HasIndex(w => w.ExecutionStatus);
        builder.Entity<RecoveryWorkflowLog>()
            .HasIndex(w => w.RecoveryPlanId)
            .IsUnique();

        // RecoveryReport
        builder.Entity<RecoveryReport>()
            .HasIndex(r => r.IncidentId);
        builder.Entity<RecoveryReport>()
            .Property(r => r.TotalCompensationDisbursed)
            .HasPrecision(18, 2);
        builder.Entity<RecoveryReport>()
            .Property(r => r.TotalBudgetSpent)
            .HasPrecision(18, 2);
    }
}
