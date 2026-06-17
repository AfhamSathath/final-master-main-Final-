import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

export const useAuth = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // Call the backend API to log out the user
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {

        router.push("/auth/signin");
      } else {
        throw new Error("Failed to log out");
      }
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  };


  return {
    user: session?.user || null,
    handleSignOut,
  };
};
