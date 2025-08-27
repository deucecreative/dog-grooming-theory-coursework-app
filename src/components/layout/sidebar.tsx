"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import { useSupabase } from "@/hooks/use-supabase";
import { 
  Home, 
  FileText, 
  ClipboardCheck, 
  BarChart3, 
  Users, 
  Settings,
  BookOpen,
  Mail,
  GraduationCap,
  Download
} from "lucide-react";

type NavigationItem = {
  name: string;
  href: Route;
  icon: typeof Home;
};

const studentNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Assignments", href: "/dashboard/assignments", icon: FileText },
  { name: "My Progress", href: "/dashboard/progress", icon: BarChart3 },
];

const courseLeaderNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "My Courses", href: "/dashboard/courses", icon: GraduationCap },
  { name: "Manage Students", href: "/dashboard/students", icon: Users },
  { name: "Review Submissions", href: "/dashboard/review", icon: ClipboardCheck },
  { name: "Export Data", href: "/dashboard/export", icon: Download },
];

const adminNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "User Management", href: "/admin/users", icon: Users },
  { name: "Invitations", href: "/admin/invitations", icon: Mail },
  { name: "Question Bank", href: "/admin/questions", icon: BookOpen },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, loading } = useSupabase();
  
  // Show loading state if profile is still loading
  if (loading) {
    return (
      <div className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)]">
        <div className="p-4">
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const userRole: UserRole = (profile?.role as UserRole) || 'student';
  
  let navigation = studentNavigation;
  switch (userRole) {
    case "course_leader":
      navigation = courseLeaderNavigation;
      break;
    case "admin":
      navigation = adminNavigation;
      break;
    default:
      navigation = studentNavigation;
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)]">
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <item.icon size={16} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}