import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { GermanFridayKhutbahSlide } from "./GermanFridayKhutbahSlide";

/** Friday services never enter the weekday blackout. They show German-only published sermon copy. */
export function JumuahNow({ vm }: { vm: DisplayRuntimeViewModel }) {
  return <GermanFridayKhutbahSlide vm={vm} />;
}
