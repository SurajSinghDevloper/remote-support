"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import socket from "../socket"

function Client() {
    const { code } = useParams()
    const canvasRef = useRef(null)
    const [connectionStatus, setConnectionStatus] = useState("Connecting...")
    const [lastUpdate, setLastUpdate] = useState(null)
    const [error, setError] = useState(null)
    const [frameCount, setFrameCount] = useState(0)
    const [hostConnected, setHostConnected] = useState(false)
    const [connectionQuality, setConnectionQuality] = useState("Unknown")

    // Create image with crossOrigin set to anonymous to avoid CORS issues
    const imgRef = useRef(null)

    // Track frame timing for connection quality
    const lastFrameTime = useRef(Date.now())
    const frameTimings = useRef([])

    useEffect(() => {
        // Create a new image with crossOrigin set
        imgRef.current = new Image()
        imgRef.current.crossOrigin = "anonymous"

        // Initialize canvas
        const canvas = canvasRef.current
        if (canvas) {
            canvas.width = 1280
            canvas.height = 720
            const ctx = canvas.getContext("2d")
            ctx.fillStyle = "#f0f0f0"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.font = "24px Arial"
            ctx.fillStyle = "#666"
            ctx.textAlign = "center"
            ctx.fillText("Waiting for host screen...", canvas.width / 2, canvas.height / 2)
        }

        // Join room when component mounts
        socket.emit("join-room", code)
        console.log(`Client joined room: ${code}`)

        // Listen for room join confirmation
        socket.on("room-joined", (data) => {
            setConnectionStatus(`Connected to room: ${data.room}`)
            console.log("Room joined:", data)
        })

        // Listen for host connection
        socket.on("host-connected", (data) => {
            console.log("Host connected:", data)
            setConnectionStatus(`Host connected to room: ${data.room}`)
            setHostConnected(true)
        })

        // Listen for host disconnection
        socket.on("host-disconnected", (data) => {
            console.log("Host disconnected:", data)
            setConnectionStatus(`Host disconnected from room: ${data.room}`)
            setHostConnected(false)

            // Show disconnection message on canvas
            const canvas = canvasRef.current
            if (canvas) {
                const ctx = canvas.getContext("2d")
                ctx.fillStyle = "#f0f0f0"
                ctx.fillRect(0, 0, canvas.width, canvas.height)
                ctx.font = "24px Arial"
                ctx.fillStyle = "#666"
                ctx.textAlign = "center"
                ctx.fillText("Host disconnected. Waiting for reconnection...", canvas.width / 2, canvas.height / 2)
            }
        })

        // Listen for room expiration
        socket.on("room-expired", (data) => {
            console.log("Room expired:", data)
            setConnectionStatus("Room expired due to inactivity")
            setHostConnected(false)
        })

        // Event listener for receiving screen data
        const handleScreenData = (data) => {
            if (data.code === code) {
                const now = Date.now()
                const timeSinceLastFrame = now - lastFrameTime.current
                lastFrameTime.current = now

                // Track frame timing for quality calculation
                frameTimings.current.push(timeSinceLastFrame)
                if (frameTimings.current.length > 10) {
                    frameTimings.current.shift() // Keep only last 10 frames

                    // Calculate average frame time
                    const avgFrameTime = frameTimings.current.reduce((a, b) => a + b, 0) / frameTimings.current.length

                    // Determine connection quality
                    if (avgFrameTime < 500) {
                        setConnectionQuality("Excellent")
                    } else if (avgFrameTime < 1000) {
                        setConnectionQuality("Good")
                    } else if (avgFrameTime < 2000) {
                        setConnectionQuality("Fair")
                    } else {
                        setConnectionQuality("Poor")
                    }
                }

                // Acknowledge receipt
                socket.emit("screen-data-received", {
                    frameId: data.frameId,
                    code: code,
                    timestamp: Date.now(),
                })

                setLastUpdate(new Date().toLocaleTimeString())
                setFrameCount((prev) => prev + 1)

                // Set the image source
                imgRef.current.src = data.image

                // Once the image is loaded, draw it to the canvas
                imgRef.current.onload = () => {
                    const canvas = canvasRef.current
                    if (canvas) {
                        const ctx = canvas.getContext("2d")
                        ctx.clearRect(0, 0, canvas.width, canvas.height)
                        ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height)
                    }
                }

                // Handle image loading errors
                imgRef.current.onerror = (err) => {
                    console.error("Error loading image:", err)
                    setError("Failed to load screen data")
                }
            }
        }

        // Listen for 'screen-data' event
        socket.on("screen-data", handleScreenData)

        // Cleanup socket listener on unmount
        return () => {
            socket.off("room-joined")
            socket.off("host-connected")
            socket.off("host-disconnected")
            socket.off("screen-data", handleScreenData)
            socket.off("room-expired")
        }
    }, [code])

    const handleMouseEvent = (e) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }

        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        return {
            x: Math.floor((e.clientX - rect.left) * scaleX),
            y: Math.floor((e.clientY - rect.top) * scaleY),
        }
    }

    const handleMouseMove = (e) => {
        if (!hostConnected) return

        const { x, y } = handleMouseEvent(e)
        socket.emit("mouse-move", { code, x, y })
    }

    const handleMouseClick = (e) => {
        if (!hostConnected) return

        const { x, y } = handleMouseEvent(e)
        socket.emit("mouse-click", { code, x, y })
    }

    const handleKeyPress = (e) => {
        if (!hostConnected) return

        socket.emit("key-press", { code, key: e.key })
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="bg-white p-4 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Connected to: {code}</h2>
                    <div className="text-sm text-gray-600">
                        Status: {connectionStatus}
                        {lastUpdate && <span> | Last update: {lastUpdate}</span>}
                        {frameCount > 0 && <span> | Frames received: {frameCount}</span>}
                        {connectionQuality !== "Unknown" && <span> | Connection: {connectionQuality}</span>}
                    </div>
                </div>

                {error && <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-md">{error}</div>}

                <div className="relative border-2 border-gray-300 rounded-md overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        width="1280"
                        height="720"
                        style={{
                            width: "100%",
                            height: "auto",
                            cursor: hostConnected ? "none" : "default",
                        }}
                        onMouseMove={handleMouseMove}
                        onClick={handleMouseClick}
                        onKeyDown={handleKeyPress}
                        tabIndex="0"
                    />
                </div>

                <div className="mt-4 p-3 bg-gray-100 rounded-md text-sm">
                    <p>
                        Click on the screen to interact with the host computer. Press keys while the screen is focused to send
                        keyboard input.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Client