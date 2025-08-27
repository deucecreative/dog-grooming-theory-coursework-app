'use client'

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const { user, profile, signOut } = useSupabase();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      router.push('/');
    } catch {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'course_leader':
        return 'Course Leader';
      case 'admin':
        return 'Administrator';
      default:
        return 'Student';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Upper Hound Academy
          </h1>
          <p className="text-sm text-gray-600">Coursework Management</p>
        </div>

        <div className="flex items-center space-x-4">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <User size={16} />
                  <span>{profile?.full_name || user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{getRoleDisplayName(profile?.role || 'student')}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings size={16} className="mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut size={16} className="mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {!user && (
            <Button onClick={() => router.push('/login')}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}