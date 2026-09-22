using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Aegis.Recovery.Dtos;
using Aegis.Recovery.Models;
using Microsoft.Extensions.Configuration;

namespace Aegis.Recovery.Services;

/// <summary>
/// Orchestrates the 4-agent Recovery Planning workflow by integrating with the Python Agent Microservice (recovery_agent.py)
/// on Port 8004 with strong deterministic C# guardrails, prompt safety, and fallback capabilities.
/// </summary>
public class RecoveryAgentClientService
{
    private static readonly TimeSpan WorkflowTimeout = TimeSpan.FromSeconds(120);
    private readonly HttpClient _httpClient;
    private readonly IConfiguration? _configuration;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        NumberHandling = JsonNumberHandling.AllowReadingFromString
    };

    public RecoveryAgentClientService() : this(new HttpClient(), null) { }

    public RecoveryAgentClientService(HttpClient httpClient, IConfiguration? configuration = null)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Public entry point
    // ──────────────────────────────────────────────────────────────────────────

    public async Task<(RecoveryPlan Plan, RecoveryWorkflowLog Log)> RunWorkflowAsync(
        Guid incidentId,
        IncidentDamageReportDto damageReport,
        List<Shelter> availableShelters,
        List<NGO> activeNGOs,
        string? revisionGuidance = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(damageReport);
        availableShelters ??= new List<Shelter>();
        activeNGOs ??= new List<NGO>();

        var started = Stopwatch.GetTimestamp();

        using var workflowCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        workflowCts.CancelAfter(WorkflowTimeout);

        var agentServiceUrl = FirstNonEmpty(
            Environment.GetEnvironmentVariable("RECOVERY_AGENT_URL"),
            _configuration?["AgenticAi:RecoveryAgentUrl"],
            "http://127.0.0.1:8004/api/recovery/agent/run");

        var safe = BuildSafeReport(incidentId, damageReport);
        var cleanedGuidance = PromptSafety.Sanitize(revisionGuidance, 500, out var guidanceFlagged);
        string? guidance = string.IsNullOrEmpty(cleanedGuidance) ? null : cleanedGuidance;

        var run = new RunState { AgentServiceUrl = agentServiceUrl, Ct = workflowCts.Token };

        try
        {
            var district = ExtractDistrict(safe.Location);
            var requiredBeds = RecoveryRules.RequiredBeds(safe.DisplacedFamilies);
            var reliefDays = RecoveryRules.ReliefDays(safe.DisplacedFamilies);

            var shelterResult = run.Tools.QueryShelterCapacity(AgentNames.Analysis, district, requiredBeds, availableShelters);
            var repairCosts = run.Tools.EstimateRepairCosts(AgentNames.Analysis, safe.Assets);
            var sectors = RecoveryRules.NeededSectorKeywords(safe.Assets.Select(a => a.AssetType), safe.DisplacedFamilies);
            var ngoMatches = run.Tools.MatchNgos(AgentNames.Matching, district, sectors, activeNGOs);
            var stipend = run.Tools.CalculateFamilyStipend(AgentNames.Matching, safe.DisplacedFamilies, reliefDays);

            // Call Python Microservice
            var pyResponse = await CallPythonAgentServiceAsync(run, safe, guidance, shelterResult, repairCosts, ngoMatches, stipend);

            var category = RecoveryRules.CategoriseDisaster(safe.HousesDamaged, safe.DisplacedFamilies);
            var phases = pyResponse?.Agent1Output != null 
                ? NormalizeAgent1(pyResponse.Agent1Output, category) 
                : FallbackAgent1(safe, category, guidance);

            var rankedAssets = ReconcileAssets(safe.Assets, pyResponse?.Agent2Output?.PrioritizedDamageList);
            var agent2Result = new Agent2Result(rankedAssets, shelterResult, repairCosts, requiredBeds, reliefDays);

            var corrections = new List<string>();
            var tasks = pyResponse?.Agent3Output?.Tasks != null
                ? NormalizeDraftTasks(pyResponse.Agent3Output.Tasks, ngoMatches, agent2Result, corrections)
                : new List<PlanTask>();

            EnsureMandatoryTasks(tasks, safe, agent2Result, ngoMatches, stipend, corrections);

            var computedBudget = tasks.Sum(t => t.EstimatedCost);
            AlignAgent3Summary(run, tasks.Count, computedBudget);

            var guardrails = RecoveryGuardrails.Evaluate(
                pyResponse?.Agent3Output?.PlanName ?? $"Master Recovery Plan — {safe.Location}", 
                tasks, computedBudget, null, shelterResult,
                activeNGOs.Select(n => n.Name).ToList(), safe.InputFlagged || guidanceFlagged);
            run.Validations.AddRange(guardrails);

            // Human approval gate (Deterministic Rule)
            var failedChecks = guardrails.Where(g => !g.Passed).Select(g => g.RuleName).ToList();
            var reasons = new List<string>();
            if (computedBudget > RecoveryRules.HumanApprovalBudgetThresholdLkr)
                reasons.Add($"Budget LKR {computedBudget:N0} exceeds the LKR {RecoveryRules.HumanApprovalBudgetThresholdLkr:N0} threshold.");
            if (pyResponse?.Agent4Output?.RequiresHumanApproval == true)
                reasons.Add($"AI policy review requested human review: {pyResponse.Agent4Output.ApprovalReason}");
            if (failedChecks.Count > 0)
                reasons.Add($"Guardrail(s) failed: {string.Join("; ", failedChecks)}.");
            if (run.UsedFallback)
                reasons.Add("Degraded mode: Python Agent Microservice was offline; fallback deterministic logic was used.");

            var requiresHumanApproval = reasons.Count > 0;
            var planStatus = requiresHumanApproval ? "PendingApproval" : "Approved";
            var taskStatus = requiresHumanApproval ? "Pending" : "InProgress";

            var verdict = requiresHumanApproval ? "Awaiting Officer approval." : "Auto-approved.";
            var planName = PromptSafety.Truncate(pyResponse?.Agent3Output?.PlanName ?? $"Master Recovery Plan — {safe.Location}", 200);
            var summary = PromptSafety.Truncate($"Plan with {tasks.Count} tasks totaling LKR {computedBudget:N0}. {verdict}".Trim(), 1000);

            var plan = new RecoveryPlan
            {
                IncidentId = incidentId,
                PlanName = planName,
                Status = planStatus,
                EstimatedTotalBudget = computedBudget,
                PlanSummaryJson = JsonSerializer.Serialize(new
                {
                    IncidentId = incidentId,
                    safe.DisasterType,
                    safe.Location,
                    safe.HousesDamaged,
                    safe.DisplacedFamilies,
                    DisasterCategory = category,
                    Phases = phases.RecoveryPhases,
                    ShelterAllocations = shelterResult.Allocations,
                    ShelterDeficitBeds = shelterResult.Deficit,
                    Stipend = stipend,
                    Summary = summary,
                    RequiresHumanApproval = requiresHumanApproval,
                    ApprovalReasons = reasons,
                    UsedFallback = run.UsedFallback,
                    Agents = new[] { "Orchestrator/Planner", "Infrastructure Analysis", "NGO Matching Tools", "Safety Validation" }
                }, JsonOptions),
                CreatedAt = DateTime.UtcNow,
                Tasks = BuildRecoveryTasks(tasks, activeNGOs, taskStatus)
            };

            var log = BuildLog(safe, guidance, run, planStatus, summary, started);
            return (plan, log);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            return BuildFailedResult(incidentId, safe, guidance, run, ex, started);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Python Microservice HTTP Communication
    // ──────────────────────────────────────────────────────────────────────────

    private async Task<PythonWorkflowResponse?> CallPythonAgentServiceAsync(
        RunState run, SafeReport safe, string? guidance,
        ShelterCapacityResult shelterResult, IReadOnlyList<CostBenchmark> costs,
        IReadOnlyList<NgoMatch> matches, StipendResult stipend)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var payload = new
            {
                incidentId = safe.IncidentId,
                disasterType = safe.DisasterType,
                location = safe.Location,
                housesDamaged = safe.HousesDamaged,
                displacedFamilies = safe.DisplacedFamilies,
                revisionGuidance = guidance,
                assets = safe.Assets,
                shelterData = shelterResult,
                costBenchmarks = costs,
                qualifiedNgos = matches,
                stipendData = stipend
            };

            using var response = await _httpClient.PostAsJsonAsync(run.AgentServiceUrl, payload, JsonOptions, run.Ct);
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<PythonWorkflowResponse>(JsonOptions, run.Ct);
                RecordPythonAgentSteps(run, result, sw);
                return result;
            }

            run.UsedFallback = true;
            run.Errors.Add($"Python Agent Service returned HTTP {response.StatusCode}");
            RecordStep(run, "Python 4-Agent Pipeline", "Executes LangGraph agentic workflow", "Incident Payload", "HTTP Error - Fallback Triggered", sw, false, $"HTTP {response.StatusCode}");
        }
        catch (Exception ex)
        {
            run.UsedFallback = true;
            run.Errors.Add($"Python Agent Service Exception: {ex.Message}");
            RecordStep(run, "Python 4-Agent Pipeline", "Executes LangGraph agentic workflow", "Incident Payload", "Connection Failed - Fallback Triggered", sw, false, ex.Message);
        }

        return null;
    }

    private static (RecoveryPlan Plan, RecoveryWorkflowLog Log) BuildFailedResult(
        Guid incidentId, SafeReport safe, string? guidance, RunState run, Exception ex, long started)
    {
        var message = ex is OperationCanceledException
            ? $"Workflow exceeded the {WorkflowTimeout.TotalSeconds:N0}s time limit."
            : $"{ex.GetType().Name}: {PromptSafety.Truncate(ex.Message, 300)}";
        run.Errors.Add($"Workflow failed safely: {message}");

        var summary = $"Workflow failed safely and no plan was created. {message}";
        var plan = new RecoveryPlan
        {
            IncidentId = incidentId,
            PlanName = $"Recovery Strategy (failed) — {safe.Location}",
            Status = "Failed",
            EstimatedTotalBudget = 0m,
            PlanSummaryJson = JsonSerializer.Serialize(new
            {
                IncidentId = incidentId,
                safe.DisasterType,
                safe.Location,
                Summary = summary,
                RequiresHumanApproval = false,
                Failed = true
            }, JsonOptions),
            CreatedAt = DateTime.UtcNow,
            Tasks = new List<RecoveryTask>()
        };

        return (plan, BuildLog(safe, guidance, run, "Failed", summary, started));
    }

    private static RecoveryWorkflowLog BuildLog(SafeReport safe, string? guidance, RunState run,
        string executionStatus, string summary, long started)
    {
        var totalMs = (int)((Stopwatch.GetTimestamp() - started) * 1000.0 / Stopwatch.Frequency);

        return new RecoveryWorkflowLog
        {
            ObjectiveJson = JsonSerializer.Serialize(new
            {
                IncidentId = safe.IncidentId,
                safe.DisasterType,
                safe.Location,
                safe.HousesDamaged,
                safe.DisplacedFamilies,
                InfrastructureItemCount = safe.Assets.Count,
                InputFlagged = safe.InputFlagged,
                RevisionGuidance = guidance
            }, JsonOptions),
            AgentStepsJson = JsonSerializer.Serialize(run.Steps, JsonOptions),
            ToolCallsJson = JsonSerializer.Serialize(run.Tools.Log, JsonOptions),
            ValidationResultsJson = JsonSerializer.Serialize(run.Validations, JsonOptions),
            Errors = PromptSafety.Truncate(string.Join("; ", run.Errors), 2000),
            RetryCount = run.Retries,
            ExecutionStatus = executionStatus,
            TotalDurationMs = totalMs,
            ExecutionSummary = summary,
            CreatedAt = DateTime.UtcNow
        };
    }

    private static Agent1Output NormalizeAgent1(Agent1Output o, string category)
    {
        var phases = new List<Agent1Phase>();
        var number = 1;
        foreach (var p in (o.RecoveryPhases ?? new List<Agent1Phase>()).Take(4))
        {
            phases.Add(new Agent1Phase
            {
                PhaseNumber = number++,
                PhaseName = PromptSafety.Sanitize(p.PhaseName, 120, out _),
                Priority = RecoveryRules.ValidPriorities.FirstOrDefault(x => string.Equals(x, p.Priority, StringComparison.OrdinalIgnoreCase)) ?? "Medium",
                Objective = PromptSafety.Sanitize(p.Objective, 200, out _),
                EstimatedDurationDays = Math.Clamp(p.EstimatedDurationDays, 1, 365)
            });
        }

        return new Agent1Output
        {
            DisasterCategory = category,
            RecoveryPhases = phases,
            PlannerRationale = PromptSafety.Sanitize(o.PlannerRationale, 300, out _)
        };
    }

    private static Agent1Output FallbackAgent1(SafeReport report, string category, string? guidance) => new()
    {
        DisasterCategory = category,
        RecoveryPhases = new List<Agent1Phase>
        {
            new() { PhaseNumber = 1, PhaseName = "Phase 1: Emergency Shelter Operations & Evacuee Care", Priority = "Critical", Objective = $"Establish emergency shelter & food rations for {report.DisplacedFamilies} displaced families in {report.Location}.", EstimatedDurationDays = 14 },
            new() { PhaseNumber = 2, PhaseName = "Phase 2: Critical Lifeline Infrastructure & Access Restoration", Priority = "Critical", Objective = $"Urgent repair of damaged water, transport, and community lifelines in {report.Location}.", EstimatedDurationDays = 30 },
            new() { PhaseNumber = 3, PhaseName = "Phase 3: Citizen Disaster Compensation & Financial Living Relief", Priority = "High", Objective = "Disburse emergency cash stipends and process initial housing loss compensation claims.", EstimatedDurationDays = 45 },
            new() { PhaseNumber = 4, PhaseName = "Phase 4: Community Rehabilitation & Long-Term Reconstruction", Priority = "Medium", Objective = "Secondary rebuilding, slope stabilization, and public safety infrastructure resilience.", EstimatedDurationDays = 90 }
        },
        PlannerRationale = string.IsNullOrWhiteSpace(guidance)
            ? $"Deterministic strategy prioritizes evacuee life-safety, then lifeline infrastructure recovery for {report.Location}."
            : $"Officer guidance was recorded: {guidance}"
    };

    private static List<RankedAsset> ReconcileAssets(IReadOnlyList<SafeAsset> assets, List<PrioritizedDamageItem>? llmItems)
    {
        var llmInfo = new Dictionary<string, (int Rank, string? Complexity)>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in llmItems ?? new List<PrioritizedDamageItem>())
        {
            var key = $"{item.AssetName?.Trim()}|{RecoveryRules.NormalizeAssetType(item.AssetType)}";
            if (!llmInfo.ContainsKey(key)) llmInfo[key] = (item.UrgencyRank, item.RepairComplexity);
        }

        var entries = new List<(SafeAsset Asset, int LlmRank, string? Complexity)>();
        foreach (var asset in assets)
        {
            var key = $"{asset.AssetName.Trim()}|{asset.AssetType}";
            var found = llmInfo.TryGetValue(key, out var hit);
            entries.Add((asset, found ? hit.Rank : int.MaxValue, found ? hit.Complexity : null));
        }

        var ordered = entries
            .OrderByDescending(e => RecoveryRules.DamageWeight(e.Asset.DamageLevel))
            .ThenByDescending(e => RecoveryRules.IsLifeline(e.Asset.AssetType))
            .ThenBy(e => e.LlmRank)
            .ToList();

        var result = new List<RankedAsset>();
        for (var i = 0; i < ordered.Count; i++)
        {
            var (asset, _, complexity) = ordered[i];
            var validComplexity = complexity is "Simple" or "Moderate" or "Complex";
            result.Add(new RankedAsset(
                asset.AssetName, asset.AssetType, asset.DamageLevel, i + 1,
                validComplexity ? complexity! : (asset.DamageLevel == "Destroyed" ? "Complex" : "Moderate"),
                RecoveryRules.IsLifeline(asset.AssetType)));
        }
        return result;
    }

    private static List<PlanTask> NormalizeDraftTasks(List<Agent3TaskDraft> drafts, IReadOnlyList<NgoMatch> matches, Agent2Result analysis, List<string> corrections)
    {
        var result = new List<PlanTask>();
        foreach (var d in drafts.Take(25))
        {
            var title = (d.Title ?? string.Empty).Trim();
            if (title.Length == 0) continue;

            string? ngoName = null;
            if (!string.IsNullOrWhiteSpace(d.AssignedNgoName))
            {
                var requested = d.AssignedNgoName.Trim();
                var hit = matches.FirstOrDefault(m => string.Equals(m.Name, requested, StringComparison.OrdinalIgnoreCase));
                if (hit != null) ngoName = hit.Name;
            }

            var priority = RecoveryRules.ValidPriorities.FirstOrDefault(p => string.Equals(p, d.Priority, StringComparison.OrdinalIgnoreCase)) ?? "Medium";
            var cost = Math.Max(d.EstimatedCost, 0m);

            var asset = analysis.Assets.FirstOrDefault(a =>
                (!string.IsNullOrWhiteSpace(d.AssetName) && string.Equals(a.AssetName, d.AssetName.Trim(), StringComparison.OrdinalIgnoreCase))
                || title.Contains(a.AssetName, StringComparison.OrdinalIgnoreCase));

            result.Add(new PlanTask(
                title,
                PromptSafety.Truncate((d.Description ?? string.Empty).Trim(), 500),
                ngoName,
                string.IsNullOrWhiteSpace(d.Sector) ? "General" : PromptSafety.Truncate(d.Sector.Trim(), 60),
                priority,
                cost,
                asset?.AssetName,
                asset?.AssetType,
                ParseUtc(d.TargetCompletionDate)));
        }
        return result;
    }

    private static void EnsureMandatoryTasks(List<PlanTask> tasks, SafeReport report, Agent2Result analysis, IReadOnlyList<NgoMatch> matches, StipendResult stipend, List<string> corrections)
    {
        var now = DateTime.UtcNow;
        foreach (var asset in analysis.Assets)
        {
            if (tasks.Any(t => string.Equals(t.AssetName, asset.AssetName, StringComparison.OrdinalIgnoreCase))) continue;

            var bench = analysis.Costs.FirstOrDefault(c => string.Equals(c.AssetName, asset.AssetName, StringComparison.OrdinalIgnoreCase));
            var cost = bench == null ? 100_000m : Math.Round((bench.StandardCostLkrMin + bench.StandardCostLkrMax) / 2m);
            var ngo = PickNgo(matches, RecoveryRules.SectorKeywordsForAsset(asset.AssetType));

            tasks.Add(new PlanTask(
                $"Reconstruct & Restore: {asset.AssetName}",
                $"Engineering rehabilitation of {asset.DamageLevel.ToLowerInvariant()} {asset.AssetType.ToLowerInvariant()} asset.",
                ngo, "Infrastructure", asset.AffectsLifeline || asset.DamageLevel == "Destroyed" ? "Critical" : "High",
                cost, asset.AssetName, asset.AssetType, now.AddDays(30)));
        }

        if (report.DisplacedFamilies > 0 && !tasks.Any(t => t.Sector.Contains("Shelter", StringComparison.OrdinalIgnoreCase)))
        {
            var ngo = PickNgo(matches, new[] { "Shelter", "Relief" });
            tasks.Add(new PlanTask(
                $"Emergency Shelter Operations ({report.DisplacedFamilies} Families)",
                "Provide daily meals, potable water, and emergency sanitation packages.",
                ngo, "Shelter & Relief", "Critical",
                report.DisplacedFamilies * analysis.ReliefDays * RecoveryRules.ShelterDailyCostPerFamilyLkr,
                null, null, now.AddDays(30)));
        }
    }

    private static string? PickNgo(IReadOnlyList<NgoMatch> matches, IEnumerable<string> keywords)
    {
        foreach (var keyword in keywords)
        {
            var hit = matches.FirstOrDefault(m => m.MatchedSectors.Contains(keyword, StringComparer.OrdinalIgnoreCase));
            if (hit != null) return hit.Name;
        }
        return null;
    }

    private static SafeReport BuildSafeReport(Guid incidentId, IncidentDamageReportDto report)
    {
        var flagged = false;
        var location = PromptSafety.Sanitize(report.Location, 200, out var f1);
        var disasterType = PromptSafety.Sanitize(report.DisasterType, 100, out var f2);
        flagged |= f1 | f2;

        var assets = new List<SafeAsset>();
        foreach (var item in report.InfrastructureDamage ?? [])
        {
            if (assets.Count >= 50) break;
            var name = PromptSafety.Sanitize(item.AssetName, 120, out var f3);
            var type = PromptSafety.Sanitize(item.AssetType, 60, out var f4);
            var level = PromptSafety.Sanitize(item.DamageLevel, 30, out var f5);
            flagged |= f3 | f4 | f5;

            assets.Add(new SafeAsset(
                string.IsNullOrWhiteSpace(name) ? "Unnamed asset" : name,
                RecoveryRules.NormalizeAssetType(type),
                RecoveryRules.NormalizeDamageLevel(level)));
        }

        return new SafeReport(
            incidentId,
            string.IsNullOrEmpty(disasterType) ? "Unknown" : disasterType,
            string.IsNullOrEmpty(location) ? "Unknown location" : location,
            Math.Clamp(report.HousesDamaged, 0, RecoveryRules.MaxFamilies),
            Math.Clamp(report.DisplacedFamilies, 0, RecoveryRules.MaxFamilies),
            assets,
            flagged);
    }

    private static string ExtractDistrict(string location) => location.Split(',')[0].Trim();

    private static DateTime? ParseUtc(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed)
            ? parsed.UtcDateTime
            : null;
    }

    private static List<RecoveryTask> BuildRecoveryTasks(IReadOnlyList<PlanTask> tasks, List<NGO> ngos, string status)
    {
        var result = new List<RecoveryTask>();
        foreach (var t in tasks)
        {
            if (string.IsNullOrWhiteSpace(t.Title)) continue;

            var ngo = string.IsNullOrWhiteSpace(t.AssignedNgoName)
                ? null
                : ngos.Find(n => string.Equals(n.Name, t.AssignedNgoName, StringComparison.OrdinalIgnoreCase));

            result.Add(new RecoveryTask
            {
                Title = PromptSafety.Truncate(t.Title.Trim(), 200),
                Description = PromptSafety.Truncate(t.Description.Trim(), 500),
                AssignedNGOId = ngo?.Id,
                Priority = RecoveryRules.ValidPriorities.Contains(t.Priority) ? t.Priority : "Medium",
                EstimatedCost = Math.Max(t.EstimatedCost, 0m),
                Status = status,
                TargetCompletionDate = t.TargetCompletionDate,
                CreatedAt = DateTime.UtcNow
            });
        }
        return result;
    }

    private static void RecordStep(RunState run, string agent, string role, string inputSummary, string outputSummary,
        Stopwatch sw, bool usedLlm, string? errorMessage)
    {
        sw.Stop();
        var status = usedLlm ? "success" : "fallback";
        run.Steps.Add(new AgentStepRecord(agent, role, inputSummary, outputSummary,
            sw.ElapsedMilliseconds, status, usedLlm ? "llm" : "deterministic", errorMessage));
    }

    private static void RecordPythonAgentSteps(RunState run, PythonWorkflowResponse? response, Stopwatch pipelineStopwatch)
    {
        pipelineStopwatch.Stop();
        var steps = response?.AgentSteps ?? [];
        if (steps.Count == 0)
        {
            run.Steps.Add(new AgentStepRecord(
                AgentNames.Planner,
                "Executes the recovery planning pipeline",
                "Incident Payload",
                "Pipeline completed without detailed agent timeline.",
                pipelineStopwatch.ElapsedMilliseconds,
                "success",
                "llm",
                null));
            return;
        }

        foreach (var step in steps.OrderBy(s => s.StepNumber).Take(4))
        {
            run.Steps.Add(new AgentStepRecord(
                PromptSafety.Truncate(step.AgentName, 160),
                PromptSafety.Truncate(step.Role, 240),
                PromptSafety.Truncate(string.IsNullOrWhiteSpace(step.InputSummary) ? "Incident Assessment Data" : step.InputSummary, 300),
                PromptSafety.Truncate(step.SummaryOutput, 500),
                Math.Max(step.DurationMs, 0),
                string.Equals(step.Status, "success", StringComparison.OrdinalIgnoreCase) ? "success" : "failed",
                "llm",
                null));
        }
    }

    private static void AlignAgent3Summary(RunState run, int taskCount, decimal computedBudget)
    {
        var agent3Index = run.Steps.FindIndex(step => step.AgentName.Contains("Agent 3", StringComparison.OrdinalIgnoreCase));
        if (agent3Index < 0) return;

        var step = run.Steps[agent3Index];
        run.Steps[agent3Index] = step with
        {
            OutputSummary = $"Created {taskCount} actionable tasks with final computed budget: LKR {computedBudget:N2}"
        };
    }

    private static string FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? string.Empty;

    // ──────────────────────────────────────────────────────────────────────────
    // Internal Models, Records & Helper Classes
    // ──────────────────────────────────────────────────────────────────────────

    private sealed class RunState
    {
        public string AgentServiceUrl { get; init; } = string.Empty;
        public CancellationToken Ct { get; init; }
        public RecoveryToolbox Tools { get; } = new();
        public List<AgentStepRecord> Steps { get; } = new();
        public List<GuardrailCheck> Validations { get; } = new();
        public List<string> Errors { get; } = new();
        public int Retries { get; set; }
        public bool UsedFallback { get; set; }
    }

    private sealed record Agent2Result(IReadOnlyList<RankedAsset> Assets, ShelterCapacityResult Shelters,
        IReadOnlyList<CostBenchmark> Costs, int RequiredBeds, int ReliefDays);

    private sealed class PythonWorkflowResponse
    {
        public Agent1Output? Agent1Output { get; set; }
        public Agent2Output? Agent2Output { get; set; }
        public Agent3Output? Agent3Output { get; set; }
        public Agent4Output? Agent4Output { get; set; }
        public List<PythonAgentStep> AgentSteps { get; set; } = [];
    }

    private sealed class PythonAgentStep
    {
        public int StepNumber { get; set; }
        public string AgentName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string InputSummary { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int DurationMs { get; set; }
        public string SummaryOutput { get; set; } = string.Empty;
    }

    private sealed class Agent1Output
    {
        public string? DisasterCategory { get; set; }
        public List<Agent1Phase>? RecoveryPhases { get; set; }
        public string? PlannerRationale { get; set; }
    }

    private sealed class Agent1Phase
    {
        public int PhaseNumber { get; set; }
        public string? PhaseName { get; set; }
        public string? Priority { get; set; }
        public string? Objective { get; set; }
        public int EstimatedDurationDays { get; set; }
    }

    private sealed class Agent2Output
    {
        public List<PrioritizedDamageItem>? PrioritizedDamageList { get; set; }
    }

    private sealed class PrioritizedDamageItem
    {
        public string? AssetName { get; set; }
        public string? AssetType { get; set; }
        public string? DamageLevel { get; set; }
        public int UrgencyRank { get; set; }
        public string? RepairComplexity { get; set; }
    }

    private sealed class Agent3Output
    {
        public string? PlanName { get; set; }
        public decimal EstimatedTotalBudget { get; set; }
        public List<Agent3TaskDraft>? Tasks { get; set; }
    }

    private sealed class Agent3TaskDraft
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? AssignedNgoName { get; set; }
        public string? Sector { get; set; }
        public string? AssetName { get; set; }
        public string? Priority { get; set; }
        public decimal EstimatedCost { get; set; }
        public string? TargetCompletionDate { get; set; }
    }

    private sealed class Agent4Output
    {
        public bool RequiresHumanApproval { get; set; }
        public string? ApprovalReason { get; set; }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Domain Helper Records & Utility Classes
// ──────────────────────────────────────────────────────────────────────────────

public sealed record SafeReport(Guid IncidentId, string DisasterType, string Location, int HousesDamaged, int DisplacedFamilies, IReadOnlyList<SafeAsset> Assets, bool InputFlagged);

public sealed record SafeAsset(string AssetName, string AssetType, string DamageLevel);

public sealed record RankedAsset(string AssetName, string AssetType, string DamageLevel, int UrgencyRank, string RepairComplexity, bool AffectsLifeline);

public sealed record PlanTask(string Title, string Description, string? AssignedNgoName, string Sector, string Priority, decimal EstimatedCost, string? AssetName, string? AssetType, DateTime? TargetCompletionDate);

public sealed record ShelterCapacityResult(int TotalRemainingInDistrict, int Deficit, List<object> Allocations);

public sealed record CostBenchmark(string AssetName, string AssetType, decimal StandardCostLkrMin, decimal StandardCostLkrMax);

public sealed record NgoMatch(string Name, List<string> Sectors, List<string> OperatingDistricts, List<string> MatchedSectors);

public sealed record StipendResult(decimal TotalStipendLkr, decimal PerFamilyDailyRate, int DisplacedFamilies, int ReliefDays);

public sealed record AgentStepRecord(string AgentName, string Role, string InputSummary, string OutputSummary, long DurationMs, string Status, string ExecutionType, string? ErrorMessage);

public sealed record GuardrailCheck(string RuleName, bool Passed, string Detail, string Source);

public static class AgentNames
{
    public const string Planner = "Agent 1: Recovery Orchestrator / Planner";
    public const string Analysis = "Agent 2: Infrastructure & Shelter Analysis";
    public const string Matching = "Agent 3: Resource & NGO Matching";
    public const string Validation = "Agent 4: Safety, Budget & Policy Validation";
}

public static class PromptSafety
{
    public static string Sanitize(string? input, int maxLength, out bool flagged)
    {
        flagged = false;
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        var cleaned = Regex.Replace(input, @"[\x00-\x1F\x7F]", " ");
        if (Regex.IsMatch(cleaned, @"(ignore|system:|override|jailbreak|forget all|<script|SELECT\s|DROP\s)", RegexOptions.IgnoreCase))
        {
            flagged = true;
            cleaned = Regex.Replace(cleaned, @"(ignore|system:|override|jailbreak|forget all|<script|SELECT\s|DROP\s)", "[REDACTED]", RegexOptions.IgnoreCase);
        }
        return Truncate(cleaned.Trim(), maxLength);
    }

    public static string Truncate(string input, int maxLength)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;
        return input.Length <= maxLength ? input : input[..maxLength];
    }
}

