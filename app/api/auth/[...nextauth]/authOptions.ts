import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/mongodb";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile?.sub) {
        try {
          const mongo = await db();
          await mongo.collection("users").updateOne(
            { googleId: profile.sub },
            {
              $set: {
                name:  profile.name ?? "",
                email: profile.email ?? "",
                image: (profile as { picture?: string }).picture ?? "",
                lastLoginAt: new Date(),
              },
              $setOnInsert: {
                googleId:  profile.sub,
                tier:      "registered",
                createdAt: new Date(),
              },
            },
            { upsert: true },
          );
        } catch (e) {
          console.error("Failed to upsert user on sign-in:", e);
          // Don't block sign-in if DB write fails
        }
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      // On first sign-in, attach Google sub (stable user ID) to the token
      if (account?.provider === "google" && profile?.sub) {
        token.googleId = profile.sub;
        token.tier = "registered"; // default tier; upgrade via DB lookup later
      }
      return token;
    },
    async session({ session, token }) {
      // Expose googleId and tier to the client session
      if (session.user) {
        (session.user as { googleId?: string }).googleId = token.googleId as string;
        (session.user as { tier?: string }).tier = (token.tier as string) ?? "registered";
      }
      return session;
    },
  },

  pages: {
    signIn: "/", // redirect to home, not a separate sign-in page
  },
};
