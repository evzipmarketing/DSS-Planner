export function assertNever(value: never, label = "variant"): never {
  throw new Error(`Unhandled ${label}: ${JSON.stringify(value)}`);
}
