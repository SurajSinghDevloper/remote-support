"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import socketClient from "../socket"

function Client() {
    const { code } = useParams()
    const canvasRef = useRef(null)
    const [connectionStatus, setConnectionStatus] = useState("Connecting...")
    const [lastUpdate, setLastUpdate] = useState(null)
    const [error, setError] = useState(null)
    const [frameCount, setFrameCount] = useState(0)
    const [hostConnected, setHostConnected] = useState(false)
    const [connectionQuality, setConnectionQuality] = useState("Unknown")
    const cursorRef = useRef(null)
    const canvasFocused = useRef(false)
    const [screenSize, setScreenSize] = useState({ width: 1280, height: 720 })
    const [controlStats, setControlStats] = useState({ mouse: 0, keyboard: 0 })

    // Create image with crossOrigin set to anonymous to avoid CORS issues
    const imgRef = useRef(new Image())

    // Performance metrics
    const perfMetrics = useRef({
        lastFrameTime: Date.now(),
        frameTimings: [],
        framesReceived: 0,
        lastFpsCalc: Date.now(),
    })

    // Track key states to prevent key repeats
    const keyStates = useRef({})

    useEffect(() => {
        // Set cross-origin for the image
        imgRef.current.crossOrigin = "anonymous"

        // Initialize canvas
        const canvas = canvasRef.current
        if (canvas) {
            canvas.width = screenSize.width
            canvas.height = screenSize.height
            const ctx = canvas.getContext("2d")
            ctx.fillStyle = "#f0f0f0"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.font = "24px Arial"
            ctx.fillStyle = "#666"
            ctx.textAlign = "center"
            ctx.fillText("Waiting for host screen...", canvas.width / 2, canvas.height / 2)
        }

        // Create custom cursor element
        if (!cursorRef.current) {
            const cursor = document.createElement("div")
            cursor.style.position = "absolute"
            cursor.style.width = "20px"
            cursor.style.height = "20px"
            cursor.style.backgroundImage =
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23000000' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'%3E%3Cpath d='M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z'/%3E%3C/svg%3E\")"
            cursor.style.backgroundSize = "contain"
            cursor.style.backgroundRepeat = "no-repeat"
            cursor.style.pointerEvents = "none"
            cursor.style.zIndex = "9999"
            cursor.style.transform = "translate(-50%, -50%)"
            cursor.style.display = "none"
            document.body.appendChild(cursor)
            cursorRef.current = cursor
        }

        // Connect to socket server
        socketClient.connect()

        // Join room as client
        socketClient.joinRoom(code, "client")
        console.log(`Client joined room: ${code}`)

        // Listen for room join confirmation
        socketClient.on("room-joined", (data) => {
            setConnectionStatus(`Connected to room: ${data.room}`)
            console.log("Room joined:", data)
        })

        // Listen for host connection
        socketClient.on("host-connected", (data) => {
            console.log("Host connected:", data)
            setConnectionStatus(`Host connected to room: ${data.room}`)
            setHostConnected(true)
        })

        // Listen for host disconnection
        socketClient.on("host-disconnected", (data) => {
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
        socketClient.on("room-expired", (data) => {
            console.log("Room expired:", data)
            setConnectionStatus("Room expired due to inactivity")
            setHostConnected(false)
        })

        // Listen for screen size updates
        socketClient.on("screen-size", (data) => {
            console.log("Screen size update:", data)
            setScreenSize({
                width: data.width || 1280,
                height: data.height || 720,
            })

            // Update canvas size
            const canvas = canvasRef.current
            if (canvas) {
                canvas.width = data.width || 1280
                canvas.height = data.height || 720

                // Redraw waiting message
                const ctx = canvas.getContext("2d")
                ctx.fillStyle = "#f0f0f0"
                ctx.fillRect(0, 0, canvas.width, canvas.height)
                ctx.font = "24px Arial"
                ctx.fillStyle = "#666"
                ctx.textAlign = "center"
                ctx.fillText("Waiting for host screen...", canvas.width / 2, canvas.height / 2)
            }
        })

        // Listen for screen data
        socketClient.on("screen-data", (data) => {
            if (data.code === code) {
                const now = Date.now()
                perfMetrics.current.frameTimings.push(now - perfMetrics.current.lastFrameTime)
                perfMetrics.current.lastFrameTime = now
                perfMetrics.current.framesReceived++

                // Keep only last 10 frame timings
                if (perfMetrics.current.frameTimings.length > 10) {
                    perfMetrics.current.frameTimings.shift()
                }

                // Update connection quality
                if (perfMetrics.current.frameTimings.length >= 3) {
                    const avgFrameTime =
                        perfMetrics.current.frameTimings.reduce((a, b) => a + b, 0) / perfMetrics.current.frameTimings.length

                    let quality = "Unknown"
                    if (avgFrameTime < 50) quality = "Excellent"
                    else if (avgFrameTime < 100) quality = "Very Good"
                    else if (avgFrameTime < 200) quality = "Good"
                    else if (avgFrameTime < 500) quality = "Fair"
                    else quality = "Poor"

                    setConnectionQuality(quality)
                }

                // Acknowledge receipt
                socketClient.emit("screen-data-received", {
                    frameId: data.frameId,
                    code: code,
                    timestamp: Date.now(),
                })

                setLastUpdate(new Date().toLocaleTimeString())
                setFrameCount((prev) => prev + 1)

                // Set the image source
                imgRef.current.src = data.image

                // Draw to canvas once loaded
                imgRef.current.onload = () => {
                    const canvas = canvasRef.current
                    if (canvas) {
                        const ctx = canvas.getContext("2d")
                        ctx.clearRect(0, 0, canvas.width, canvas.height)
                        ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height)
                    }
                }

                imgRef.current.onerror = (err) => {
                    console.error("Error loading image:", err)
                    setError("Failed to load screen data")
                }
            }
        })

        // Listen for cursor position updates
        socketClient.on("cursor-position", (data) => {
            if (cursorRef.current && canvasRef.current) {
                const canvas = canvasRef.current
                const rect = canvas.getBoundingClientRect()
                const scaleX = rect.width / canvas.width
                const scaleY = rect.height / canvas.height

                cursorRef.current.style.left = `${rect.left + data.x * scaleX}px`
                cursorRef.current.style.top = `${rect.top + data.y * scaleY}px`
                cursorRef.current.style.display = "block"
            }
        })

        // Calculate FPS and update stats
        const statsInterval = setInterval(() => {
            // Calculate FPS
            const now = Date.now()
            const timeElapsed = (now - perfMetrics.current.lastFpsCalc) / 1000
            const fps = perfMetrics.current.framesReceived / timeElapsed

            // Reset for next calculation
            perfMetrics.current.framesReceived = 0
            perfMetrics.current.lastFpsCalc = now

            // Update FPS stats
            console.log(`Current FPS: ${fps.toFixed(1)}`)
        }, 2000)

        // Cleanup on unmount
        return () => {
            socketClient.disconnect()
            clearInterval(statsInterval)

            // Remove custom cursor
            if (cursorRef.current) {
                document.body.removeChild(cursorRef.current)
                cursorRef.current = null
            }
        }
    }, [code])

    // Calculate mouse position with precise coordinate mapping
    const calculateMousePosition = (e) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }

        const rect = canvas.getBoundingClientRect()

        // Calculate exact position with proper scaling
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        return {
            x: Math.floor((e.clientX - rect.left) * scaleX),
            y: Math.floor((e.clientY - rect.top) * scaleY),
        }
    }

    // Handle mouse movement
    const handleMouseMove = (e) => {
        if (!hostConnected) return

        const position = calculateMousePosition(e)

        // Send mouse position to host
        socketClient.emitVolatile("mouse-move", {
            code,
            x: position.x,
            y: position.y,
            timestamp: Date.now(),
        })

        // Update control stats
        setControlStats((prev) => ({
            ...prev,
            mouse: prev.mouse + 1,
        }))
    }

    // Handle mouse click
    const handleMouseClick = (e) => {
        if (!hostConnected) return
        e.preventDefault()

        const position = calculateMousePosition(e)

        // Send click event to host
        socketClient.emit("mouse-click", {
            code,
            button: e.button, // 0 for left, 2 for right
            x: position.x,
            y: position.y,
            timestamp: Date.now(),
        })

        // Make sure the canvas gets focus when clicked
        if (canvasRef.current) {
            canvasRef.current.focus()
            canvasFocused.current = true
        }
    }

    // Handle mouse double click
    const handleDoubleClick = (e) => {
        if (!hostConnected) return
        e.preventDefault()

        const position = calculateMousePosition(e)

        // Send double-click event to host
        socketClient.emit("mouse-double-click", {
            code,
            x: position.x,
            y: position.y,
            timestamp: Date.now(),
        })
    }

    // Handle mouse wheel/scroll
    const handleWheel = (e) => {
        if (!hostConnected || !canvasFocused.current) return
        e.preventDefault()

        // Send scroll event to host
        socketClient.emitVolatile("mouse-scroll", {
            code,
            deltaX: e.deltaX,
            deltaY: e.deltaY,
            deltaZ: e.deltaZ,
            timestamp: Date.now(),
        })
    }

    // Handle key down
    const handleKeyDown = (e) => {
        if (!hostConnected || !canvasFocused.current) return

        // Skip if already pressed (prevent repeats)
        if (keyStates.current[e.key]) return
        keyStates.current[e.key] = true

        // Prevent default browser actions for common keys
        if (["F5", "F11", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
            e.preventDefault()
        }

        // Send key down event to host
        socketClient.emit("key-press", {
            code,
            key: e.key,
            keyCode: e.keyCode,
            type: "down",
            shift: e.shiftKey,
            alt: e.altKey,
            ctrl: e.ctrlKey,
            meta: e.metaKey,
            timestamp: Date.now(),
        })

        // Update control stats
        setControlStats((prev) => ({
            ...prev,
            keyboard: prev.keyboard + 1,
        }))
    }

    // Handle key up
    const handleKeyUp = (e) => {
        if (!hostConnected || !canvasFocused.current) return

        // Clear key state
        keyStates.current[e.key] = false

        // Send key up event to host
        socketClient.emit("key-press", {
            code,
            key: e.key,
            keyCode: e.keyCode,
            type: "up",
            shift: e.shiftKey,
            alt: e.altKey,
            ctrl: e.ctrlKey,
            meta: e.metaKey,
            timestamp: Date.now(),
        })
    }

    // Handle canvas focus
    const handleCanvasFocus = () => {
        console.log("Canvas focused")
        canvasFocused.current = true
    }

    // Handle canvas blur
    const handleCanvasBlur = () => {
        console.log("Canvas blurred")
        canvasFocused.current = false

        // Release all pressed keys on blur
        Object.keys(keyStates.current).forEach((key) => {
            if (keyStates.current[key]) {
                keyStates.current[key] = false
                socketClient.emit("key-press", {
                    code,
                    key,
                    type: "up",
                    shift: false,
                    alt: false,
                    ctrl: false,
                    meta: false,
                    timestamp: Date.now(),
                })
            }
        })
    }

    // Add global keyboard event listeners
    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown)
        window.addEventListener("keyup", handleKeyUp)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
            window.removeEventListener("keyup", handleKeyUp)
        }
    }, [hostConnected])

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

                <div className="mb-4 p-2 bg-blue-50 rounded-md text-sm">
                    <div className="flex justify-between">
                        <div>
                            <span className="font-medium">Mouse events:</span> {controlStats.mouse}
                        </div>
                        <div>
                            <span className="font-medium">Keyboard events:</span> {controlStats.keyboard}
                        </div>
                        <div>
                            <button
                                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                                onClick={() => canvasRef.current?.focus()}
                            >
                                Focus Canvas
                            </button>
                        </div>
                    </div>
                </div>

                <div className="relative border-2 border-gray-300 rounded-md overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        width={screenSize.width}
                        height={screenSize.height}
                        style={{
                            width: "100%",
                            height: "auto",
                            cursor: "none", // Hide default cursor
                        }}
                        onMouseMove={handleMouseMove}
                        onClick={handleMouseClick}
                        onDoubleClick={handleDoubleClick}
                        onWheel={handleWheel}
                        onContextMenu={(e) => {
                            e.preventDefault()
                            handleMouseClick({ ...e, button: 2 })
                        }}
                        tabIndex={0}
                        onFocus={handleCanvasFocus}
                        onBlur={handleCanvasBlur}
                    />
                </div>

                <div className="mt-4 p-3 bg-gray-100 rounded-md text-sm">
                    <p>
                        <strong>Control Instructions:</strong>
                    </p>
                    <ul className="list-disc pl-5 mt-1">
                        <li>Click on the canvas to focus it and enable keyboard control</li>
                        <li>Move your mouse over the canvas to control the remote cursor</li>
                        <li>Left/right click to interact with the remote system</li>
                        <li>Use scroll wheel to scroll on the remote system</li>
                        <li>Type normally to send keystrokes to the remote system</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default Client
