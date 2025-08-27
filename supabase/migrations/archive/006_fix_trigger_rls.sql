-- Fix RLS policy to allow trigger to create profiles
-- Add an INSERT policy that allows profile creation during signup

-- First, add a policy to allow inserting profiles (for the trigger)
CREATE POLICY "Allow profile creation during signup" ON profiles FOR INSERT
WITH CHECK (true);

-- Also add a policy to allow the system/trigger to insert profiles
CREATE POLICY "System can create profiles" ON profiles FOR INSERT
TO authenticated, anon
WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

-- Update the trigger function to run with elevated privileges
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER -- This is important - runs with function owner's privileges
SET search_path = public
AS $$
BEGIN
  -- Log the trigger execution
  RAISE LOG 'handle_new_user triggered for user: %', NEW.id;
  
  -- Insert the profile with elevated privileges
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  
  RAISE LOG 'Profile created successfully for: %', NEW.email;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user for %: % %', NEW.email, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();