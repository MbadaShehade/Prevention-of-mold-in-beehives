import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import Footer from "./components/ServerComponents/Footer/Footer";
import { fetchServerMQTTMonitor } from './_lib/mqtt-helpers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";

export const metadata = {
  title: "HiveGuard - Protect Your Hive With IOT",
  description: "HiveGuard offers an innovative IoT-based monitoring system that prevents mold growth in beehives.",
};

export default function RootLayout({ children }) {
  // Initialize MQTT monitoring service on server
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/beeHiveGuard.png" />
        <style dangerouslySetInnerHTML={{ __html: `
          html {
            scroll-behavior: smooth;
            scroll-padding-top: 70px;
          }
          body {
            scroll-behavior: smooth;
          }
        `}} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Set theme class on <html> as early as possible
                  // Always set theme to light, ignoring previous user selection
                  document.documentElement.classList.add('light');
                  localStorage.setItem('theme', 'light');
                } catch (e) {
                  // fallback: do nothing
                }
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Handle page refresh - only scroll to top if there's no hash
                  if (window.performance && window.performance.navigation.type === window.performance.navigation.TYPE_RELOAD) {
                    if (!window.location.hash) {
                      window.scrollTo(0, 0);
                    }
                  }
                } catch (e) {
                  console.error('Error in theme script:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light">
          <div className="App">
            {children}
            <Footer />
          </div>
        </ThemeProvider>    
      </body>   
    </html>
  );
}
