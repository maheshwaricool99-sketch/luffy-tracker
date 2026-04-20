import { toRuntimeErrorResponse } from "./runtime-errors";

export async function withRuntimeGuard<T>(handler: () => Promise<T>): Promise<Response> {
  try {
    const result = await handler();
    return Response.json(result);
  } catch (error) {
    const runtimeError = toRuntimeErrorResponse(error);
    if (runtimeError) {
      return Response.json(runtimeError.body, { status: runtimeError.status });
    }
    throw error;
  }
}
