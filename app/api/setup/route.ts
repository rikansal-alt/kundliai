import { setupIndexes } from "@/lib/setupIndexes";

export async function GET() {
  await setupIndexes();
  return Response.json({ ok: true });
}
