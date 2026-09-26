using System;
using System.Threading.Tasks;
using Aegis.Resource.DTOs;

namespace Aegis.Resource.Services
{
    public interface IDispatchService
    {
        Task<DispatchResponseDto?> CreateDispatchRequestAsync(CreateDispatchRequestDto dto);
        Task<DispatchResponseDto?> GetAsync(Guid id);
        Task<DispatchResponseDto?> ApproveAsync(Guid id, Guid userId);
    }
}