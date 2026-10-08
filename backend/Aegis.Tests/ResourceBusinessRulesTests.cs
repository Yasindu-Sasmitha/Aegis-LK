using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Aegis.Resource.Data;
using Aegis.Resource.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Aegis.Tests;

public class ResourceBusinessRulesTests
{
    private ResourceDbContext GetDb() =>
        new(new DbContextOptionsBuilder<ResourceDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static Warehouse WH(string name="Colombo Depot", string dist="Colombo",
        decimal lat=6.9271m, decimal lng=79.8612m) => new()
        { Id=Guid.NewGuid(), Name=name, District=dist, Latitude=lat, Longitude=lng, ContactPhone="+94112223344" };

    private static Vehicle VH(Guid whId,
        VehicleType t=VehicleType.Truck, VehicleStatus s=VehicleStatus.Available, decimal cap=1200m) => new()
        { Id=Guid.NewGuid(), WarehouseId=whId,
          RegistrationNumber=$"WP-{Guid.NewGuid().ToString()[..4].ToUpper()}",
          VehicleType=t, Capacity=cap, Status=s };

    private static Inventory INV(Guid whId, string name="Water Bottles",
        ItemType t=ItemType.Food, int qty=500, int thresh=100) => new()
        { Id=Guid.NewGuid(), WarehouseId=whId, ItemName=name,
          ItemType=t, QuantityAvailable=qty, Unit="cases", ReorderThreshold=thresh };

    private static ResourceRequest REQ(string dist="Colombo") => new()
        { Id=Guid.NewGuid(), MissionId=Guid.NewGuid(), TeamsRequired=2,
          District=dist, Latitude=6.9m, Longitude=79.8m };

    private static Dispatch DP(Guid reqId, Guid whId, Guid vId,
        DispatchApprovalStatus st=DispatchApprovalStatus.PendingApproval,
        string reason="AI dispatch") => new()
        { Id=Guid.NewGuid(), ResourceRequestId=reqId, WarehouseId=whId, VehicleId=vId,
          ItemsAllocated=new(), EstimatedArrivalMinutes=45, ApprovalStatus=st, AgentReasoning=reason };

    // =====================================================================
    // 1. Warehouse tests  (RES-WH-01 to RES-WH-06)
    // =====================================================================

    [Fact] public async Task WH01_Create_PersistsAllFields()
    {
        using var db=GetDb();
        var wh=WH("Kandy Depot","Kandy",7.2906m,80.6337m);
        db.Warehouses.Add(wh); await db.SaveChangesAsync();
        var s=await db.Warehouses.FindAsync(wh.Id);
        Assert.NotNull(s); Assert.Equal("Kandy Depot",s.Name);
        Assert.Equal("Kandy",s.District); Assert.Equal(7.2906m,s.Latitude);
    }

    [Fact] public async Task WH02_CreatedAt_DefaultsToUtcNow()
    {
        using var db=GetDb();
        var before=DateTime.UtcNow.AddSeconds(-1);
        var wh=WH(); db.Warehouses.Add(wh); await db.SaveChangesAsync();
        var s=await db.Warehouses.FindAsync(wh.Id);
        Assert.True(s!.CreatedAt>=before && s.CreatedAt<=DateTime.UtcNow.AddSeconds(1));
    }

    [Fact] public async Task WH03_Multiple_AllPersistWithUniqueIds()
    {
        using var db=GetDb();
        var w1=WH("A","Colombo"); var w2=WH("B","Gampaha"); var w3=WH("C","Kalutara");
        db.Warehouses.AddRange(w1,w2,w3); await db.SaveChangesAsync();
        Assert.Equal(3,await db.Warehouses.CountAsync());
        Assert.NotEqual(w1.Id,w2.Id); Assert.NotEqual(w2.Id,w3.Id);
    }

    [Fact] public async Task WH04_FilterByDistrict_ReturnsCorrectSubset()
    {
        using var db=GetDb();
        db.Warehouses.AddRange(WH("A","Colombo"),WH("B","Colombo"),WH("C","Kandy"));
        await db.SaveChangesAsync();
        var r=await db.Warehouses.Where(w=>w.District=="Colombo").ToListAsync();
        Assert.Equal(2,r.Count); Assert.All(r,w=>Assert.Equal("Colombo",w.District));
    }

    [Fact] public async Task WH05_Delete_RemovesRecord()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh); await db.SaveChangesAsync();
        db.Warehouses.Remove(wh); await db.SaveChangesAsync();
        Assert.Null(await db.Warehouses.FindAsync(wh.Id));
    }

    [Fact] public async Task WH06_UpdateName_PersistsChange()
    {
        using var db=GetDb();
        var wh=WH("OldName"); db.Warehouses.Add(wh); await db.SaveChangesAsync();
        wh.Name="NewName"; wh.UpdatedAt=DateTime.UtcNow; await db.SaveChangesAsync();
        Assert.Equal("NewName",(await db.Warehouses.FindAsync(wh.Id))!.Name);
    }

    // =====================================================================
    // 2. Inventory tests  (RES-INV-01 to RES-INV-08)
    // =====================================================================

    [Fact] public async Task INV01_Create_PersistsWithWarehouseLink()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        var inv=INV(wh.Id,"Medical Kits",ItemType.Medical,200); db.Inventory.Add(inv);
        await db.SaveChangesAsync();
        var s=await db.Inventory.FindAsync(inv.Id);
        Assert.Equal("Medical Kits",s!.ItemName); Assert.Equal(ItemType.Medical,s.ItemType);
        Assert.Equal(200,s.QuantityAvailable); Assert.Equal(wh.Id,s.WarehouseId);
    }

    [Fact] public async Task INV02_StockIncrement_AddsQuantity()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        var inv=INV(wh.Id,qty:300); db.Inventory.Add(inv); await db.SaveChangesAsync();
        inv.QuantityAvailable+=100; await db.SaveChangesAsync();
        Assert.Equal(400,(await db.Inventory.FindAsync(inv.Id))!.QuantityAvailable);
    }

    [Fact] public async Task INV03_StockDecrement_ReducesQuantity()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        var inv=INV(wh.Id,qty:500); db.Inventory.Add(inv); await db.SaveChangesAsync();
        inv.QuantityAvailable-=80; await db.SaveChangesAsync();
        Assert.Equal(420,(await db.Inventory.FindAsync(inv.Id))!.QuantityAvailable);
    }

    [Fact] public async Task INV04_LowStock_DetectedByThreshold()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        db.Inventory.AddRange(INV(wh.Id,"WB",qty:50,thresh:100), INV(wh.Id,"RP",qty:300,thresh:100));
        await db.SaveChangesAsync();
        var low=await db.Inventory.Where(i=>i.ReorderThreshold.HasValue&&i.QuantityAvailable<i.ReorderThreshold).ToListAsync();
        Assert.Single(low); Assert.Equal("WB",low[0].ItemName);
    }

    [Fact] public async Task INV05_AllItemTypes_Persist()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        db.Inventory.AddRange(INV(wh.Id,"R",ItemType.Food),INV(wh.Id,"B",ItemType.Medical),INV(wh.Id,"T",ItemType.Shelter));
        await db.SaveChangesAsync();
        var items=await db.Inventory.ToListAsync();
        Assert.Contains(items,i=>i.ItemType==ItemType.Food);
        Assert.Contains(items,i=>i.ItemType==ItemType.Medical);
        Assert.Contains(items,i=>i.ItemType==ItemType.Shelter);
    }

    [Fact] public async Task INV06_FiveItemsSameWarehouse_AllLinked()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        for(int i=0;i<5;i++) db.Inventory.Add(INV(wh.Id,$"Item{i}"));
        await db.SaveChangesAsync();
        var items=await db.Inventory.Where(i=>i.WarehouseId==wh.Id).ToListAsync();
        Assert.Equal(5,items.Count); Assert.All(items,i=>Assert.Equal(wh.Id,i.WarehouseId));
    }

    [Fact] public async Task INV07_ZeroStock_Persists()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        var inv=INV(wh.Id,qty:0); db.Inventory.Add(inv); await db.SaveChangesAsync();
        Assert.Equal(0,(await db.Inventory.FindAsync(inv.Id))!.QuantityAvailable);
    }

    [Fact] public async Task INV08_FilterByItemType_ReturnsSubset()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        db.Inventory.AddRange(INV(wh.Id,"R1",ItemType.Food),INV(wh.Id,"R2",ItemType.Food),INV(wh.Id,"T",ItemType.Shelter));
        await db.SaveChangesAsync();
        Assert.Equal(2,await db.Inventory.CountAsync(i=>i.ItemType==ItemType.Food));
    }

    // =====================================================================
    // 3. Vehicle tests  (RES-VH-01 to RES-VH-08)
    // =====================================================================

    [Fact] public async Task VH01_CreateAvailableTruck_Persists()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        var v=VH(wh.Id,VehicleType.Truck,VehicleStatus.Available,1500m); db.Vehicles.Add(v);
        await db.SaveChangesAsync();
        var s=await db.Vehicles.FindAsync(v.Id);
        Assert.Equal(VehicleType.Truck,s!.VehicleType);
        Assert.Equal(VehicleStatus.Available,s.Status); Assert.Equal(1500m,s.Capacity);
    }

    [Fact] public async Task VH02_Transition_AvailableToDispatched()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        var v=VH(wh.Id); db.Vehicles.Add(v); await db.SaveChangesAsync();
        v.Status=VehicleStatus.Dispatched; await db.SaveChangesAsync();
        Assert.Equal(VehicleStatus.Dispatched,(await db.Vehicles.FindAsync(v.Id))!.Status);
    }

    [Fact] public async Task VH03_Transition_DispatchedToMaintenance()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        var v=VH(wh.Id,s:VehicleStatus.Dispatched); db.Vehicles.Add(v); await db.SaveChangesAsync();
        v.Status=VehicleStatus.Maintenance; await db.SaveChangesAsync();
        Assert.Equal(VehicleStatus.Maintenance,(await db.Vehicles.FindAsync(v.Id))!.Status);
    }

    [Fact] public async Task VH04_CountAvailableInWarehouse_Correct()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        db.Vehicles.AddRange(VH(wh.Id),VH(wh.Id),VH(wh.Id,s:VehicleStatus.Dispatched),VH(wh.Id,s:VehicleStatus.Maintenance));
        await db.SaveChangesAsync();
        Assert.Equal(2,await db.Vehicles.CountAsync(v=>v.WarehouseId==wh.Id&&v.Status==VehicleStatus.Available));
    }

    [Fact] public async Task VH05_AllVehicleTypes_Persist()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        db.Vehicles.AddRange(VH(wh.Id,VehicleType.Truck),VH(wh.Id,VehicleType.Boat),VH(wh.Id,VehicleType.Ambulance),VH(wh.Id,VehicleType.FourByFour));
        await db.SaveChangesAsync();
        var types=await db.Vehicles.Where(v=>v.WarehouseId==wh.Id).Select(v=>v.VehicleType).ToListAsync();
        Assert.Contains(VehicleType.Truck,types); Assert.Contains(VehicleType.Boat,types);
        Assert.Contains(VehicleType.Ambulance,types); Assert.Contains(VehicleType.FourByFour,types);
    }

    [Fact] public async Task VH06_SystemWideFallback_FindsAvailableAcrossWarehouses()
    {
        using var db=GetDb();
        var whA=WH("A","Nuwara Eliya"); var whB=WH("B","Colombo");
        db.Warehouses.AddRange(whA,whB);
        db.Vehicles.Add(VH(whA.Id,s:VehicleStatus.Dispatched));
        db.Vehicles.Add(VH(whB.Id,s:VehicleStatus.Available));
        await db.SaveChangesAsync();
        var fb=await db.Vehicles.FirstOrDefaultAsync(v=>v.Status==VehicleStatus.Available);
        Assert.NotNull(fb); Assert.Equal(whB.Id,fb.WarehouseId);
    }

    [Fact] public async Task VH07_NoAvailableSystemWide_ReturnsNull()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        db.Vehicles.AddRange(VH(wh.Id,s:VehicleStatus.Dispatched),VH(wh.Id,s:VehicleStatus.Maintenance));
        await db.SaveChangesAsync();
        Assert.Null(await db.Vehicles.FirstOrDefaultAsync(v=>v.Status==VehicleStatus.Available));
    }

    [Fact] public async Task VH08_RegistrationNumbers_AreUnique()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        var v1=VH(wh.Id); var v2=VH(wh.Id);
        db.Vehicles.AddRange(v1,v2); await db.SaveChangesAsync();
        Assert.NotEqual(v1.RegistrationNumber,v2.RegistrationNumber);
    }

    // =====================================================================
    // 4. Fuel tests  (RES-FL-01 to RES-FL-04)
    // =====================================================================

    [Fact] public async Task FL01_Create_PersistsWithVehicleLink()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh); var v=VH(wh.Id); db.Vehicles.Add(v);
        var f=new Fuel{Id=Guid.NewGuid(),VehicleId=v.Id,FuelLevel=85m,LastRefueledAt=DateTime.UtcNow.AddHours(-3),RangeEstimateKm=320m};
        db.Fuel.Add(f); await db.SaveChangesAsync();
        var s=await db.Fuel.FindAsync(f.Id);
        Assert.Equal(85m,s!.FuelLevel); Assert.Equal(320m,s.RangeEstimateKm); Assert.Equal(v.Id,s.VehicleId);
    }

    [Fact] public async Task FL02_LowFuel_DetectedBelow20Percent()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        var v1=VH(wh.Id); var v2=VH(wh.Id); db.Vehicles.AddRange(v1,v2);
        db.Fuel.AddRange(new Fuel{Id=Guid.NewGuid(),VehicleId=v1.Id,FuelLevel=15m},new Fuel{Id=Guid.NewGuid(),VehicleId=v2.Id,FuelLevel=90m});
        await db.SaveChangesAsync();
        var low=await db.Fuel.Where(f=>f.FuelLevel<20m).ToListAsync();
        Assert.Single(low); Assert.Equal(v1.Id,low[0].VehicleId);
    }

    [Fact] public async Task FL03_FullTank_LevelIsHundred()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh); var v=VH(wh.Id); db.Vehicles.Add(v);
        var f=new Fuel{Id=Guid.NewGuid(),VehicleId=v.Id,FuelLevel=100m}; db.Fuel.Add(f);
        await db.SaveChangesAsync();
        Assert.Equal(100m,(await db.Fuel.FindAsync(f.Id))!.FuelLevel);
    }

    [Fact] public async Task FL04_UpdateLevel_PersistsRefueling()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh); var v=VH(wh.Id); db.Vehicles.Add(v);
        var f=new Fuel{Id=Guid.NewGuid(),VehicleId=v.Id,FuelLevel=40m}; db.Fuel.Add(f);
        await db.SaveChangesAsync();
        f.FuelLevel=95m; f.LastRefueledAt=DateTime.UtcNow; await db.SaveChangesAsync();
        var s=await db.Fuel.FindAsync(f.Id);
        Assert.Equal(95m,s!.FuelLevel); Assert.NotNull(s.LastRefueledAt);
    }

    // =====================================================================
    // 5. Resource Request tests  (RES-RQ-01 to RES-RQ-03)
    // =====================================================================

    [Fact] public async Task RQ01_Create_DefaultStatusIsPending()
    {
        using var db=GetDb();
        var req=REQ(); db.ResourceRequests.Add(req); await db.SaveChangesAsync();
        Assert.Equal(ResourceRequestStatus.Pending,(await db.ResourceRequests.FindAsync(req.Id))!.Status);
    }

    [Fact] public async Task RQ02_IncidentSnapshot_PersistsDisasterContext()
    {
        using var db=GetDb();
        var req=REQ("Galle");
        req.IncidentDisasterType="Flood"; req.IncidentSeverity="High"; req.IncidentCreatedAt=DateTime.UtcNow.AddHours(-1);
        db.ResourceRequests.Add(req); await db.SaveChangesAsync();
        var s=await db.ResourceRequests.FindAsync(req.Id);
        Assert.Equal("Flood",s!.IncidentDisasterType); Assert.Equal("High",s.IncidentSeverity); Assert.NotNull(s.IncidentCreatedAt);
    }

    [Fact] public async Task RQ03_FilterByDistrict_ReturnsCorrectSubset()
    {
        using var db=GetDb();
        db.ResourceRequests.AddRange(REQ("Colombo"),REQ("Colombo"),REQ("Kandy"));
        await db.SaveChangesAsync();
        Assert.Equal(2,await db.ResourceRequests.CountAsync(r=>r.District=="Colombo"));
    }

    // =====================================================================
    // 6. Dispatch tests  (RES-DP-01 to RES-DP-04)
    // =====================================================================

    [Fact] public async Task DP01_Create_DefaultStatusIsPendingApproval()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh); var v=VH(wh.Id); db.Vehicles.Add(v);
        var req=REQ(); db.ResourceRequests.Add(req);
        var dp=DP(req.Id,wh.Id,v.Id); db.Dispatches.Add(dp); await db.SaveChangesAsync();
        var s=await db.Dispatches.FindAsync(dp.Id);
        Assert.Equal(DispatchApprovalStatus.PendingApproval,s!.ApprovalStatus);
        Assert.Null(s.ApprovedByUserId); Assert.Null(s.ApprovedAt);
    }

    [Fact] public async Task DP02_Approve_SetsAuditorAndTimestamp()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh); var v=VH(wh.Id); db.Vehicles.Add(v);
        var req=REQ(); db.ResourceRequests.Add(req);
        var dp=DP(req.Id,wh.Id,v.Id); db.Dispatches.Add(dp); await db.SaveChangesAsync();
        var officerId=Guid.NewGuid();
        dp.ApprovalStatus=DispatchApprovalStatus.Approved; dp.ApprovedByUserId=officerId; dp.ApprovedAt=DateTime.UtcNow;
        await db.SaveChangesAsync();
        var s=await db.Dispatches.FindAsync(dp.Id);
        Assert.Equal(DispatchApprovalStatus.Approved,s!.ApprovalStatus);
        Assert.Equal(officerId,s.ApprovedByUserId); Assert.NotNull(s.ApprovedAt);
    }

    [Fact] public async Task DP03_AgentReasoning_PersistsFullText()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh); var v=VH(wh.Id); db.Vehicles.Add(v);
        var req=REQ(); db.ResourceRequests.Add(req);
        const string r="Colombo Depot selected. Dist:12.4km ETA:30min. 20 cases Water Bottles.";
        var dp=DP(req.Id,wh.Id,v.Id,reason:r); db.Dispatches.Add(dp); await db.SaveChangesAsync();
        Assert.Equal(r,(await db.Dispatches.FindAsync(dp.Id))!.AgentReasoning);
    }

    [Fact] public async Task DP04_AllocatedItems_PersistWithDetails()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh); var v=VH(wh.Id); db.Vehicles.Add(v);
        var inv=INV(wh.Id,qty:500); db.Inventory.Add(inv);
        var req=REQ(); db.ResourceRequests.Add(req);
        var dp=DP(req.Id,wh.Id,v.Id);
        dp.ItemsAllocated=new List<AllocatedItem>{
            new(){InventoryId=inv.Id,ItemName="Water Bottles",Quantity=50},
            new(){InventoryId=Guid.NewGuid(),ItemName="Ration Packs",Quantity=30}};
        db.Dispatches.Add(dp); await db.SaveChangesAsync();
        var s=await db.Dispatches.FindAsync(dp.Id);
        Assert.Equal(2,s!.ItemsAllocated.Count);
        Assert.Equal(50,s.ItemsAllocated.First(i=>i.ItemName=="Water Bottles").Quantity);
        Assert.Equal(30,s.ItemsAllocated.First(i=>i.ItemName=="Ration Packs").Quantity);
    }

    // =====================================================================
    // 7. Delivery tests  (RES-DL-01 to RES-DL-03)
    // =====================================================================

    private async Task<Dispatch> SeedApprovedDP(ResourceDbContext db)
    {
        var wh=WH(); db.Warehouses.Add(wh); var v=VH(wh.Id); db.Vehicles.Add(v);
        var req=REQ(); db.ResourceRequests.Add(req);
        var dp=DP(req.Id,wh.Id,v.Id,DispatchApprovalStatus.Approved); db.Dispatches.Add(dp);
        await db.SaveChangesAsync(); return dp;
    }

    [Fact] public async Task DL01_Create_DefaultIsInTransit()
    {
        using var db=GetDb();
        var dp=await SeedApprovedDP(db);
        var dl=new Delivery{Id=Guid.NewGuid(),DispatchId=dp.Id,DepartedAt=DateTime.UtcNow};
        db.Deliveries.Add(dl); await db.SaveChangesAsync();
        var s=await db.Deliveries.FindAsync(dl.Id);
        Assert.Equal(DeliveryStatus.InTransit,s!.Status); Assert.Null(s.DeliveredAt);
    }

    [Fact] public async Task DL02_MarkDelivered_SetsStatusAndTimestamp()
    {
        using var db=GetDb();
        var dp=await SeedApprovedDP(db);
        var dl=new Delivery{Id=Guid.NewGuid(),DispatchId=dp.Id,DepartedAt=DateTime.UtcNow.AddMinutes(-60)};
        db.Deliveries.Add(dl); await db.SaveChangesAsync();
        dl.Status=DeliveryStatus.Delivered; dl.DeliveredAt=DateTime.UtcNow; await db.SaveChangesAsync();
        var s=await db.Deliveries.FindAsync(dl.Id);
        Assert.Equal(DeliveryStatus.Delivered,s!.Status); Assert.NotNull(s.DeliveredAt);
    }

    [Fact] public async Task DL03_ConfirmationCode_PersistsQrCode()
    {
        using var db=GetDb();
        var dp=await SeedApprovedDP(db);
        var dl=new Delivery{Id=Guid.NewGuid(),DispatchId=dp.Id,Status=DeliveryStatus.Delivered,
            DepartedAt=DateTime.UtcNow.AddMinutes(-30),DeliveredAt=DateTime.UtcNow,ConfirmationCode="QR-AEGIS-2026-XK9F"};
        db.Deliveries.Add(dl); await db.SaveChangesAsync();
        Assert.Equal("QR-AEGIS-2026-XK9F",(await db.Deliveries.FindAsync(dl.Id))!.ConfirmationCode);
    }

    // =====================================================================
    // 8. Enum Theory tests  (RES-EN-01 to RES-EN-12)
    // =====================================================================

    [Theory][InlineData(ItemType.Food)][InlineData(ItemType.Medical)][InlineData(ItemType.Shelter)]
    public async Task EN_ItemType_AllValues_Persist(ItemType t)
    {
        using var db=GetDb(); var wh=WH(); db.Warehouses.Add(wh);
        var inv=INV(wh.Id,"X",t); db.Inventory.Add(inv); await db.SaveChangesAsync();
        Assert.Equal(t,(await db.Inventory.FindAsync(inv.Id))!.ItemType);
    }

    [Theory][InlineData(VehicleStatus.Available)][InlineData(VehicleStatus.Dispatched)][InlineData(VehicleStatus.Maintenance)]
    public async Task EN_VehicleStatus_AllValues_Persist(VehicleStatus s)
    {
        using var db=GetDb(); var wh=WH(); db.Warehouses.Add(wh);
        var v=VH(wh.Id,s:s); db.Vehicles.Add(v); await db.SaveChangesAsync();
        Assert.Equal(s,(await db.Vehicles.FindAsync(v.Id))!.Status);
    }

    [Theory][InlineData(VehicleType.Truck)][InlineData(VehicleType.Boat)][InlineData(VehicleType.Ambulance)][InlineData(VehicleType.FourByFour)]
    public async Task EN_VehicleType_AllValues_Persist(VehicleType t)
    {
        using var db=GetDb(); var wh=WH(); db.Warehouses.Add(wh);
        var v=VH(wh.Id,t); db.Vehicles.Add(v); await db.SaveChangesAsync();
        Assert.Equal(t,(await db.Vehicles.FindAsync(v.Id))!.VehicleType);
    }

    [Theory][InlineData(DispatchApprovalStatus.PendingApproval)][InlineData(DispatchApprovalStatus.Approved)]
    public async Task EN_DispatchStatus_AllValues_Persist(DispatchApprovalStatus st)
    {
        using var db=GetDb(); var wh=WH(); db.Warehouses.Add(wh); var v=VH(wh.Id); db.Vehicles.Add(v);
        var req=REQ(); db.ResourceRequests.Add(req);
        var dp=DP(req.Id,wh.Id,v.Id,st); db.Dispatches.Add(dp); await db.SaveChangesAsync();
        Assert.Equal(st,(await db.Dispatches.FindAsync(dp.Id))!.ApprovalStatus);
    }

    // =====================================================================
    // 9. Integration tests  (RES-IT-01 to RES-IT-03)
    // =====================================================================

    [Fact] public async Task IT01_WarehouseWithInventoryAndVehicles_AllLinked()
    {
        using var db=GetDb();
        var wh=WH("Full Depot","Colombo"); db.Warehouses.Add(wh);
        db.Inventory.AddRange(INV(wh.Id,"WB",ItemType.Food,500),INV(wh.Id,"MK",ItemType.Medical,200));
        db.Vehicles.AddRange(VH(wh.Id,VehicleType.Truck),VH(wh.Id,VehicleType.Boat));
        await db.SaveChangesAsync();
        Assert.Equal(2,await db.Inventory.CountAsync(i=>i.WarehouseId==wh.Id));
        Assert.Equal(2,await db.Vehicles.CountAsync(v=>v.WarehouseId==wh.Id));
    }

    [Fact] public async Task IT02_StockDecrement_OnApproval_Audited()
    {
        using var db=GetDb();
        var wh=WH(); db.Warehouses.Add(wh);
        var inv=INV(wh.Id,qty:200); db.Inventory.Add(inv); await db.SaveChangesAsync();
        var before=inv.QuantityAvailable;
        inv.QuantityAvailable-=50; inv.UpdatedAt=DateTime.UtcNow; await db.SaveChangesAsync();
        var s=await db.Inventory.FindAsync(inv.Id);
        Assert.Equal(before-50,s!.QuantityAvailable); Assert.Equal(150,s.QuantityAvailable);
    }

    [Fact] public async Task IT03_Coordinates_PersistWithHighPrecision()
    {
        using var db=GetDb();
        var wh=new Warehouse{Id=Guid.NewGuid(),Name="Galle Fort Depot",District="Galle",Latitude=6.02750m,Longitude=80.21700m,ContactPhone="+94912234567"};
        db.Warehouses.Add(wh); await db.SaveChangesAsync();
        var s=await db.Warehouses.FindAsync(wh.Id);
        Assert.Equal(6.02750m,s!.Latitude); Assert.Equal(80.21700m,s.Longitude);
    }
}
