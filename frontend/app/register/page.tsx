// /register redirects to /signup
import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect("/signup");
}
