export interface Shelter {
  id: string;
  name: string;
  location: string;
  district: string;
  latitude: number;
  longitude: number;
  capacity: number;
  currentOccupancy: number;
  status: 'Active' | 'Full' | 'Inactive';
  contactPerson: string;
  contactPhone: string;
  facilities: string;
  createdAt: string;
}

export interface AidRequest {
  id: string;
  victimName: string;
  contactPhone: string;
  district: string;
  aidType: 'Food' | 'Medical' | 'Shelter' | 'Financial' | 'Clothing';
  familySize: number;
  urgency: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Approved' | 'Fulfilled' | 'Rejected';
  shelterId?: string;
  shelterName?: string;
  notes: string;
  createdAt: string;
}

export interface Donation {
  id: string;
  donorName: string;
  donationType: 'Monetary' | 'Supplies' | 'Equipment';
  amountOrQuantity: number;
  itemDescription: string;
  targetShelterId?: string;
  allocationStatus: 'Unallocated' | 'Allocated' | 'Distributed';
  createdAt: string;
}

export interface Compensation {
  id: string;
  applicantName: string;
  damageCategory: 'Total House Loss' | 'Partial Loss' | 'Livelihood Loss';
  claimAmount: number;
  approvedAmount?: number;
  status: 'Submitted' | 'UnderReview' | 'Approved' | 'Disbursed' | 'Rejected';
  verificationNotes: string;
  approvedBy?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface NGO {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  sectors: string;
  operatingDistricts: string;
  assignedBudget: number;
  status: 'Active' | 'Assigned' | 'Inactive';
}

export interface InfrastructureDamage {
  id: string;
  incidentId: string;
  assetName: string;
  assetType: string;
  damageLevel: string;
  estimatedRepairCost: number;
  priorityScore: number;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface TaskDto {
  id: string;
  title: string;
  description: string;
  assignedNGOId?: string;
  assignedNGOName?: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  estimatedCost: number;
  status: 'Pending' | 'InProgress' | 'Completed';
  targetCompletionDate?: string;
}

export interface RecoveryPlan {
  id: string;
  incidentId: string;
  planName: string;
  status: 'Draft' | 'PendingApproval' | 'Approved' | 'Rejected' | 'RevisionRequested';
  estimatedTotalBudget: number;
  planSummaryJson: string;
  reviewNotes?: string;
  reviewedBy?: string;
  createdAt: string;
  reviewedAt?: string;
  tasks: TaskDto[];
}

export interface RecoveryReport {
  id: string;
  incidentId: string;
  title: string;
  totalSheltered: number;
  totalAidRequestsFulfilled: number;
  totalCompensationDisbursed: number;
  totalBudgetSpent: number;
  reportSummary: string;
  generatedAt: string;
}
