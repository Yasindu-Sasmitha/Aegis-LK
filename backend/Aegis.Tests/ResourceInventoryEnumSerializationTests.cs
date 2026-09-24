using System.Text.Json;
using System.Text.Json.Serialization;
using Aegis.Resource.Entities;
using Xunit;

namespace Aegis.Tests;

public class ResourceInventoryEnumSerializationTests
{
    [Fact]
    public void JsonStringEnumConverter_AllowsStringEnumValues()
    {
        var options = new JsonSerializerOptions
        {
            Converters = { new JsonStringEnumConverter() }
        };

        var json = "\"Food\"";
        var parsed = JsonSerializer.Deserialize<ItemType>(json, options);

        Assert.Equal(ItemType.Food, parsed);

        var roundTrip = JsonSerializer.Serialize(ItemType.Food, options);
        Assert.Equal("\"Food\"", roundTrip);
    }
}
