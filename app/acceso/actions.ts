"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { signIn, signOut } from "@/auth";
import { publicRateLimited } from "@/lib/public-rate-limit";

export async function login(formData: FormData) {
  if (await publicRateLimited("login", await headers())) redirect("/acceso?error=limite");
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) redirect("/acceso?error=1");
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/acceso" });
}


