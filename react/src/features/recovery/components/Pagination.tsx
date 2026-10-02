import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 5,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 1.25rem',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        fontSize: '0.85rem',
        color: '#64748b',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}
    >
      <div>
        Showing <span style={{ fontWeight: 600, color: '#0f172a' }}>{startItem}</span> to{' '}
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{endItem}</span> of{' '}
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{totalItems}</span> records
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '0.35rem 0.75rem',
            background: currentPage === 1 ? '#f8fafc' : '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            color: currentPage === 1 ? '#94a3b8' : '#334155',
            fontWeight: 600,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem',
            transition: 'all 0.15s',
          }}
        >
          Previous
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={{
              padding: '0.35rem 0.75rem',
              background: currentPage === page ? '#2563eb' : '#ffffff',
              border: `1px solid ${currentPage === page ? '#2563eb' : '#cbd5e1'}`,
              borderRadius: '6px',
              color: currentPage === page ? '#ffffff' : '#334155',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.8rem',
              minWidth: '32px',
              transition: 'all 0.15s',
            }}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: '0.35rem 0.75rem',
            background: currentPage === totalPages ? '#f8fafc' : '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            color: currentPage === totalPages ? '#94a3b8' : '#334155',
            fontWeight: 600,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem',
            transition: 'all 0.15s',
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};
