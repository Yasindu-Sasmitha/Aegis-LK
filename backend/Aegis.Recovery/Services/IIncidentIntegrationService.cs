using System;
using System.Threading.Tasks;
using Aegis.Recovery.Dtos;

namespace Aegis.Recovery.Services;

public interface IIncidentIntegrationService
{
    Task<IncidentDamageReportDto?> GetDamageReportAsync(Guid incidentId);
}
