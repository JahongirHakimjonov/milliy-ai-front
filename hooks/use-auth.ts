"use client"

import {createContext, useEffect, useState} from "react"
import {BASE_URL} from "@/lib/utils"

interface User {
    id: number
    email: string
    username: string
    first_name: string
    last_name: string
    avatar?: string
}

interface AuthContextType {
    user: User | null
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    register: (data: RegisterData) => Promise<void>
    logout: () => void
}

interface RegisterData {
    first_name: string
    last_name: string
    email: string
    password: string
    confirm_password: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check for existing token on mount
        const token = localStorage.getItem("access_token")
        if (token) {
            // Verify token and get user data
            fetchUserData(token)
        } else {
            setIsLoading(false)
        }
    }, [])

    const fetchUserData = async (token: string) => {
        try {
            const response = await fetch(`${BASE_URL}/api/v1/users/user/me/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (response.ok) {
                const userData = await response.json()
                setUser(userData.data)
            } else {
                localStorage.removeItem("access_token")
                localStorage.removeItem("refresh_token")
            }
        } catch (error) {
            console.error("Failed to fetch user data:", error)
            localStorage.removeItem("access_token")
            localStorage.removeItem("refresh_token")
        } finally {
            setIsLoading(false)
        }
    }

    const login = async (email: string, password: string) => {
        const response = await fetch(`${BASE_URL}/api/v1/users/auth/token/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({email, password}),
        })

        if (!response.ok) {
            throw new Error("Login failed")
        }

        const data = await response.json()
        localStorage.setItem("access_token", data.data.access)
        localStorage.setItem("refresh_token", data.data.refresh)
        setUser(data.data.user)
        window.location.reload()
    }

    const register = async (registerData: RegisterData) => {
        const response = await fetch(`${BASE_URL}/api/v1/users/auth/register/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(registerData),
        })

        if (!response.ok) {
            throw new Error("Registration failed")
        }

        await login(registerData.email, registerData.password)
    }

    const logout = () => {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        setUser(null)
        window.location.reload()
    }

    return {
        user,
        isLoading,
        login,
        register,
        logout,
    }
}
