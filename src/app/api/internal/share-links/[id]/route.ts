import { NextResponse } from "next/server";
import { getOperator } from "@/server/auth/authorize";
import { revokeShareLink } from "@/server/share/service";
import { ShareStoreUnavailableError } from "@/server/share/store";

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

  let revoked: boolean;
  try {
    revoked = await revokeShareLink(id);
  } catch (error) {
    if (error instanceof ShareStoreUnavailableError) {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }
    throw error;
  }
  if (!revoked) {
    return NextResponse.json({ error: "Link not found or already revoked." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
