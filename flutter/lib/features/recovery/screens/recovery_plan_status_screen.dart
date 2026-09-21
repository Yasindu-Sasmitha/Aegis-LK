import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../shared/auth/auth_provider.dart';
import '../models/recovery_models.dart';
import '../services/recovery_service.dart';

class RecoveryPlanStatusScreen extends StatefulWidget {
  final bool showAppBar;
  final String? initialPlanId;
  const RecoveryPlanStatusScreen({super.key, this.showAppBar = true, this.initialPlanId});

  @override
  State<RecoveryPlanStatusScreen> createState() => _RecoveryPlanStatusScreenState();
}

class _RecoveryPlanStatusScreenState extends State<RecoveryPlanStatusScreen> with SingleTickerProviderStateMixin {
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
      final items = await _service.fetchRecoveryPlans(status: _filterStatus);
      setState(() {
        _plans = items;
        if (widget.initialPlanId != null && _selectedPlan == null) {
          final target = items.where((p) => p.id == widget.initialPlanId).firstOrNull;
          if (target != null) {
            _selectPlan(target);
            return;
          }
        }
        if (_selectedPlan != null) {
          final updated = items.where((p) => p.id == _selectedPlan!.id).firstOrNull;
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load trace: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isLoadingDetail = false);
    }
  }

