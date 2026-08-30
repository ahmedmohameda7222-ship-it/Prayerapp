import fs from "node:fs";

const path = "lib/use-qibla-controller.ts";
let source = fs.readFileSync(path, "utf8");

const oldBlock = `  const blockCompass = useCallback((reason: LiveCompassBlockReason) => {\n    if (!mountedRef.current) return;\n    setHeadingSource(null);\n    setHeadingAccuracyDegrees(null);\n    dispatch({ type: "COMPASS_BLOCKED", reason });\n  }, []);`;
const newBlock = `  const blockCompass = useCallback((reason: LiveCompassBlockReason) => {\n    if (!mountedRef.current) return;\n    clearSensorTimeout();\n    setHeadingSource(null);\n    setHeadingAccuracyDegrees(null);\n    dispatch({ type: "COMPASS_BLOCKED", reason });\n  }, [clearSensorTimeout]);`;

if (!source.includes(oldBlock)) throw new Error("Expected blockCompass source not found");
source = source.replace(oldBlock, newBlock);

const oldHandlerStart = `    const handleOrientation = (rawEvent: Event) => {\n      if (!mountedRef.current || document.visibilityState === "hidden") return;\n      clearSensorTimeout();\n      if (!isPortraitViewport()) {`;
const newHandlerStart = `    const handleOrientation = (rawEvent: Event) => {\n      if (!mountedRef.current || document.visibilityState === "hidden") return;\n      if (!isPortraitViewport()) {`;

if (!source.includes(oldHandlerStart)) throw new Error("Expected handleOrientation source not found");
source = source.replace(oldHandlerStart, newHandlerStart);

const oldCalibration = `    const handleCalibration = () => {\n      clearSensorTimeout();\n      blockCompass("calibration-required");\n    };`;
const newCalibration = `    const handleCalibration = () => {\n      blockCompass("calibration-required");\n    };`;

if (!source.includes(oldCalibration)) throw new Error("Expected calibration handler source not found");
source = source.replace(oldCalibration, newCalibration);

fs.writeFileSync(path, source);
