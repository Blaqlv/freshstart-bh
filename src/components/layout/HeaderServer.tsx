import { getNavigation } from "@/lib/nav";
import { Header } from "./Header";

export async function HeaderServer() {
  const { topNav } = await getNavigation();
  return <Header nav={topNav} />;
}
