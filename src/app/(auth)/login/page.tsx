import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upper Hound Academy</h1>
          <p className="text-gray-600 mt-2">Dog Grooming Theory Coursework</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}