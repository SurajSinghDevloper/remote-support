import React, { useState } from "react"
import { useNavigate } from "react-router-dom"

function Home() {
    const [roomCode, setRoomCode] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const navigate = useNavigate()

    const handleJoinRoom = (e) => {
        e.preventDefault()
        if (roomCode.trim()) {
            navigate(`/room/${roomCode.trim()}`)
        }
    }

    const handleCreateRoom = () => {
        // Generate a random 6-character room code
        const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
        setRoomCode(randomCode)
        setIsCreating(true)
    }

    const handleHostRoom = () => {
        navigate(`/room/host`)
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                <h1 className="text-2xl font-bold text-center mb-6">Remote Desktop Support</h1>

                {isCreating ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-md">
                            <p className="text-center font-medium">Your room code is:</p>
                            <p className="text-3xl text-center font-bold text-blue-600">{roomCode}</p>
                            <p className="text-sm text-center text-gray-500 mt-2">Share this code with the person you want to connect with</p>
                        </div>

                        <div className="flex flex-col space-y-3">
                            <button
                                onClick={handleHostRoom}
                                className="w-full py-2 px-4 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                Host This Room
                            </button>

                            <button
                                onClick={() => setIsCreating(false)}
                                className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <form onSubmit={handleJoinRoom} className="space-y-4">
                            <div>
                                <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-1">
                                    Room Code
                                </label>
                                <input
                                    type="text"
                                    id="roomCode"
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value)}
                                    placeholder="Enter room code"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Join Room
                            </button>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">or</span>
                            </div>
                        </div>

                        <button
                            onClick={handleCreateRoom}
                            className="w-full py-2 px-4 bg-gray-800 text-white rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800"
                        >
                            Create New Room
                        </button>
                    </div>
                )}
            </div>

            <p className="mt-8 text-sm text-gray-500">
                Secure remote desktop support. All connections are end-to-end encrypted.
            </p>
        </div>
    )
}

export default Home