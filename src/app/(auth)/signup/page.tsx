import { SignUpForm } from "@/components/forms/signup-form";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upper Hound Academy</h1>
          <p className="text-gray-600 mt-2">Create Your Account</p>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}