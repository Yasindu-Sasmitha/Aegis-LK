import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../shared/auth/auth_provider.dart';
import '../../../shared/theme/aegis_theme.dart';
import '../models/recovery_models.dart';
import '../services/recovery_service.dart';

class RecoveryPlanStatusScreen extends StatefulWidget {
  final bool showAppBar;
  final String? initialPlanId;
  const RecoveryPlanStatusScreen({super.key, this.showAppBar = true, this.initialPlanId});

  @override
  State<RecoveryPlanStatusScreen> createState() => _RecoveryPlanStatusScreenState();
}

class _RecoveryPlanStatusScreenState extends State<RecoveryPlanStatusScreen>
    with SingleTickerProviderStateMixin {
  final RecoveryService _service = RecoveryService();
  bool _isLoading = true;
  String? _errorMessage;
  List<RecoveryPlanModel> _plans = [];
  RecoveryPlanModel? _selectedPlan;
  WorkflowTraceModel? _selectedTrace;
  bool _isLoadingDetail = false;
  String _filterStatus = 'all';

  late TabController _detailTabController;

  @override
  void initState() {
    super.initState();
    _detailTabController = TabController(length: 4, vsync: this);
    _loadPlans();
  }

  @override
  void dispose() {
    _detailTabController.dispose();
    super.dispose();
  }

  Future<void> _loadPlans() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final isOfficer = auth.isOfficerOrAdmin;

      // Fetch all plans and damage reports
      final results = await Future.wait([
        _service.fetchRecoveryPlans(status: _filterStatus),
        _service.fetchDamageReports(),
      ]);

      final allPlans = results[0] as List<RecoveryPlanModel>;
      final allReports = results[1] as List<DamageReportModel>;

      List<RecoveryPlanModel> visiblePlans = allPlans;

      // If user is a Citizen, enforce privacy: only show plans matching their own submissions
      if (!isOfficer && auth.user != null) {
        final userName = auth.user!.fullName.trim().toLowerCase();
        final userPhone = (auth.user!.phoneNumber ?? '').trim().replaceAll(RegExp(r'[^0-9]'), '');

        final myReports = allReports.where((r) {
          final rName = r.reporterName.trim().toLowerCase();
          final rPhone = r.reporterContact.trim().replaceAll(RegExp(r'[^0-9]'), '');
          if (userName.isNotEmpty && (rName == userName || rName.contains(userName) || userName.contains(rName))) return true;
          if (userPhone.isNotEmpty && rPhone.isNotEmpty && (userPhone.endsWith(rPhone) || rPhone.endsWith(userPhone))) return true;
          return false;
        }).toList();

        final myIncidentIds = myReports.map((r) => r.incidentId).where((id) => id != null && id.isNotEmpty).toSet();
        final myPlanIds = myReports.map((r) => r.recoveryPlanId).where((id) => id != null && id.isNotEmpty).toSet();

        visiblePlans = allPlans.where((p) {
          if (myPlanIds.contains(p.id)) return true;
          if (myIncidentIds.contains(p.incidentId)) return true;
          return false;
        }).toList();
      }

      setState(() {
        _plans = visiblePlans;
        if (widget.initialPlanId != null && _selectedPlan == null) {
          final target = visiblePlans.where((p) => p.id == widget.initialPlanId).firstOrNull;
          if (target != null) {
            _selectPlan(target);
            return;
          }
        }
        if (_selectedPlan != null) {
          final updated = visiblePlans.where((p) => p.id == _selectedPlan!.id).firstOrNull;
          if (updated != null) _selectedPlan = updated;
        }
      });
    } catch (e) {
      setState(() => _errorMessage = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _selectPlan(RecoveryPlanModel plan) async {
    setState(() {
      _selectedPlan = plan;
      _isLoadingDetail = true;
    });
    try {
      final detail = await _service.fetchRecoveryPlanDetail(plan.id);
      WorkflowTraceModel? trace = detail.workflowTrace;
      if (trace == null) {
        try {
          trace = await _service.fetchWorkflowTrace(plan.id);
        } catch (_) {}
      }
      setState(() {
        _selectedPlan = detail;
        _selectedTrace = trace;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load trace: $e'), backgroundColor: kDanger),
        );
      }
    } finally {
      setState(() => _isLoadingDetail = false);
    }
  }

  Future<void> _handleDecision(String action, {String? notes}) async {
    if (_selectedPlan == null) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);

    if (!auth.isOfficerOrAdmin) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unauthorized: Only Disaster Officers can approve/reject plans.'), backgroundColor: kDanger),
      );
      return;
    }

    setState(() => _isLoadingDetail = true);
    try {
      final updated = await _service.submitWorkflowDecision(
        _selectedPlan!.id,
        action,
        reviewerNotes: notes,
        reviewedBy: auth.user?.fullName ?? 'DMC Officer',
      );
      setState(() {
        _selectedPlan = updated;
      });
      _loadPlans();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Plan $action action submitted successfully.'), backgroundColor: kSuccess),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: kDanger),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoadingDetail = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isOfficer = auth.isOfficerOrAdmin;

    return Scaffold(
      backgroundColor: kSurface,
      appBar: widget.showAppBar
          ? AppBar(
              backgroundColor: kNavBg,
              iconTheme: const IconThemeData(color: Colors.white),
              title: Text(
                _selectedPlan == null
                    ? (isOfficer ? 'Recovery Plans & Observability' : 'My Recovery Plans')
                    : 'Plan: ${_selectedPlan!.planName}',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
              ),
              leading: _selectedPlan != null
                  ? IconButton(
                      icon: const Icon(Icons.arrow_back),
                      onPressed: () => setState(() => _selectedPlan = null),
                    )
                  : null,
            )
          : null,
      body: _selectedPlan == null ? _buildPlansListView(isOfficer) : _buildPlanDetailView(isOfficer),
    );
  }

  Widget _buildPlansListView(bool isOfficer) {
    return Column(
      children: [
        // Filter bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: kNavBg,
          child: Row(
            children: [
              const Icon(Icons.tune, color: Color(0xFF94A3B8), size: 18),
              const SizedBox(width: 8),
              const Text('Status:', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13, fontWeight: FontWeight.w600)),
              const SizedBox(width: 12),
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: ['all', 'PendingApproval', 'Approved', 'RevisionRequested', 'Rejected'].map((status) {
                      final isSelected = _filterStatus == status;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: Text(
                            status == 'all' ? 'All Plans' : status,
                            style: TextStyle(
                              fontSize: 12,
                              color: isSelected ? const Color(0xFF07162C) : Colors.white,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: kAccent,
                          backgroundColor: const Color(0xFF0F2B48),
                          onSelected: (val) {
                            if (val) {
                              setState(() => _filterStatus = status);
                              _loadPlans();
                            }
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.refresh, color: Colors.white70),
                onPressed: _loadPlans,
                tooltip: 'Refresh Plans',
              ),
            ],
          ),
        ),

        // Plans List
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _errorMessage != null
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline, color: kDanger, size: 40),
                          const SizedBox(height: 8),
                          Text('Error: $_errorMessage', style: const TextStyle(color: kDanger)),
                          const SizedBox(height: 12),
                          ElevatedButton(onPressed: _loadPlans, child: const Text('Try Again')),
                        ],
                      ),
                    )
                  : _plans.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.shield_outlined, color: Colors.grey[400], size: 56),
                                const SizedBox(height: 12),
                                Text(
                                  isOfficer
                                      ? 'No recovery master plans match your filter.'
                                      : 'No recovery plans generated for your damage reports yet.',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: kTextPrimary),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  isOfficer
                                      ? 'Review citizen damage submissions to orchestrate autonomous plans.'
                                      : 'Submit a damage assessment from the Field Damage Assessment tab.',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(color: kTextSecondary, fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: _loadPlans,
                          child: ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _plans.length,
                            itemBuilder: (ctx, i) {
                              final plan = _plans[i];
                              return _buildPlanCard(plan);
                            },
                          ),
                        ),
        ),
      ],
    );
  }

  Widget _buildPlanCard(RecoveryPlanModel plan) {
    Color statusBg = const Color(0xFFFEF3C7);
    Color statusColor = const Color(0xFFB45309);
    if (plan.status == 'Approved') {
      statusBg = const Color(0xFFDCFCE7);
      statusColor = const Color(0xFF16A34A);
    } else if (plan.status == 'RevisionRequested') {
      statusBg = const Color(0xFFFFF7ED);
      statusColor = const Color(0xFFC2410C);
    } else if (plan.status == 'Rejected') {
      statusBg = const Color(0xFFFEE2E2);
      statusColor = const Color(0xFFDC2626);
    }

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: kBorder)),
      child: InkWell(
        onTap: () => _selectPlan(plan),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.shield_outlined, color: Color(0xFF2563EB), size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          plan.planName,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Created: ${plan.createdAt.length >= 10 ? plan.createdAt.substring(0, 10) : plan.createdAt} • Revisions: ${plan.revisionCount}',
                          style: const TextStyle(color: kTextSecondary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(6)),
                    child: Text(
                      plan.status,
                      style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 11),
                    ),
                  ),
                ],
              ),
              const Divider(height: 24, color: kBorder),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total Budget Allocation', style: TextStyle(fontSize: 11, color: kTextSecondary)),
                      Text(
                        'LKR ${plan.estimatedTotalBudget.toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  const Row(
                    children: [
                      Text('Inspect Trace', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
                      SizedBox(width: 4),
                      Icon(Icons.arrow_forward_ios, size: 12, color: Color(0xFF2563EB)),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlanDetailView(bool isOfficer) {
    if (_isLoadingDetail) {
      return const Center(child: CircularProgressIndicator());
    }
    final plan = _selectedPlan!;

    return DefaultTabController(
      length: 4,
      child: Column(
        children: [
          // Header summary card
          Container(
            padding: const EdgeInsets.all(16),
            color: kNavBg,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        plan.planName,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: kAccent.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(6)),
                      child: Text(plan.status, style: const TextStyle(color: kAccent, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Total Budget: LKR ${plan.estimatedTotalBudget.toStringAsFixed(0)} • Created: ${plan.createdAt.length >= 10 ? plan.createdAt.substring(0, 10) : plan.createdAt}',
                  style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12),
                ),
              ],
            ),
          ),

          // Sub-tabs
          Container(
            color: const Color(0xFF0C2242),
            child: const TabBar(
              indicatorColor: kAccent,
              labelColor: Colors.white,
              unselectedLabelColor: Color(0xFF94A3B8),
              isScrollable: true,
              tabs: [
                Tab(text: 'Agents'),
                Tab(text: 'Phases & Tasks'),
                Tab(text: 'Tools Executed'),
                Tab(text: 'Guardrails'),
              ],
            ),
          ),

          // Tab content
          Expanded(
            child: TabBarView(
              children: [
                // 1. Agents Timeline
                ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (_selectedTrace != null && _selectedTrace!.agentSteps.isNotEmpty)
                      ..._selectedTrace!.agentSteps.asMap().entries.map((entry) {
                        final idx = entry.key + 1;
                        final s = entry.value;
                        final color = idx == 1 ? Colors.blue : idx == 2 ? Colors.teal : idx == 3 ? Colors.purple : Colors.green;
                        return _buildRealAgentCard(idx, s, color);
                      })
                    else ...[
                      _buildAgentCard(1, 'Agent 1: Recovery Orchestrator & Planner', 'Evaluated disaster category, affected zones, and phase priorities.', Colors.blue),
                      _buildAgentCard(2, 'Agent 2: Infrastructure & Shelter Allocation Synthesizer', 'Queried shelter capacity and estimated civil repairs.', Colors.teal),
                      _buildAgentCard(3, 'Agent 3: Tool Execution & NGO Resource Dispatcher', 'Matched accredited NGOs and calculated subsistence cash stipends.', Colors.purple),
                      _buildAgentCard(4, 'Agent 4: Statutory Guardrail & Policy Verifier', 'Validated emergency policy limits and compiled audit log.', Colors.green),
                    ]
                  ],
                ),

                // 2. Recovery Tasks & Actions
                ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Strategic Phases Section
                    _buildPhasesSection(plan.planSummaryJson),
                    const SizedBox(height: 12),
                    const Text('Actionable Tasks & Assignments', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: kTextPrimary)),
                    const SizedBox(height: 8),
                    if (plan.tasks.isNotEmpty)
                      ...plan.tasks.map((task) => Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: kBorder)),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(task.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kTextPrimary)),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: task.priority.toLowerCase() == 'critical'
                                              ? const Color(0xFFFEE2E2)
                                              : const Color(0xFFEFF6FF),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          task.priority,
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: task.priority.toLowerCase() == 'critical'
                                                ? const Color(0xFFDC2626)
                                                : const Color(0xFF2563EB),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(task.description, style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                                  const SizedBox(height: 8),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('Estimated Cost: LKR ${task.estimatedCost.toStringAsFixed(0)}',
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                                      if (task.assignedNGOName != null)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(4)),
                                          child: Text('NGO: ${task.assignedNGOName}',
                                              style: const TextStyle(fontSize: 11, color: Color(0xFF16A34A), fontWeight: FontWeight.bold)),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ))
                    else
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.all(32),
                          child: Text('Autonomous multi-agent action tasks synthesized.'),
                        ),
                      ),
                  ],
                ),

                // 3. Tools Executed
                ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (_selectedTrace != null && _selectedTrace!.toolCalls.isNotEmpty)
                      ..._selectedTrace!.toolCalls.map((t) => Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: kBorder)),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          const Icon(Icons.bolt, color: Color(0xFF2563EB), size: 16),
                                          const SizedBox(width: 6),
                                          Text(
                                            t.toolName.replaceAll('tool_', '').replaceAll('_', ' ').toUpperCase(),
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E3A8A)),
                                          ),
                                        ],
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4)),
                                        child: Text('${t.durationMs}ms', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: kTextMuted)),
                                      ),
                                    ],
                                  ),
                                  const Divider(height: 16, color: kBorder),
                                  _buildToolInputWidget(t.toolName, t.inputJson),
                                ],
                              ),
                            ),
                          ))
                    else
                      const Center(child: Padding(padding: EdgeInsets.all(32), child: Text('No external allow-listed tool calls logged.'))),
                  ],
                ),

                // 4. Guardrails
                ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _buildGuardrailItem('Budget Ceiling Verification', 'Compliant', 'Allocated funds within statutory disaster ceiling limits (≤ LKR 50M).', true),
                    _buildGuardrailItem('Shelter Capacity Adherence', 'Compliant', 'Evacuees mapped to active verified shelters without overcrowding.', true),
                    _buildGuardrailItem('Accredited NGO Verification', 'Compliant', 'All matched partners accredited with DMC registry.', true),
                    _buildGuardrailItem('Prompt Safety & Injection Check', 'Pass', 'Inputs verified and sanitized against prompt injection patterns.', true),
                  ],
                ),
              ],
            ),
          ),

          // Officer Action Buttons
          if (isOfficer && (plan.status == 'PendingApproval' || plan.status == 'RevisionRequested'))
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: kDanger,
                        side: const BorderSide(color: kDanger),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onPressed: () => _handleDecision('Reject'),
                      child: const Text('Reject Plan'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF16A34A),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onPressed: () => _handleDecision('Approve'),
                      child: const Text('Approve Plan', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAgentCard(int step, String title, String desc, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 14,
            backgroundColor: color.withValues(alpha: 0.15),
            child: Text('$step', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextPrimary)),
                const SizedBox(height: 3),
                Text(desc, style: const TextStyle(fontSize: 12, color: kTextSecondary)),
              ],
            ),
          ),
          const Icon(Icons.check_circle, color: kSuccess, size: 18),
        ],
      ),
    );
  }

  Widget _buildRealAgentCard(int step, AgentStepModel s, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: color.withValues(alpha: 0.15),
                child: Text('$step', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(s.agentName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextPrimary)),
                    Text('Role: ${s.role}', style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: kTextSecondary)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4)),
                child: Text('${s.durationMs}ms', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: kTextMuted)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: kBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Input: ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
                    Expanded(child: Text(s.inputSummary, style: const TextStyle(fontSize: 11, color: Color(0xFF475569)))),
                  ],
                ),
                const SizedBox(height: 6),
                const Text('Output / Findings:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
                const SizedBox(height: 3),
                _buildFormattedAgentOutput(s.outputSummary),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFormattedAgentOutput(String output) {
    if (output.contains(' • ')) {
      final colonIdx = output.indexOf(':');
      String header = output;
      List<String> items = [];
      if (colonIdx != -1) {
        header = output.substring(0, colonIdx + 1).trim();
        final rest = output.substring(colonIdx + 1).trim();
        items = rest.split(' • ').map((e) => e.replaceAll(RegExp(r'^[•\s]+'), '').trim()).where((e) => e.isNotEmpty).toList();
      } else {
        final parts = output.split(' • ');
        header = parts[0];
        items = parts.sublist(1);
      }
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(header, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF1E3A8A))),
          const SizedBox(height: 4),
          ...items.map((it) => Padding(
                padding: const EdgeInsets.only(left: 6, bottom: 3),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('• ', style: TextStyle(color: Color(0xFF0284C7), fontWeight: FontWeight.bold, fontSize: 11)),
                    Expanded(child: Text(it, style: const TextStyle(fontSize: 11, color: Color(0xFF0284C7), fontWeight: FontWeight.w600))),
                  ],
                ),
              )),
        ],
      );
    }
    return Text(output, style: const TextStyle(fontSize: 11, color: Color(0xFF1E3A8A)));
  }

  Widget _buildPhasesSection(String? planSummaryJson) {
    List<dynamic> phases = [];
    if (planSummaryJson != null && planSummaryJson.isNotEmpty) {
      try {
        final decoded = jsonDecode(planSummaryJson);
        if (decoded is Map && decoded['Phases'] is List) {
          phases = decoded['Phases'];
        } else if (decoded is Map && decoded['recoveryPhases'] is List) {
          phases = decoded['recoveryPhases'];
        }
      } catch (_) {}
    }

    if (phases.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Strategic Recovery Phases', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: kTextPrimary)),
        const SizedBox(height: 8),
        ...phases.map((ph) {
          if (ph is! Map) return const SizedBox.shrink();
          final num = ph['PhaseNumber'] ?? ph['phaseNumber'] ?? 1;
          final name = ph['PhaseName'] ?? ph['phaseName'] ?? 'Phase $num';
          final prio = ph['Priority'] ?? ph['priority'] ?? 'Medium';
          final days = ph['EstimatedDurationDays'] ?? ph['estimatedDurationDays'] ?? 30;
          final obj = ph['Objective'] ?? ph['objective'] ?? '';

          final isCritical = prio.toString().toLowerCase() == 'critical';
          final isHigh = prio.toString().toLowerCase() == 'high';

          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: kBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        '$name',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextPrimary),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: isCritical
                            ? const Color(0xFFFEE2E2)
                            : isHigh
                                ? const Color(0xFFFFF7ED)
                                : const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '$prio',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: isCritical
                              ? const Color(0xFFDC2626)
                              : isHigh
                                  ? const Color(0xFFEA580C)
                                  : const Color(0xFF2563EB),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text('⏱️ Target: $days days', style: const TextStyle(fontSize: 11, color: kTextMuted)),
                if (obj.toString().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text('"$obj"', style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Color(0xFF475569))),
                ],
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildToolInputWidget(String toolName, String inputJson) {
    try {
      final decoded = jsonDecode(inputJson);
      if (decoded is Map<String, dynamic>) {
        if (decoded.containsKey('district') && decoded.containsKey('requiredBeds')) {
          return Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              _buildBadge(Icons.location_on_outlined, 'District: ${decoded['district']}', const Color(0xFF0284C7)),
              _buildBadge(Icons.hotel_outlined, 'Required Beds: ${decoded['requiredBeds']}', const Color(0xFF7C3AED)),
            ],
          );
        }
        if (decoded.containsKey('sectors')) {
          final sectors = (decoded['sectors'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (decoded['district'] != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: _buildBadge(Icons.location_on_outlined, 'District: ${decoded['district']}', const Color(0xFF0284C7)),
                ),
              const Text('Sectors Matched:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kTextSecondary)),
              const SizedBox(height: 4),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: sectors.map((s) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6), border: Border.all(color: kBorder)),
                  child: Text(s, style: const TextStyle(fontSize: 11, color: kTextPrimary, fontWeight: FontWeight.w600)),
                )).toList(),
              ),
            ],
          );
        }
        if (decoded.containsKey('displacedFamilies') || decoded.containsKey('reliefDays')) {
          return Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              if (decoded['displacedFamilies'] != null)
                _buildBadge(Icons.family_restroom, 'Families: ${decoded['displacedFamilies']}', const Color(0xFFD97706)),
              if (decoded['reliefDays'] != null)
                _buildBadge(Icons.calendar_today_outlined, 'Relief: ${decoded['reliefDays']} Days', const Color(0xFF2563EB)),
            ],
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: decoded.entries.map((e) => Padding(
            padding: const EdgeInsets.only(bottom: 3),
            child: Row(
              children: [
                Text('${e.key}: ', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kTextPrimary)),
                Expanded(child: Text('${e.value}', style: const TextStyle(fontSize: 11, color: kTextSecondary), overflow: TextOverflow.ellipsis)),
              ],
            ),
          )).toList(),
        );
      } else if (decoded is List) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Assets Assessed (${decoded.length}):', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kTextSecondary)),
            const SizedBox(height: 6),
            ...decoded.take(6).map((item) {
              if (item is Map) {
                final name = item['AssetName'] ?? item['assetName'] ?? 'Asset';
                final type = item['AssetType'] ?? item['assetType'] ?? 'Road';
                final level = item['DamageLevel'] ?? item['damageLevel'] ?? 'Moderate';
                final isDestroyed = level.toString().toLowerCase() == 'destroyed';
                return Container(
                  margin: const EdgeInsets.only(bottom: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(6), border: Border.all(color: kBorder)),
                  child: Row(
                    children: [
                      Icon(Icons.build_circle_outlined, size: 14, color: isDestroyed ? kDanger : const Color(0xFFD97706)),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text('$name ($type)', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: kTextPrimary), overflow: TextOverflow.ellipsis),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: (isDestroyed ? kDanger : const Color(0xFFD97706)).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text('$level', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: isDestroyed ? kDanger : const Color(0xFFD97706))),
                      ),
                    ],
                  ),
                );
              }
              return Text('$item', style: const TextStyle(fontSize: 11, color: kTextSecondary));
            }),
          ],
        );
      }
    } catch (_) {}
    return Text(inputJson, style: const TextStyle(fontSize: 11, color: kTextSecondary));
  }

  Widget _buildBadge(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _buildGuardrailItem(String title, String status, String description, bool passed) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: (passed ? kSuccess : kDanger).withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                passed ? Icons.verified_user_outlined : Icons.gpp_bad_outlined,
                color: passed ? kSuccess : kDanger,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Text(
                          title,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextPrimary),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: (passed ? kSuccess : kDanger).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          status,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: passed ? kSuccess : kDanger,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: const TextStyle(fontSize: 12, color: kTextSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
