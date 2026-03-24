/** @type {import('next').NextConfig} */
module.exports = {
	outputFileTracingRoot: __dirname,
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "github.githubassets.com" },
			{ protocol: "https", hostname: "nextjs.org" },
			{ protocol: "https", hostname: "www.notion.so" },
			{ protocol: "https", hostname: "react.dev" },
			{ protocol: "https", hostname: "www.typescriptlang.org" },
			{ protocol: "https", hostname: "tailwindcss.com" },
		],
	},

}
