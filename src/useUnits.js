import { useSyncExternalStore } from "react";
import { getUnits, subscribeUnits } from "./units";

// Components call this so they redraw when the switch changes.
export const useUnits = () => useSyncExternalStore(subscribeUnits, getUnits, () => "imperial");
