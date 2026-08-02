/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Turbopack (Next.js 16 varsayılanı) ile FullCalendar uyumlu
  turbopack: {},
  allowedDevOrigins: ['192.168.2.150'],
  transpilePackages: [
    '@fullcalendar/react',
    '@fullcalendar/core',
    '@fullcalendar/resource-timeline',
    '@fullcalendar/interaction'
  ]
}

module.exports = nextConfig
