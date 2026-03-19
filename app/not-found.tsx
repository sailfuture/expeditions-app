import Link from "next/link"

export default function NotFound() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      <div className="text-center">
        <div className="flex items-center justify-center gap-5">
          <h1 className="text-2xl font-semibold">404</h1>
          <div className="h-12 w-px bg-gray-300" />
          <p className="text-sm text-gray-600">This page could not be found.</p>
        </div>
        <Link
          href="/"
          className="mt-8 inline-block text-sm text-blue-600 hover:underline"
        >
          Go back home
        </Link>
      </div>
    </div>
  )
}
