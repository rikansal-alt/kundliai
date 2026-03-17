import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
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
