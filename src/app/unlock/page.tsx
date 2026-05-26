import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Unlock",
  robots: {
    index: false,
    follow: false,
  },
};

export default function UnlockPage() {
  redirect("/");
}