public static class RecoveryRules
{
    public const decimal HumanApprovalBudgetThresholdLkr = 500_000m;
    public const decimal ShelterDailyCostPerFamilyLkr = 1_200m;
    public const int MaxFamilies = 10_000;
    public static readonly string[] ValidPriorities = { "Critical", "High", "Medium", "Low" };

    public static int RequiredBeds(int displacedFamilies) => Math.Max(displacedFamilies * 4, 0);
    public static int ReliefDays(int displacedFamilies) => displacedFamilies > 30 ? 45 : 30;

    public static string CategoriseDisaster(int housesDamaged, int displacedFamilies) =>
        housesDamaged > 40 || displacedFamilies > 40 ? "Critical" :
        housesDamaged > 15 || displacedFamilies > 15 ? "Severe" :
        housesDamaged > 5 || displacedFamilies > 5 ? "Moderate" : "Minor";

    public static string NormalizeAssetType(string? type)
    {
        if (string.IsNullOrWhiteSpace(type)) return "Road";
        var t = type.Trim();
        if (t.Contains("Bridge", StringComparison.OrdinalIgnoreCase)) return "Bridge";
        if (t.Contains("Water", StringComparison.OrdinalIgnoreCase)) return "Water";
        if (t.Contains("Hospital", StringComparison.OrdinalIgnoreCase) || t.Contains("Health", StringComparison.OrdinalIgnoreCase)) return "Hospital";
        if (t.Contains("Power", StringComparison.OrdinalIgnoreCase) || t.Contains("Grid", StringComparison.OrdinalIgnoreCase)) return "Power";
        return "Road";
    }

