'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import API_URL from '@/config'

export default function LoginPage() {
  const [isAdminLogin, setIsAdminLogin] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true) // Start loading

    const encodedCredentials = btoa(`${username}:${password}`)
    try {
      const response = await fetch(`${API_URL}/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${encodedCredentials}`,
        },
        body: JSON.stringify({ username, password, loginAsAdmin: isAdminLogin }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('auth_tokens', data.token)
        localStorage.setItem('user_role', data.role)
        const getrole = localStorage.getItem("user_role")

        if (data.role === 'admin') {
          if (isAdminLogin && getrole === "admin") {
            router.push('/admin')
          } else {
            router.push('/user')
          }
        } else {
          router.push('/user')
        }
      } else {
        alert(data.non_field_errors || 'Invalid credentials')
      }
    } catch (error) {
      console.error('Error logging in:', error)
      alert('An error occurred. Please try again later.')
    } finally {
      setLoading(false) // Stop loading
    }
  }

  if (!isClient) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>{isAdminLogin ? 'Admin Login' : 'User Login'}</CardTitle>
          <CardDescription>Enter your credentials to access the GST Search Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="id" className="text-sm font-medium">User ID</label>
              <Input
                id="id"
                type="text"
                placeholder="Enter your ID"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsAdminLogin(!isAdminLogin)}
            disabled={loading}
          >
            {isAdminLogin ? 'Switch to User Login' : 'Login as Admin'}
          </Button>
        </CardFooter>
      </Card>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <img
            src="/gif/loading.gif"
            alt="Loading..."
            className="w-26 h-26"
          />
        </div>
      )}
    </div>
  )
}
