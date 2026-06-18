using System;

namespace SGPF.Domain.Entities;

public static class UnitConverter
{
    public static decimal GetConversionFactor(string fromUnit, string toUnit)
    {
        if (string.IsNullOrWhiteSpace(fromUnit) || string.IsNullOrWhiteSpace(toUnit))
            return 1;

        var from = fromUnit.Trim().ToLowerInvariant();
        var to = toUnit.Trim().ToLowerInvariant();

        if (from == to)
            return 1;

        // Conversões de Massa (Kg <-> g)
        if (from == "kg" && to == "g") return 1000m;
        if (from == "g" && to == "kg") return 0.001m;

        // Conversões de Volume (L <-> ml)
        if (from == "l" && to == "ml") return 1000m;
        if (from == "ml" && to == "l") return 0.001m;

        return 1; // Unidades incompatíveis ou sem conversão
    }

    public static decimal Convert(decimal quantity, string fromUnit, string toUnit)
    {
        return quantity * GetConversionFactor(fromUnit, toUnit);
    }
}