    public static string NormalizeDamageLevel(string? level)
    {
        if (string.IsNullOrWhiteSpace(level)) return "Moderate";
        var l = level.Trim();
        if (l.Equals("Destroyed", StringComparison.OrdinalIgnoreCase)) return "Destroyed";
        if (l.Equals("Severe", StringComparison.OrdinalIgnoreCase)) return "Severe";
        if (l.Equals("Moderate", StringComparison.OrdinalIgnoreCase)) return "Moderate";
        if (l.Equals("Minor", StringComparison.OrdinalIgnoreCase)) return "Minor";
        return "Moderate";
    }

    public static int DamageWeight(string damageLevel) => damageLevel switch
    {
        "Destroyed" => 4,
        "Severe" => 3,
        "Moderate" => 2,
        _ => 1
    };

    public static bool IsLifeline(string assetType) =>
        assetType is "Bridge" or "Water" or "Hospital" or "Power" or "Road";

    public static List<string> NeededSectorKeywords(IEnumerable<string> assetTypes, int displacedFamilies)
    {
        var list = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Infrastructure" };
        foreach (var type in assetTypes) list.Add(type);
        if (displacedFamilies > 0)
        {
            list.Add("Shelter");
            list.Add("Relief");
            list.Add("Social Welfare");
        }
        return list.ToList();
    }