  Future<void> _handleDecision(String action, {String? notes}) async {
    if (_selectedPlan == null) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);

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
      await _loadPlans();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Plan decision submitted: $action'),
            backgroundColor: action == 'Approve' ? Colors.green : action == 'Revise' ? Colors.orange : Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Action failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      setState(() => _isLoadingDetail = false);
    }
  }

  void _showRevisionDialog() {
    final textController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.rate_review_outlined, color: Colors.orange),
            SizedBox(width: 8),
            Text('Request Plan Revision'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter specific guidance for the AI agents to adjust task costs, prioritize different infrastructure, or reallocate NGO assignments.',
              style: TextStyle(fontSize: 13, color: Colors.black87),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: textController,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'e.g., Prioritize bridge access road repairs, increase daily living stipends by 20%...',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange[800]),
            onPressed: () {
              final guidance = textController.text.trim();
              Navigator.pop(ctx);
              _handleDecision('Revise', notes: guidance.isEmpty ? null : guidance);
            },
            child: const Text('Submit Revision Guidance', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isOfficer = auth.isOfficerOrAdmin;

    return Scaffold(
      appBar: widget.showAppBar
          ? AppBar(
              title: const Text('Autonomous Recovery Plans'),
              backgroundColor: const Color(0xFF1E293B),
            )
          : null,
      body: _selectedPlan == null
          ? _buildLedgerView(isOfficer)
          : _buildDetailView(isOfficer),
    );
  }

  // ── Plan Ledger List View ───────────────────────────────────────────────────

  Widget _buildLedgerView(bool isOfficer) {
    return Column(
      children: [
        // Filter bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: const Color(0xFF0F172A),
          child: Row(
            children: [
              const Icon(Icons.tune, color: Color(0xFF94A3B8), size: 18),
              const SizedBox(width: 8),
              const Text('Status Filter:', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13, fontWeight: FontWeight.w600)),
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
                              color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: const Color(0xFF2563EB),
                          backgroundColor: const Color(0xFF1E293B),
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
                icon: const Icon(Icons.refresh, color: Color(0xFF94A3B8)),
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
                          const Icon(Icons.error_outline, color: Colors.red, size: 40),
                          const SizedBox(height: 8),
                          Text('Error: $_errorMessage', style: const TextStyle(color: Colors.red)),
                          const SizedBox(height: 12),
                          ElevatedButton(onPressed: _loadPlans, child: const Text('Try Again')),
                        ],
                      ),
                    )
                  : _plans.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.healing_outlined, color: Colors.grey[400], size: 56),
                              const SizedBox(height: 12),
                              const Text('No recovery plans generated yet.', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 4),
                              const Text('Submit a Damage Report to trigger autonomous 4-agent planning.', style: TextStyle(color: Colors.grey, fontSize: 13)),
                            ],
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
    Color statusBg = Colors.amber.shade100;
    Color statusColor = Colors.amber.shade900;
    if (plan.status == 'Approved') {
      statusBg = Colors.green.shade100;
      statusColor = Colors.green.shade900;
    } else if (plan.status == 'RevisionRequested') {
      statusBg = Colors.orange.shade100;
      statusColor = Colors.orange.shade900;
    } else if (plan.status == 'Rejected') {
      statusBg = Colors.red.shade100;
      statusColor = Colors.red.shade900;
    }

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(8),
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
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Created: ${plan.createdAt.length >= 10 ? plan.createdAt.substring(0, 10) : plan.createdAt} • Revisions: ${plan.revisionCount}',
                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(12)),
                    child: Text(
                      plan.status,
                      style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 11),
                    ),
                  ),
                ],
              ),
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total Budget', style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                      Text(
                        'Rs. ${plan.estimatedTotalBudget.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A)),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      const Text('Inspect Trace & Tasks', style: TextStyle(fontSize: 12, color: Color(0xFF2563EB), fontWeight: FontWeight.w600)),
                      const SizedBox(width: 4),
                      const Icon(Icons.arrow_forward, size: 14, color: Color(0xFF2563EB)),
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

  // ── Plan Detail View (Reasoning Timeline, Tasks, Tools, Guardrails) ─────────

  Widget _buildDetailView(bool isOfficer) {
    if (_selectedPlan == null) return const SizedBox.shrink();
    final plan = _selectedPlan!;
    final trace = _selectedTrace;

    return Column(
      children: [
        // Detail Header
        Container(
          padding: const EdgeInsets.all(16),
          color: const Color(0xFF0F172A),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () => setState(() => _selectedPlan = null),
                    tooltip: 'Back to Ledger',
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          plan.planName,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        Text(
                          'Status: ${plan.status} • Revision Count: ${plan.revisionCount}',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // KPI Metrics Row
              Row(
                children: [
                  _buildMetricBox('Budget', 'Rs. ${plan.estimatedTotalBudget.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}', Colors.blue.shade300),
                  const SizedBox(width: 8),
                  _buildMetricBox('Tasks', '${plan.tasks.length} tasks', Colors.amber.shade300),
                  const SizedBox(width: 8),
                  _buildMetricBox('Tools', '${trace?.toolCalls.length ?? 0} calls', Colors.green.shade300),
                  const SizedBox(width: 8),
                  _buildMetricBox('Latency', '${trace?.totalDurationMs ?? 0}ms', Colors.purple.shade300),
                ],
              ),

              // Officer Decision Controls (if PendingApproval / RevisionRequested)
              if (isOfficer && (plan.status == 'PendingApproval' || plan.status == 'RevisionRequested')) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.check_circle_outline, size: 16, color: Colors.white),
                        label: const Text('Approve Plan', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A)),
                        onPressed: () => _handleDecision('Approve'),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.rate_review_outlined, size: 16, color: Colors.white),
                        label: const Text('Request Revision', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEA580C)),
                        onPressed: _showRevisionDialog,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.cancel_outlined, size: 16, color: Colors.white),
                        label: const Text('Reject', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
                        onPressed: () => _handleDecision('Reject'),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),

        // Tabs
        Container(
          color: const Color(0xFF1E293B),
          child: TabBar(
            controller: _detailTabController,
            isScrollable: true,
            indicatorColor: const Color(0xFF38BDF8),
            labelColor: const Color(0xFF38BDF8),
            unselectedLabelColor: const Color(0xFF94A3B8),
            tabs: [
              Tab(text: '🤖 4-Agent Timeline (${trace?.agentSteps.length ?? 0})'),
              Tab(text: '📌 Actionable Tasks (${plan.tasks.length})'),
              Tab(text: '🧰 Verified Tools (${trace?.toolCalls.length ?? 0})'),
              Tab(text: '🛡️ Safety Guardrails (${trace?.validationResults.length ?? 0})'),
            ],
          ),
        ),

        // Tab Views
        Expanded(
          child: _isLoadingDetail
              ? const Center(child: CircularProgressIndicator())
              : TabBarView(
                  controller: _detailTabController,
                  children: [
                    _buildAgentTimelineTab(trace),
                    _buildTasksTab(plan),
                    _buildToolsTab(trace),
                    _buildGuardrailsTab(trace),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildMetricBox(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(value, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }

  // ── Sub-Tab 1: 4-Agent Reasoning Timeline ──────────────────────────────────

  Widget _buildAgentTimelineTab(WorkflowTraceModel? trace) {
    final steps = trace?.agentSteps ?? [];
    if (steps.isEmpty) {
      return const Center(child: Text('No agent step trace available for this plan.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: steps.length,
      itemBuilder: (ctx, i) {
        final step = steps[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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
                        CircleAvatar(
                          radius: 12,
                          backgroundColor: const Color(0xFFEFF6FF),
                          child: Text('${i + 1}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
                        ),
                        const SizedBox(width: 8),
                        Text(step.agentName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ],
                    ),
                    Text('⏱️ ${step.durationMs}ms', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
                const SizedBox(height: 4),
                Text('Role: ${step.role}', style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Color(0xFF64748B))),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Input: ${step.inputSummary}', style: const TextStyle(fontSize: 12, color: Color(0xFF334155))),
                      const SizedBox(height: 4),
                      Text('Decomposition Output: ${step.outputSummary}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF1E3A8A))),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ── Sub-Tab 2: Actionable Tasks ─────────────────────────────────────────────

  Widget _buildTasksTab(RecoveryPlanModel plan) {
    final tasks = plan.tasks;
    if (tasks.isEmpty) {
      return const Center(child: Text('No actionable tasks defined for this plan.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: tasks.length,
      itemBuilder: (ctx, i) {
        final task = tasks[i];
        Color pColor = Colors.green;
        if (task.priority == 'Critical') pColor = Colors.red;
        if (task.priority == 'High') pColor = Colors.orange;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(task.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: pColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(task.priority, style: TextStyle(color: pColor, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(task.description, style: const TextStyle(fontSize: 13, color: Color(0xFF475569))),
                const Divider(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Assigned: ${task.assignedNGOName ?? "DMC / Authority"}', style: const TextStyle(fontSize: 12, color: Color(0xFF2563EB), fontWeight: FontWeight.w600)),
                    Text(
                      'Rs. ${task.estimatedCost.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ── Sub-Tab 3: Verified Tool Activity ───────────────────────────────────────

  Widget _buildToolsTab(WorkflowTraceModel? trace) {
    final tools = trace?.toolCalls ?? [];
    if (tools.isEmpty) {
      return const Center(child: Text('No verified tool activities logged.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: tools.length,
      itemBuilder: (ctx, i) {
        final tool = tools[i];
        Map<String, dynamic> parsedOutput = {};
        try {
          parsedOutput = jsonDecode(tool.outputJson);
        } catch (_) {}

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      tool.toolName.replaceAll('_', ' ').toUpperCase(),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                    ),
                    const Chip(
                      label: Text('✓ Verified Allow-Listed', style: TextStyle(fontSize: 10, color: Colors.green)),
                      backgroundColor: Color(0xFFDCFCE7),
                      padding: EdgeInsets.zero,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Text(
                    parsedOutput.isNotEmpty ? const JsonEncoder.withIndent('  ').convert(parsedOutput) : tool.outputJson,
                    style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: Color(0xFF334155)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ── Sub-Tab 4: Safety & Policy Guardrails ───────────────────────────────────

  Widget _buildGuardrailsTab(WorkflowTraceModel? trace) {
    final validations = trace?.validationResults ?? [];
    if (validations.isEmpty) {
      return const Center(child: Text('No policy guardrail checks recorded.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: validations.length,
      itemBuilder: (ctx, i) {
        final v = validations[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          child: ListTile(
            leading: Icon(
              v.passed ? Icons.check_circle : Icons.error_outline,
              color: v.passed ? Colors.green : Colors.red,
            ),
            title: Text(v.ruleName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            subtitle: Text(v.detail, style: const TextStyle(fontSize: 12)),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(v.source ?? 'Code', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
            ),
          ),
        );
      },
    );
  }
}
