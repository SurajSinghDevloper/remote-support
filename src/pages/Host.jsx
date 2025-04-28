"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import socketClient from "../socket-client"

function Host() {
    const { code } = useParams()
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const intervalRef = useRef(null)
    const [error, setError] = useState(null)
    const [isSharing, setIsSharing] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState("Connecting...")
    const [quality, setQuality] = useState(0.5) // Default quality
    const [frameRate, setFrameRate] = useState(3) // Default 3 FPS
    const [clientConnected, setClientConnected] = useState(false)
    const [lastSentTime, setLastSentTime] = useState(null)
    const [framesSent, setFramesSent] = useState(0)
    const [framesAcknowledged, setFramesAcknowledged] = useState(0)
    const [screenSize, setScreenSize] = useState({ width: 1280, height: 720 })
    const [debugLog, setDebugLog] = useState([])
    const [networkStats, setNetworkStats] = useState({
        latency: 0,
        bandwidth: 0,
        quality: "Unknown",
    })

    // Performance monitoring
    const performanceRef = useRef({
        lastFrameTime: Date.now(),
        frameTimings: [],
        bytesSent: 0,
        lastBytesCalc: Date.now(),
    })

    const addDebugLog = (message) => {
        setDebugLog((prev) => [...prev.slice(-9), message].filter(Boolean))
    }

    useEffect(() => {
        // Connect to socket server
        socketClient.connect()

        // Join room as host
        socketClient.joinRoom(code, "host")
        console.log(`Host joining room: ${code}`)

        // Listen for room join confirmation on control channel
        socketClient.onControl("room-joined", (data) => {
            setConnectionStatus(`Connected as host. Room: ${data.room}`)
            console.log("Room joined:", data)
        })

        // Listen for client connection
        socketClient.onControl("client-connected", (data) => {
            console.log("Client connected:", data)
            setConnectionStatus(`Client connected to room: ${data.room}`)
            setClientConnected(true)
            addDebugLog(`Client connected: ${data.clientId}`)

            // Send screen size to client
            if (screenSize.width && screenSize.height) {
                socketClient.emitControl("screen-size", {
                    code,
                    width: screenSize.width,
                    height: screenSize.height,
                })
            }

            // Send quality settings
            socketClient.emitControl("quality-settings", {
                code,
                quality,
                frameRate,
            })
        })

        // Listen for mouse move events
        socketClient.onControl("mouse-move", (data) => {
            if (!window.electronAPI) {
                addDebugLog("Electron API not available")
                return
            }

            try {
                window.electronAPI.sendMouseMove({
                    x: data.x,
                    y: data.y,
                    screenWidth: screenSize.width,
                    screenHeight: screenSize.height,
                })

                // Send cursor position back to client for visual feedback
                socketClient.emitControl("cursor-position", {
                    x: data.x,
                    y: data.y,
                    code,
                })
            } catch (err) {
                console.error("Error processing mouse move:", err)
                addDebugLog(`Mouse move error: ${err.message}`)
            }
        })

        // Listen for mouse click events
        socketClient.onControl("mouse-click", (data) => {
            if (!window.electronAPI) {
                addDebugLog("Electron API not available")
                return
            }

            try {
                addDebugLog(`Mouse click: ${data.button} at ${data.x},${data.y}`)
                window.electronAPI.sendMouseClick({
                    x: data.x,
                    y: data.y,
                    button: data.button || 0,
                    screenWidth: screenSize.width,
                    screenHeight: screenSize.height,
                })
            } catch (err) {
                console.error("Error processing mouse click:", err)
                addDebugLog(`Mouse click error: ${err.message}`)
            }
        })

        // Listen for key press events
        socketClient.onControl("key-press", (data) => {
            if (!window.electronAPI) {
                addDebugLog("Electron API not available")
                return
            }

            try {
                addDebugLog(`Key ${data.type}: ${data.key}`)
                window.electronAPI.sendKeyPress({
                    key: data.key,
                    type: data.type,
                    shift: data.shift,
                    alt: data.alt,
                    ctrl: data.ctrl,
                    meta: data.meta,
                })
            } catch (err) {
                console.error("Error processing key press:", err)
                addDebugLog(`Key press error: ${err.message}`)
            }
        })

        // Listen for client disconnection
        socketClient.onControl("client-disconnected", (data) => {
            console.log("Client disconnected:", data)
            setConnectionStatus(`Client disconnected from room: ${data.room}`)
            setClientConnected(false)
            addDebugLog(`Client disconnected: ${data.clientId}`)
        })

        // Listen for acknowledgements of received screen data
        socketClient.onScreen("screen-data-received", (data) => {
            const now = Date.now()
            const latency = now - Number.parseInt(data.frameId, 10)

            // Update network stats
            setNetworkStats((prev) => ({
                ...prev,
                latency: latency,
            }))

            setLastSentTime(new Date().toLocaleTimeString())
            setFramesAcknowledged((prev) => prev + 1)
        })

        // Listen for room expiration
        socketClient.onControl("room-expired", (data) => {
            console.log("Room expired:", data)
            setConnectionStatus("Room expired due to inactivity")
            stopSharing()
        })

        // Get screen size if available
        if (window?.electronAPI?.getScreenSize) {
            window.electronAPI
                .getScreenSize()
                .then((size) => {
                    if (size && size.width && size.height) {
                        setScreenSize(size)
                        addDebugLog(`Screen size: ${size.width}x${size.height}`)

                        // Send screen size to client if connected
                        if (clientConnected) {
                            socketClient.emitControl("screen-size", {
                                code,
                                width: size.width,
                                height: size.height,
                            })
                        }
                    }
                })
                .catch((err) => {
                    console.error("Error getting screen size:", err)
                })
        }

        // Set up network stats monitoring
        const statsInterval = setInterval(() => {
            if (performanceRef.current.frameTimings.length > 0) {
                const avgFrameTime =
                    performanceRef.current.frameTimings.reduce((a, b) => a + b, 0) / performanceRef.current.frameTimings.length

                // Calculate bandwidth (bytes per second)
                const now = Date.now()
                const timeElapsed = (now - performanceRef.current.lastBytesCalc) / 1000 // in seconds
                const bandwidth = performanceRef.current.bytesSent / timeElapsed

                // Reset for next calculation
                performanceRef.current.bytesSent = 0
                performanceRef.current.lastBytesCalc = now

                // Determine connection quality
                let quality = "Unknown"
                if (avgFrameTime < 100) {
                    quality = "Excellent"
                } else if (avgFrameTime < 300) {
                    quality = "Good"
                } else if (avgFrameTime < 1000) {
                    quality = "Fair"
                } else {
                    quality = "Poor"
                }

                setNetworkStats({
                    latency: networkStats.latency,
                    bandwidth: Math.round(bandwidth / 1024), // KB/s
                    quality,
                })
            }
        }, 2000)

        return () => {
            stopSharing()
            socketClient.disconnect()
            clearInterval(statsInterval)
        }
    }, [code])

    // Effect to update quality settings when they change
    useEffect(() => {
        if (clientConnected) {
            socketClient.emitControl("quality-settings", {
                code,
                quality,
                frameRate,
            })
        }
    }, [quality, frameRate, clientConnected, code])

    const startScreenShare = async () => {
        try {
            setError(null)

            if (window?.electronAPI?.getVideoSources) {
                // Electron app
                const sources = await window.electronAPI.getVideoSources()

                if (sources.length === 0) {
                    throw new Error("No screen sources available")
                }

                const selectedSource = sources[0]
                console.log("Selected source:", selectedSource)
                addDebugLog(`Selected source: ${selectedSource.name}`)

                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        mandatory: {
                            chromeMediaSource: "desktop",
                            chromeMediaSourceId: selectedSource.id,
                            minWidth: screenSize.width,
                            maxWidth: screenSize.width,
                            minHeight: screenSize.height,
                            maxHeight: screenSize.height,
                        },
                    },
                })

                setupStream(stream)
            } else {
                // Browser (non-Electron)
                if (!navigator.mediaDevices.getDisplayMedia) {
                    throw new Error("Screen sharing is not supported in this browser.")
                }

                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        frameRate: frameRate,
                        width: { ideal: screenSize.width },
                        height: { ideal: screenSize.height },
                    },
                    audio: false,
                })

                setupStream(stream)
            }

            setIsSharing(true)
        } catch (err) {
            console.error("Screen share error:", err)
            setError(err.message)
            addDebugLog(`Screen share error: ${err.message}`)
            stopSharing()
        }
    }

    const setupStream = async (stream) => {
        if (!videoRef.current) throw new Error("Video element not ready")

        videoRef.current.srcObject = stream
        await videoRef.current.play()

        streamRef.current = stream

        const ctx = canvasRef.current.getContext("2d")
        canvasRef.current.width = screenSize.width
        canvasRef.current.height = screenSize.height

        // Calculate interval based on frame rate
        const interval = 1000 / frameRate

        intervalRef.current = setInterval(() => {
            if (videoRef.current && canvasRef.current) {
                try {
                    // Only send if a client is connected
                    if (clientConnected) {
                        // Draw video frame to canvas
                        ctx.drawImage(videoRef.current, 0, 0, screenSize.width, screenSize.height)

                        // Generate a unique ID for this frame (timestamp)
                        const frameId = Date.now().toString()

                        // Emit screen data with adaptive quality
                        const imageData = canvasRef.current.toDataURL("image/jpeg", quality)

                        // Track bytes sent for bandwidth calculation
                        performanceRef.current.bytesSent += imageData.length

                        // Track frame timing
                        const now = Date.now()
                        const timeSinceLastFrame = now - performanceRef.current.lastFrameTime
                        performanceRef.current.lastFrameTime = now

                        // Keep only last 10 frame timings
                        performanceRef.current.frameTimings.push(timeSinceLastFrame)
                        if (performanceRef.current.frameTimings.length > 10) {
                            performanceRef.current.frameTimings.shift()
                        }

                        // Send screen data through screen channel
                        socketClient.emitScreen("screen-data", {
                            image: imageData,
                            code: code,
                            frameId: frameId,
                            timestamp: now,
                        })

                        setFramesSent((prev) => prev + 1)
                    }
                } catch (err) {
                    console.error("Error capturing screen:", err)
                    addDebugLog(`Screen capture error: ${err.message}`)
                }
            }
        }, interval)
    }

    const stopSharing = () => {
        clearInterval(intervalRef.current)
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
        setIsSharing(false)
    }

    const handleQualityChange = (e) => {
        setQuality(Number.parseFloat(e.target.value))
    }

    const handleFrameRateChange = (e) => {
        const newFrameRate = Number.parseInt(e.target.value)
        setFrameRate(newFrameRate)

        // Update the interval if sharing is active
        if (isSharing) {
            stopSharing()
            startScreenShare()
        }
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold mb-4">Host Room: {code}</h2>
                <p className="mb-4 text-gray-600">{connectionStatus}</p>

                {lastSentTime && (
                    <div className="mb-4 p-3 bg-green-50 rounded-md">
                        <p className="text-green-600">Last frame sent: {lastSentTime}</p>
                        <p className="text-green-600">Frames sent: {framesSent}</p>
                        <p className="text-green-600">Frames acknowledged: {framesAcknowledged}</p>
                        <p className="text-green-600">Latency: {networkStats.latency}ms</p>
                        <p className="text-green-600">Bandwidth: {networkStats.bandwidth} KB/s</p>
                        <p className="text-green-600">Connection quality: {networkStats.quality}</p>
                    </div>
                )}

                <div className="mb-6 grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quality: {quality}</label>
                        <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.1"
                            value={quality}
                            onChange={handleQualityChange}
                            className="w-full"
                            disabled={isSharing}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Frame Rate: {frameRate} FPS</label>
                        <select
                            value={frameRate}
                            onChange={handleFrameRateChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            disabled={isSharing}
                        >
                            <option value="1">1 FPS (Lowest)</option>
                            <option value="2">2 FPS (Low)</option>
                            <option value="3">3 FPS (Recommended)</option>
                            <option value="5">5 FPS (Medium)</option>
                            <option value="10">10 FPS (High)</option>
                            <option value="15">15 FPS (Highest)</option>
                        </select>
                    </div>
                </div>

                <div className="flex space-x-4 mb-6">
                    {!isSharing ? (
                        <button
                            onClick={startScreenShare}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Start Sharing
                        </button>
                    ) : (
                        <button
                            onClick={stopSharing}
                            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            Stop Sharing
                        </button>
                    )}
                </div>

                {error && <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4">Error: {error}</div>}

                <div className="hidden">
                    <video ref={videoRef} style={{ display: "none" }} autoPlay muted playsInline />
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                </div>

                {/* Debug log */}
                <div className="mt-4 p-3 bg-gray-100 rounded-md">
                    <h3 className="text-sm font-medium mb-2">Debug Log:</h3>
                    <div className="text-xs font-mono bg-black text-green-400 p-2 rounded h-32 overflow-y-auto">
                        {debugLog.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                    </div>
                </div>

                <div className="mt-4 p-4 bg-gray-100 rounded-md">
                    <h3 className="text-lg font-medium mb-2">Instructions:</h3>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Click "Start Sharing" to begin sharing your screen</li>
                        <li>Adjust quality and frame rate for better performance</li>
                        <li>Lower quality and frame rate for slower connections</li>
                        <li>The client will be able to see and control your screen once connected</li>
                        <li>Click "Stop Sharing" to end the session</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default Host
