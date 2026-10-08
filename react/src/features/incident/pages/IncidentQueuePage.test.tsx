import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IncidentQueuePage } from './IncidentQueuePage';
import * as incidentApi from '../api/incidentApi';
import { AuthProvider } from '../../../shared/auth/AuthContext';
import type { IncidentReport } from '../types/incidentTypes';

describe('IncidentQueuePage Component', () => {
  const mockIncidents: IncidentReport[] = [
    {
      id: 'inc-101',
      disasterType: 'Flood',
      description: 'Severe flash flood in Ratnapura town center',
      severityReported: 'High',
      severityAssessed: 'Critical',
      latitude: 6.6828,
      longitude: 80.4036,
      photoUrl: 'https://example.com/flood.jpg',
      plausibilityScore: 88,
      plausibilityReasoning: 'Consistent with weather rainfall data',
      linkedIncidentId: null,
      linkedIncident: null,
      dedupConfidence: 100,
      dedupReasoning: 'Unique distinct incident',
      status: 'Reported',
      rejectionReason: null,
      reportedByUserId: 'user-citizen-1',
      createdAt: '2026-10-08T06:00:00Z',
      updatedAt: '2026-10-08T06:00:00Z',
      rescueMission: null,
      damageReport: null,
      victims: [],
      logs: [],
    },
    {
      id: 'inc-102',
      disasterType: 'Landslide',
      description: 'Slope collapse near Kandy-Nuwara Eliya main highway',
      severityReported: 'High',
      severityAssessed: 'High',
      latitude: 7.2906,
      longitude: 80.6337,
      photoUrl: null,
      plausibilityScore: 75,
      plausibilityReasoning: 'Steep hill slope territory',
      linkedIncidentId: null,
      linkedIncident: null,
      dedupConfidence: 90,
      dedupReasoning: 'No existing nearby landslide reports',
      status: 'Assessed',
      rejectionReason: null,
      reportedByUserId: 'user-citizen-2',
      createdAt: '2026-10-08T07:00:00Z',
      updatedAt: '2026-10-08T07:15:00Z',
      rescueMission: null,
      damageReport: null,
      victims: [],
      logs: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(incidentApi, 'fetchRelatedReports').mockResolvedValue([]);
  });

  const renderComponent = (props: React.ComponentProps<typeof IncidentQueuePage> = {}) => {
    return render(
      <AuthProvider>
        <IncidentQueuePage {...props} />
      </AuthProvider>
    );
  };

  it('renders loading state initially while fetching incidents', () => {
    // Keep promise pending
    vi.spyOn(incidentApi, 'fetchIncidents').mockImplementation(() => new Promise(() => {}));

    renderComponent();

    expect(screen.getByText(/loading incidents…/i)).toBeInTheDocument();
  });

  it('renders API error state banner when fetch fails', async () => {
    vi.spyOn(incidentApi, 'fetchIncidents').mockRejectedValueOnce(
      new Error('Failed to communicate with Aegis Incident service.')
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/⚠️ failed to communicate with aegis incident service\./i)
      ).toBeInTheDocument();
    });
  });

  it('renders empty message when no incidents match the filter', async () => {
    vi.spyOn(incidentApi, 'fetchIncidents').mockResolvedValueOnce({
      total: 0,
      page: 1,
      pageSize: 10,
      items: [],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/no incidents match this filter\./i)).toBeInTheDocument();
    });
  });

  it('renders list of incident cards upon successful API response', async () => {
    vi.spyOn(incidentApi, 'fetchIncidents').mockResolvedValueOnce({
      total: 2,
      page: 1,
      pageSize: 10,
      items: mockIncidents,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Flood')).toBeInTheDocument();
      expect(screen.getByText('Landslide')).toBeInTheDocument();
    });

    expect(screen.getByText('88/100')).toBeInTheDocument();
    expect(screen.getAllByText('Reported').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Assessed').length).toBeGreaterThan(0);
  });

  it('user interaction: clicking an incident card selects it and opens details panel', async () => {
    const user = userEvent.setup();
    vi.spyOn(incidentApi, 'fetchIncidents').mockResolvedValueOnce({
      total: 2,
      page: 1,
      pageSize: 10,
      items: mockIncidents,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Flood')).toBeInTheDocument();
    });

    // Default right panel prompt
    expect(screen.getByText(/select an incident from the list to view its details/i)).toBeInTheDocument();

    // Click on the first incident card
    const card = screen.getByText('Severe flash flood in Ratnapura town center').closest('.ae-card');
    expect(card).not.toBeNull();
    if (card) {
      await user.click(card);
    }

    // Detail panel now renders selected incident summary
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /see full details/i })).toBeInTheDocument();
    });
  });

  it('user interaction: changing the status dropdown filter triggers a new API request', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(incidentApi, 'fetchIncidents')
      .mockResolvedValueOnce({
        total: 2,
        page: 1,
        pageSize: 10,
        items: mockIncidents,
      })
      .mockResolvedValueOnce({
        total: 1,
        page: 1,
        pageSize: 10,
        items: [mockIncidents[0]],
      });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Flood')).toBeInTheDocument();
    });

    const statusDropdown = screen.getByRole('combobox');
    await user.selectOptions(statusDropdown, 'Reported');

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenLastCalledWith({
        status: 'Reported',
        page: 1,
        pageSize: 10,
      });
    });
  });
});
