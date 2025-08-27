'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSupabase } from "@/hooks/use-supabase";

export default function HomePage() {
  const { user, loading } = useSupabase();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Show loading state
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  // Don't render content if user is authenticated (redirect in progress)
  if (user) {
    return null;
  }
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Dog Grooming Theory Coursework App
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Digital coursework platform for Upper Hound Dog Grooming Academy
        </p>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Features Coming Soon</CardTitle>
            <CardDescription>
              Streamlined coursework management with AI-powered assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-left">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-blue-600">For Students</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div>• Digital coursework completion</div>
                  <div>• Instant AI feedback</div>
                  <div>• Progress tracking</div>
                  <div>• Auto-save drafts</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-green-600">For Course Leaders</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div>• AI-assisted marking</div>
                  <div>• Review dashboard</div>
                  <div>• Manual override options</div>
                  <div>• Student reports</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-purple-600">For Admins</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div>• User management</div>
                  <div>• Question bank</div>
                  <div>• Analytics dashboard</div>
                  <div>• System configuration</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center mb-8">
          <Button size="lg" onClick={() => router.push('/login')}>Sign In</Button>
          <Button variant="outline" size="lg" onClick={() => router.push('/signup')}>Create Account</Button>
        </div>
        
        <div className="text-sm text-gray-500">
          Built with Next.js 15, Supabase, and OpenAI
        </div>
      </div>
    </main>
  );
}