import { validateSignalForPublish } from "./validateSignalForPublish";
import type { SignalRecordRow } from "../serializers/base";

export function validateSignalIntegrity(signal: SignalRecordRow) {
  return validateSignalForPublish(signal);
}
