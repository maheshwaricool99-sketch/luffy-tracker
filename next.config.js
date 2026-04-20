/** @type {import('next').NextConfig} */
module.exports = {
  async headers() {
    return [
      {
        // Tell browsers never to serve stale HTML or JS chunks from an old build.
        // Each new build gets new content-hashed filenames, so this is safe.
        source: "/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma",        value: "no-cache" },
          { key: "Expires",       value: "0" },
        ],
      },
    ];
  },

};
