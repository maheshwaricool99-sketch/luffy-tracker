import { redirect } from "next/navigation";

export default function IndiaSignalsPage() {
  redirect("/signals?market=india");
}
