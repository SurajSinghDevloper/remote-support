"use client"

import { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"

function Login() {
    const [code, setCode] = useState("")
    const [pin, setPin] = useState("")
    const [isHost, setIsHost] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const navigate = useNavigate()

    const handleLogin = async () => {
        // Validate inputs
        if (!code || code.length < 6) {
            setError("Please enter a valid host code (at least 6 characters)")
            return
        }

        if (!pin || pin.length < 4) {
            setError("Please enter a valid PIN (at least 4 characters)")
            return
        }

        setLoading(true)
        setError("")

        try {
            const apiUrl = "https://ssbtechnology.co.in/ssb-remote-support/api/auth"

            if (isHost) {
                const res = await axios.post(`${apiUrl}/register`, { code, pin })
                if (res.data.success) {
                    navigate(`/host/${code}`)
                } else {
                    setError(res.data.message || "Registration failed")
                }
            } else {
                const res = await axios.post(`${apiUrl} / connect`, { code, pin })
                if (res.data.success) {
                    navigate(`/client/${code}`)
                } else {
                    setError(res.data.message || "Connection failed")
                }
            }
        } catch (err) {
            console.error("Login error:", err)
            setError("Authentication Failed. Please check your code and PIN.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
                <h2 className="text-2xl font-semibold text-center text-gray-700 mb-6">Remote Support Login</h2>

                {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md">{error}</div>}

                <input
                    type="text"
                    placeholder="Enter Host Code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full p-3 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={10}
                />
                <input
                    type="password"
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full p-3 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center mb-6">
                    <input type="checkbox" id="isHost" checked={isHost} onChange={() => setIsHost(!isHost)} className="mr-2" />
                    <label htmlFor="isHost" className="text-gray-600">
                        I am Host
                    </label>
                </div>
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full p-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                    {loading ? "Connecting..." : "Connect"}
                </button>
            </div>
        </div>
    )
}

export default Login