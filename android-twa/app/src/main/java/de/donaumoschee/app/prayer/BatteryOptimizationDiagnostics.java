package de.donaumoschee.app.prayer;

public record BatteryOptimizationDiagnostics(boolean relevant, boolean exempt) {
    private static final int API_DOZE = 23;

    public static BatteryOptimizationDiagnostics evaluate(int sdk, boolean ignoringBatteryOptimizations) {
        boolean relevant = sdk >= API_DOZE;
        return new BatteryOptimizationDiagnostics(relevant, !relevant || ignoringBatteryOptimizations);
    }
}
