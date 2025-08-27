-- Check if the trigger function exists and recreate it
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'handle_new_user';

-- Recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the trigger execution
  RAISE LOG 'handle_new_user triggered for user: %', NEW.id;
  RAISE LOG 'User email: %', NEW.email;
  RAISE LOG 'User metadata: %', NEW.raw_user_meta_data;
  
  -- Insert the profile
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
    RETURN NEW; -- Still return NEW to allow auth to continue
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify the trigger exists
SELECT trigger_name, event_object_table, action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';