    public static string[] SectorKeywordsForAsset(string assetType) => new[] { assetType, "Infrastructure", "General" };
}

public sealed class RecoveryToolbox
{
    public List<object> Log { get; } = new();

    private void RecordTool(string agent, string toolName, object input, object output, Stopwatch stopwatch)
    {
        stopwatch.Stop();
        Log.Add(new
        {
            toolName,
            inputJson = JsonSerializer.Serialize(input),
            outputJson = JsonSerializer.Serialize(output),
            durationMs = stopwatch.ElapsedMilliseconds,
            status = "success",
            errorMessage = (string?)null
        });
    }

    public ShelterCapacityResult QueryShelterCapacity(string agent, string district, int requiredBeds, List<Shelter> shelters)
    {
        var sw = Stopwatch.StartNew();
        var active = shelters.Where(s => s.Status == "Active").ToList();

        // Extract district tokens to support single or multiple comma/slash separated target districts
        var districtTokens = (district ?? string.Empty)
            .Split(new[] { ',', '&', '/', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(d => d.Replace("Districts", "", StringComparison.OrdinalIgnoreCase).Replace("District", "", StringComparison.OrdinalIgnoreCase).Trim())
            .Where(d => !string.IsNullOrWhiteSpace(d))
            .ToList();

        // Strictly match shelters situated in the affected district(s)
        var matching = active.Where(s =>
            districtTokens.Any(dt =>
                s.District.Contains(dt, StringComparison.OrdinalIgnoreCase) ||
                dt.Contains(s.District, StringComparison.OrdinalIgnoreCase)
            )
        ).ToList();

        var available = matching.Sum(s => Math.Max(s.Capacity - s.CurrentOccupancy, 0));
        var deficit = Math.Max(requiredBeds - available, 0);

        var allocations = matching.Select(s => (object)new
        {
            id = s.Id,
            name = s.Name,
            district = s.District,
            location = s.Location,
            capacity = s.Capacity,
            currentOccupancy = s.CurrentOccupancy,
            remainingBeds = Math.Max(s.Capacity - s.CurrentOccupancy, 0),
            facilities = s.Facilities,
            contactPerson = s.ContactPerson,
            contactPhone = s.ContactPhone
        }).ToList();

        RecordTool(agent, "tool_query_shelter_capacity",
            new { district, requiredBeds },
            new { availableShelters = allocations, totalRemainingBeds = available, deficit }, sw);

        return new ShelterCapacityResult(available, deficit, allocations);
    }

    public IReadOnlyList<CostBenchmark> EstimateRepairCosts(string agent, IReadOnlyList<SafeAsset> assets)
    {
        var sw = Stopwatch.StartNew();
        var list = new List<CostBenchmark>();
        foreach (var a in assets)
        {
            var (min, max) = a.DamageLevel switch
            {
                "Destroyed" => (300_000m, 800_000m),
                "Severe" => (150_000m, 400_000m),
                "Moderate" => (80_000m, 200_000m),
                _ => (30_000m, 80_000m)
            };
            list.Add(new CostBenchmark(a.AssetName, a.AssetType, min, max));
        }

        RecordTool(agent, "tool_estimate_repair_costs", assets, list, sw);

        return list;
    }

    public IReadOnlyList<NgoMatch> MatchNgos(string agent, string district, List<string> sectors, List<NGO> ngos)
    {
        var sw = Stopwatch.StartNew();
        var matches = new List<NgoMatch>();

        foreach (var n in ngos.Where(x => x.Status == "Active"))
        {
            var matchedSectors = sectors.Where(s => n.Sectors.Contains(s, StringComparison.OrdinalIgnoreCase)).ToList();
            if (matchedSectors.Count > 0)
            {
                matches.Add(new NgoMatch(n.Name, n.Sectors.Split(',').Select(s => s.Trim()).ToList(),
                    n.OperatingDistricts.Split(',').Select(d => d.Trim()).ToList(), matchedSectors));
            }
        }

        RecordTool(agent, "tool_match_ngo_by_sector",
            new { district, sectors },
            new { qualifiedNGOs = matches }, sw);

        return matches;
    }

    public StipendResult CalculateFamilyStipend(string agent, int displacedFamilies, int reliefDays)
    {
        var sw = Stopwatch.StartNew();
        const decimal rate = 1_500m;
        var total = displacedFamilies * reliefDays * rate;

        RecordTool(agent, "tool_calculate_cash_stipend_budget",
            new { displacedFamilies, reliefDays },
            new { totalStipendBudget = total, dailyStipendPerFamily = rate }, sw);

        return new StipendResult(total, rate, displacedFamilies, reliefDays);
    }
}

public static class RecoveryGuardrails
{
    public static List<GuardrailCheck> Evaluate(
        string planName, IReadOnlyList<PlanTask> tasks, decimal computedBudget,
        decimal? declaredBudget, ShelterCapacityResult shelterResult, List<string> approvedNgos, bool inputFlagged)
    {
        var list = new List<GuardrailCheck>();

        var budgetPassed = computedBudget > 0 && computedBudget <= 50_000_000m;
        list.Add(new GuardrailCheck("Budget Sanity & Policy Limits", budgetPassed,
            budgetPassed ? $"Budget LKR {computedBudget:N0} is within statutory bounds." : $"Budget LKR {computedBudget:N0} exceeds maximum statutory limit.", "System Policy"));

        if (declaredBudget.HasValue && declaredBudget.Value > 0)
        {
            var diff = Math.Abs(declaredBudget.Value - computedBudget);
            var match = diff < 1_000m;
            list.Add(new GuardrailCheck("Budget Integrity & Arithmetic Check", match,
                match ? "Declared and computed budgets match perfectly." : $"Mismatch: Declared LKR {declaredBudget:N0} vs Computed LKR {computedBudget:N0}.", "System Policy"));
        }

        list.Add(new GuardrailCheck("Prompt Safety & Input Sanitization", !inputFlagged,
            inputFlagged ? "Suspicious patterns detected and redacted from input." : "Input verified safe — no injection patterns detected.", "Security Guardrail"));

        var unverified = tasks.Where(t => !string.IsNullOrEmpty(t.AssignedNgoName) && !approvedNgos.Contains(t.AssignedNgoName, StringComparer.OrdinalIgnoreCase)).Select(t => t.AssignedNgoName!).ToList();
        list.Add(new GuardrailCheck("NGO Accreditation & Allow-List Check", unverified.Count == 0,
            unverified.Count == 0 ? "All assigned NGOs are certified and accredited." : $"Uncertified NGOs assigned: {string.Join(", ", unverified)}.", "Compliance Rule"));

        // Displaced families check
        var hasStipendTask = tasks.Any(t => t.Sector.Contains("Shelter", StringComparison.OrdinalIgnoreCase) || t.Sector.Contains("Social Welfare", StringComparison.OrdinalIgnoreCase));
        list.Add(new GuardrailCheck("Displaced Families Relief Coverage", hasStipendTask,
            hasStipendTask ? "Displaced families are fully covered by shelter or social welfare task." : "Warning: No shelter or stipend task for displaced families.", "Humanitarian Standard"));

        return list;
    }
}