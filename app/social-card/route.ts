// Keep older shared links working while the versioned image refreshes previews.
export function GET() {
  return Response.redirect('https://naqada-directory.vercel.app/images/social/naqada-share-v2.jpg', 308);
}
