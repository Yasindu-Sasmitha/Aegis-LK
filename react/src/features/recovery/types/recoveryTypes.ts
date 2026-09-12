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
  aidType: 'Food' | 'Medical' | 'Shelter' | 'Financial' | 'Clothing' | string;
  familySize: number;
  urgency: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  status: 'Pending' | 'Approved' | 'Fulfilled' | 'Rejected' | string;
  shelterId?: string;
  shelterName?: string;
  notes: string;
  createdAt: string;
}

export interface Donation {
  id: string;
  donorName: string;
  donorContact?: string;
  donationType: 'Monetary' | 'Supplies' | 'Equipment' | string;
  amountOrQuantity: number;
  itemDescription: string;
  targetShelterId?: string;
  allocationStatus: 'Unallocated' | 'Allocated' | 'Distributed' | string;
  createdAt: string;
}

export interface Compensation {
  id: string;
  applicantName: string;
  nic?: string;
  damageCategory: 'Total House Loss' | 'Partial Loss' | 'Livelihood Loss' | string;
  claimAmount: number;
  approvedAmount?: number;
  status: 'Submitted' | 'UnderReview' | 'Approved' | 'Disbursed' | 'Rejected' | string;
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

// ── Agentic Workflow Observability ──────────────────────────────────────────

export interface AgentStepDto {
  agentName: string;
  role: string;
  inputSummary: string;
  outputSummary: string;
  durationMs: number;
  status: 'success' | 'failed' | 'skipped';
  errorMessage?: string;
}

export interface ToolCallDto {
  toolName: string;
  inputJson: string;
  outputJson: string;
  durationMs: number;
  status: 'success' | 'failed' | 'validation_error';
  errorMessage?: string;
}

export interface ValidationResultDto {
  ruleName: string;
  passed: boolean;
  detail: string;
}

export interface WorkflowTrace {
  workflowLogId: string;
  recoveryPlanId: string;
  executionStatus: string;
  totalDurationMs: number;
  retryCount: number;
  executionSummary: string;
  agentSteps: AgentStepDto[];
  toolCalls: ToolCallDto[];
  validationResults: ValidationResultDto[];
  errors: string;
  approvedBy?: string;
  approvalDecision?: string;
  approvalTimestamp?: string;
  approvalNotes?: string;
  createdAt: string;
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
  revisionCount: number;
  tasks: TaskDto[];
  workflowTrace?: WorkflowTrace;
}

// ── Damage Intake Form ───────────────────────────────────────────────────────

export interface InfrastructureItemInput {
  assetName: string;
  assetType: string;
  damageLevel: string;
  estimatedCost: number;
}

export interface DamageIntakeFormData {
  district: string;
  disasterType: string;
  housesDamaged: number;
  displacedFamilies: number;
  infrastructureDamage: InfrastructureItemInput[];
  reporterName?: string;
  reporterContact?: string;
  additionalNotes?: string;
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

export interface WorkflowListItem {
  id: string;
  incidentId: string;
  planName: string;
  status: string;
  estimatedTotalBudget: number;
  revisionCount: number;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  workflowStatus?: string;
  totalAgentDurationMs?: number;
}
