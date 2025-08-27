import { spawn, ChildProcess } from 'child_process'

let server: ChildProcess | null = null
const SERVER_PORT = 3002
const STARTUP_TIMEOUT = 30000

async function waitForServer(port: number, timeout: number): Promise<boolean> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`)
      if (response.ok) {
        return true
      }
    } catch (_error) {
      // Server not ready yet, continue waiting
    }
    
    // Wait 500ms before next attempt
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return false
}

export async function setup() {
  console.log('🚀 Starting Next.js development server for E2E tests...')
  
  // Start Next.js development server on port 3002
  server = spawn('npm', ['run', 'dev'], {
    env: {
      ...process.env,
      PORT: SERVER_PORT.toString(),
    },
    stdio: 'pipe', // Capture output but don't show it
  })

  if (!server.pid) {
    throw new Error('Failed to start development server')
  }

  // Wait for server to be ready
  const isReady = await waitForServer(SERVER_PORT, STARTUP_TIMEOUT)
  
  if (!isReady) {
    server.kill()
    throw new Error(`Server did not start within ${STARTUP_TIMEOUT}ms`)
  }
  
  console.log(`✅ Development server ready at http://localhost:${SERVER_PORT}`)
  
  return async () => {
    console.log('🛑 Stopping development server...')
    if (server) {
      server.kill()
      server = null
    }
  }
}