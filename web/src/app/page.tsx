import { redirect } from "next/navigation";

export default function Home() {
  // The proxy sends unauthenticated visitors on to /login.
  redirect("/dashboard");
}
