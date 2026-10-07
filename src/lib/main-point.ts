// QR Code único: the registry's main point is the oldest active one (or the oldest, if none is
// active). Other legacy points keep answering for old posters but are no longer listed.
export function pickMainPoint<T extends { status: string; createdAt: string }>(points: T[]) {
  const byAge = [...points].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return byAge.find((point) => point.status === "Ativo") ?? byAge[0];
}
