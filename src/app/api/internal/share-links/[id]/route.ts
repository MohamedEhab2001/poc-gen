import { NextResponse } from "next/server";
import { getOperator } from "@/server/auth/authorize";
import { revokeShareLink } from "@/server/share/service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Operator-only share-link revocation. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const operator = await getOperator();
  if (!operator) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const revoked = await revokeShareLink(id);
  if (!revoked) {
    return NextResponse.json({ error: "Link not found or already revoked." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
