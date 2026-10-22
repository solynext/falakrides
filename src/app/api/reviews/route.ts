// Retired endpoint: old pages must not continue accepting visitor reviews.
export async function POST() {
  return Response.json({error: "Reviews are no longer available."}, {
    status: 410,
    headers: {"Cache-Control": "no-store"},
  });
}
