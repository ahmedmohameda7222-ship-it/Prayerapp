import fs from "node:fs";

const path = "lib/use-qibla-controller.ts";
let source = fs.readFileSync(path, "utf8");

const oldBlock = `    const pause = () => {\n      if (document.visibilityState === "hidden") detachSensors();\n    };\n    const resume = () => {`;
const newBlock = `    const pause = () => {\n      if (document.visibilityState === "hidden") detachSensors();\n    };\n    const handlePageHide = () => {\n      detachSensors();\n    };\n    const resume = () => {`;
if (!source.includes(oldBlock)) throw new Error("Expected lifecycle pause block not found");
source = source.replace(oldBlock, newBlock);

const oldListeners = `    document.addEventListener("visibilitychange", handleVisibility);\n    window.addEventListener("pagehide", pause);\n    window.addEventListener("pageshow", resume);`;
const newListeners = `    document.addEventListener("visibilitychange", handleVisibility);\n    window.addEventListener("pagehide", handlePageHide);\n    window.addEventListener("pageshow", resume);`;
if (!source.includes(oldListeners)) throw new Error("Expected lifecycle listeners not found");
source = source.replace(oldListeners, newListeners);

const oldCleanup = `      document.removeEventListener("visibilitychange", handleVisibility);\n      window.removeEventListener("pagehide", pause);\n      window.removeEventListener("pageshow", resume);`;
const newCleanup = `      document.removeEventListener("visibilitychange", handleVisibility);\n      window.removeEventListener("pagehide", handlePageHide);\n      window.removeEventListener("pageshow", resume);`;
if (!source.includes(oldCleanup)) throw new Error("Expected lifecycle cleanup not found");
source = source.replace(oldCleanup, newCleanup);

fs.writeFileSync(path, source);
