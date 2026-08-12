export function GET() {
  return Response.json(
    { status: "ok" },
    {
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    },
  );
}
