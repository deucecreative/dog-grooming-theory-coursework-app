export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Upper Hound Dog Grooming Academy
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Coursework Management System
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}