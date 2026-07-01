import { NextResponse } from "next/server";
import { getNavigation } from "@/lib/nav";

export const revalidate = 60;

export async function GET() {
  const nav = await getNavigation();
  return NextResponse.json(nav);
}
