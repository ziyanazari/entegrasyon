// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Admin Credentials",
      credentials: {
        username: { label: "Kullanıcı Adı", type: "text" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        const adminUser = process.env.ADMIN_USER || "admin";
        const adminPass = process.env.ADMIN_PASS || "admin123";

        if (
          credentials?.username === adminUser &&
          credentials?.password === adminPass
        ) {
          return {
            id: "1",
            name: "Admin",
            email: "admin@ebijuteri.com",
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Korunan rotalar: ana sayfa, v2 dashboard, v2 API'leri, eski sync API
      const isProtected =
        pathname === "/" ||
        pathname.startsWith("/v2") ||
        pathname.startsWith("/api/sync") ||
        pathname.startsWith("/api/v2") ||
        pathname.startsWith("/api/config") ||
        pathname.startsWith("/api/orders") ||
        pathname.startsWith("/api/xml-count");

      if (isProtected) {
        if (isLoggedIn) return true;
        return false; // Login sayfasına yönlendir
      }

      return true;
    },
  },
});
