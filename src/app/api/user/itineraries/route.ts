import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const list = await prisma.itinerary.findMany({ where: { userId: (session.user as { id: string }).id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { pdfBase64, itineraryId, ...rest } = body as { pdfBase64?: string; itineraryId?: string } & Record<string, unknown>;
  let pdfUrl: string | undefined;
  let pdfBlobKey: string | undefined;
  if (pdfBase64 && itineraryId) {
    try {
      const buf = Buffer.from(pdfBase64, "base64");
      const key = `pdfs/${(session.user as { id: string }).id}/${itineraryId}.pdf`;
      const blob = await put(key, buf, { access: "public", contentType: "application/pdf" });
      pdfUrl = blob.url;
      pdfBlobKey = key;
      await prisma.itinerary.update({ where: { id: itineraryId }, data: { pdfUrl, pdfBlobKey } });
    } catch (e) { console.error("Blob put failed", e); }
  }
  return NextResponse.json({ ok: true, pdfUrl });
}
