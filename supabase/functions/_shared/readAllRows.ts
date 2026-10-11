type Result<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Required reads fail closed. Callers must apply a stable, unique ordering.
 * Advance by received rows, so a server row cap smaller than the requested
 * page does not silently truncate eligibility exclusions. */
export async function readAllRows<T>(build: (from: number, to: number) => Result<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < 2000; page++) {
    const { data, error } = await build(rows.length, rows.length + 999);
    if (error) throw new Error(`Required read failed: ${error.message}`);
    if (!data) throw new Error("Required read returned no result");
    if (!data.length) return rows;
    rows.push(...data);
  }
  throw new Error("Required read exceeded pagination safety limit");
}
