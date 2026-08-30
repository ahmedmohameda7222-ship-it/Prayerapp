import fs from "node:fs";

const path = "lib/use-qibla-controller.ts";
let source = fs.readFileSync(path, "utf8");

const oldRefs = `  const sensorTimeoutRef = useRef<number | null>(null);`;
const newRefs = `  const sensorTimeoutRef = useRef<number | null>(null);\n  const hasTrustedHeadingRef = useRef(false);`;
if (!source.includes(oldRefs)) throw new Error("Expected sensor ref block not found");
source = source.replace(oldRefs, newRefs);

const oldDetach = `    smoothedHeadingRef.current = null;\n    lastHeadingAtRef.current = null;\n    lastSemanticAtRef.current = 0;`;
const newDetach = `    smoothedHeadingRef.current = null;\n    lastHeadingAtRef.current = null;\n    lastSemanticAtRef.current = 0;\n    hasTrustedHeadingRef.current = false;`;
if (!source.includes(oldDetach)) throw new Error("Expected detach reset block not found");
source = source.replace(oldDetach, newDetach);

const oldPublish = `    lastSemanticAtRef.current = now || Number.EPSILON;\n    clearSensorTimeout();`;
const newPublish = `    lastSemanticAtRef.current = now || Number.EPSILON;\n    hasTrustedHeadingRef.current = true;\n    clearSensorTimeout();`;
if (!source.includes(oldPublish)) throw new Error("Expected trusted publish block not found");
source = source.replace(oldPublish, newPublish);

const oldRelative = `      if (Number.isFinite(event.alpha)) blockCompass("relative-heading");`;
const newRelative = `      if (Number.isFinite(event.alpha)) {\n        if (hasTrustedHeadingRef.current) return;\n        blockCompass("relative-heading");\n      }`;
if (!source.includes(oldRelative)) throw new Error("Expected relative-heading block not found");
source = source.replace(oldRelative, newRelative);

fs.writeFileSync(path, source);
