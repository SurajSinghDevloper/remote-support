// "use client"

// import { useEffect, useRef, useState } from "react"
// import { useParams } from "react-router-dom"
// import socket from "../socket"

// const Host = () => {
//     const { code } = useParams()
//     const videoRef = useRef(null)
//     const canvasRef = useRef(null)
//     const streamRef = useRef(null)
//     const intervalRef = useRef(null)
//     const [error, setError] = useState(null)
//     const [isSharing, setIsSharing] = useState(false)
//     const [connectionStatus, setConnectionStatus] = useState("Connecting...")
//     const [quality, setQuality] = useState(0.5) // Default quality
//     const [frameRate, setFrameRate] = useState(3) // Default 3 FPS
//     const [clientConnected, setClientConnected] = useState(false)
//     const [lastSentTime, setLastSentTime] = useState(null)
//     const [framesSent, setFramesSent] = useState(0)
//     const [framesAcknowledged, setFramesAcknowledged] = useState(0)

//     useEffect(() => {
//         // Join a room when Host component mounts
//         socket.emit("join-room", code)
//         console.log(`Host joining room: ${code}`)

//         // Listen for room join confirmation
//         socket.on("room-joined", (data) => {
//             setConnectionStatus(`Connected as host. Room: ${data.room}`)
//             console.log("Room joined:", data)
//         })

//         // Listen for client connection
//         socket.on("client-connected", (data) => {
//             console.log("Client connected:", data)
//             setConnectionStatus(`Client connected to room: ${data.room}`)
//             setClientConnected(true)
//         })

//         // Listen for client disconnection
//         socket.on("client-disconnected", (data) => {
//             console.log("Client disconnected:", data)
//             setConnectionStatus(`Client disconnected from room: ${data.room}`)
//             setClientConnected(false)
//         })

//         // Listen for acknowledgements of received screen data
//         socket.on("screen-data-received", (data) => {
//             console.log("Screen data received by client:", data)
//             setLastSentTime(new Date().toLocaleTimeString())
//             setFramesAcknowledged((prev) => prev + 1)
//         })

//         // Listen for room expiration
//         socket.on("room-expired", (data) => {
//             console.log("Room expired:", data)
//             setConnectionStatus("Room expired due to inactivity")
//             stopSharing()
//         })

//         return () => {
//             stopSharing()
//             socket.off("room-joined")
//             socket.off("client-connected")
//             socket.off("client-disconnected")
//             socket.off("screen-data-received")
//             socket.off("room-expired")
//         }
//     }, [code])

//     const startScreenShare = async () => {
//         try {
//             setError(null)

//             if (window?.electronAPI?.getVideoSources) {
//                 // Electron app
//                 const sources = await window.electronAPI.getVideoSources()

//                 if (sources.length === 0) {
//                     throw new Error("No screen sources available")
//                 }

//                 const selectedSource = sources[0]
//                 console.log("Selected source:", selectedSource)

//                 const stream = await navigator.mediaDevices.getUserMedia({
//                     audio: false,
//                     video: {
//                         mandatory: {
//                             chromeMediaSource: "desktop",
//                             chromeMediaSourceId: selectedSource.id,
//                             minWidth: 1280,
//                             maxWidth: 1280,
//                             minHeight: 720,
//                             maxHeight: 720,
//                         },
//                     },
//                 })

//                 setupStream(stream)
//             } else {
//                 // Browser (non-Electron)
//                 if (!navigator.mediaDevices.getDisplayMedia) {
//                     throw new Error("Screen sharing is not supported in this browser.")
//                 }

//                 const stream = await navigator.mediaDevices.getDisplayMedia({
//                     video: {
//                         frameRate: 15,
//                         width: { ideal: 1280 },
//                         height: { ideal: 720 },
//                     },
//                     audio: false,
//                 })

//                 setupStream(stream)
//             }

//             setIsSharing(true)
//         } catch (err) {
//             console.error("Screen share error:", err)
//             setError(err.message)
//             stopSharing()
//         }
//     }

//     const setupStream = async (stream) => {
//         if (!videoRef.current) throw new Error("Video element not ready")

//         videoRef.current.srcObject = stream
//         await videoRef.current.play()

//         streamRef.current = stream

//         const ctx = canvasRef.current.getContext("2d")
//         canvasRef.current.width = 1280
//         canvasRef.current.height = 720

//         // Use a more reasonable interval for remote support
//         const interval = 1000 / frameRate // Convert FPS to milliseconds

//         intervalRef.current = setInterval(() => {
//             if (videoRef.current && canvasRef.current) {
//                 try {
//                     // Only send if a client is connected
//                     if (clientConnected) {
//                         ctx.drawImage(videoRef.current, 0, 0, 1280, 720)

//                         // Generate a unique ID for this frame
//                         const frameId = Date.now().toString()

//                         // Emit screen data with room code
//                         const imageData = canvasRef.current.toDataURL("image/jpeg", quality)
//                         socket.emit("screen-data", {
//                             image: imageData,
//                             code: code,
//                             frameId: frameId,
//                             timestamp: Date.now(),
//                         })

//                         setFramesSent((prev) => prev + 1)
//                         console.log(`Sent frame ${frameId} at ${new Date().toLocaleTimeString()}`)
//                     }
//                 } catch (err) {
//                     console.error("Error capturing screen:", err)
//                 }
//             }
//         }, interval)
//     }

//     const stopSharing = () => {
//         clearInterval(intervalRef.current)
//         if (streamRef.current) {
//             streamRef.current.getTracks().forEach((track) => track.stop())
//         }
//         if (videoRef.current) {
//             videoRef.current.srcObject = null
//         }
//         setIsSharing(false)
//     }

//     const handleQualityChange = (e) => {
//         setQuality(Number.parseFloat(e.target.value))
//     }

//     const handleFrameRateChange = (e) => {
//         const newFrameRate = Number.parseInt(e.target.value)
//         setFrameRate(newFrameRate)

//         // Update the interval if sharing is active
//         if (isSharing) {
//             stopSharing()
//             startScreenShare()
//         }
//     }

//     return (
//         <div className="p-6 max-w-4xl mx-auto">
//             <div className="bg-white p-6 rounded-lg shadow-lg">
//                 <h2 className="text-2xl font-semibold mb-4">Host Room: {code}</h2>
//                 <p className="mb-4 text-gray-600">{connectionStatus}</p>

//                 {lastSentTime && (
//                     <div className="mb-4 p-3 bg-green-50 rounded-md">
//                         <p className="text-green-600">Last frame sent: {lastSentTime}</p>
//                         <p className="text-green-600">Frames sent: {framesSent}</p>
//                         <p className="text-green-600">Frames acknowledged: {framesAcknowledged}</p>
//                     </div>
//                 )}

//                 <div className="mb-6 grid grid-cols-2 gap-4">
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">Quality: {quality}</label>
//                         <input
//                             type="range"
//                             min="0.1"
//                             max="1.0"
//                             step="0.1"
//                             value={quality}
//                             onChange={handleQualityChange}
//                             className="w-full"
//                             disabled={isSharing}
//                         />
//                     </div>
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">Frame Rate: {frameRate} FPS</label>
//                         <select
//                             value={frameRate}
//                             onChange={handleFrameRateChange}
//                             className="w-full p-2 border border-gray-300 rounded-md"
//                             disabled={isSharing}
//                         >
//                             <option value="1">1 FPS (Slowest)</option>
//                             <option value="2">2 FPS</option>
//                             <option value="3">3 FPS (Recommended)</option>
//                             <option value="5">5 FPS</option>
//                             <option value="10">10 FPS (Fastest)</option>
//                         </select>
//                     </div>
//                 </div>

//                 <div className="flex space-x-4 mb-6">
//                     {!isSharing ? (
//                         <button
//                             onClick={startScreenShare}
//                             className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                         >
//                             Start Sharing
//                         </button>
//                     ) : (
//                         <button
//                             onClick={stopSharing}
//                             className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
//                         >
//                             Stop Sharing
//                         </button>
//                     )}
//                 </div>

//                 {error && <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4">Error: {error}</div>}

//                 <div className="hidden">
//                     <video ref={videoRef} style={{ display: "none" }} autoPlay muted playsInline />
//                     <canvas ref={canvasRef} style={{ display: "none" }} />
//                 </div>

//                 <div className="mt-6 p-4 bg-gray-100 rounded-md">
//                     <h3 className="text-lg font-medium mb-2">Instructions:</h3>
//                     <ul className="list-disc pl-5 space-y-1">
//                         <li>Click "Start Sharing" to begin sharing your screen</li>
//                         <li>Adjust quality and frame rate for better performance</li>
//                         <li>Lower quality and frame rate for slower connections</li>
//                         <li>The client will be able to see your screen once connected</li>
//                         <li>Click "Stop Sharing" to end the session</li>
//                     </ul>
//                 </div>
//             </div>
//         </div>
//     )
// }

// export default Host


"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import socket from "../socket"

const Client = () => {
    const { code } = useParams()
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const intervalRef = useRef(null)
    const containerRef = useRef(null)
    const [error, setError] = useState(null)
    const [isSharing, setIsSharing] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState("Connecting...")
    const [quality, setQuality] = useState(0.5)
    const [frameRate, setFrameRate] = useState(3)
    const [clientConnected, setClientConnected] = useState(false)
    const [lastSentTime, setLastSentTime] = useState(null)
    const [framesSent, setFramesSent] = useState(0)
    const [framesAcknowledged, setFramesAcknowledged] = useState(0)
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })
    const [dimensions, setDimensions] = useState({ width: 1280, height: 720 })
    const [scaleFactor, setScaleFactor] = useState(1)

    useEffect(() => {
        socket.emit("join-room", code)
        console.log(`Host joining room: ${code}`)

        socket.on("room-joined", (data) => {
            setConnectionStatus(`Connected as host. Room: ${data.room}`)
            console.log("Room joined:", data)
        })

        socket.on("client-connected", (data) => {
            console.log("Client connected:", data)
            setConnectionStatus(`Client connected to room: ${data.room}`)
            setClientConnected(true)
        })

        socket.on("client-disconnected", (data) => {
            console.log("Client disconnected:", data)
            setConnectionStatus(`Client disconnected from room: ${data.room}`)
            setClientConnected(false)
        })

        socket.on("screen-data-received", (data) => {
            console.log("Screen data received by client:", data)
            setLastSentTime(new Date().toLocaleTimeString())
            setFramesAcknowledged((prev) => prev + 1)
        })

        socket.on("room-expired", (data) => {
            console.log("Room expired:", data)
            setConnectionStatus("Room expired due to inactivity")
            stopSharing()
        })

        // New mouse control listeners
        socket.on("cursor-position", (position) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                setCursorPosition({
                    x: (position.x / dimensions.width) * rect.width,
                    y: (position.y / dimensions.height) * rect.height
                })
            }
        })

        socket.on("scale-factor", (factor) => {
            setScaleFactor(factor)
        })

        return () => {
            stopSharing()
            socket.off("room-joined")
            socket.off("client-connected")
            socket.off("client-disconnected")
            socket.off("screen-data-received")
            socket.off("room-expired")
            socket.off("cursor-position")
            socket.off("scale-factor")
        }
    }, [code, dimensions])

    // Add mouse control handlers
    const handleMouseEvent = (e, type) => {
        if (!containerRef.current || !clientConnected) return

        const rect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const hostX = (x / rect.width) * dimensions.width * scaleFactor
        const hostY = (y / rect.height) * dimensions.height * scaleFactor

        socket.emit("control-event", {
            type,
            code,
            x: hostX,
            y: hostY,
            button: e.button
        })
    }

    // Existing functions remain unchanged
    const startScreenShare = async () => { /* ... */ }
    const setupStream = async (stream) => { /* ... */ }
    const stopSharing = () => { /* ... */ }
    const handleQualityChange = (e) => { /* ... */ }
    const handleFrameRateChange = (e) => { /* ... */ }

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
                    </div>
                )}

                {/* Add mouse control container */}
                <div
                    ref={containerRef}
                    className="relative bg-gray-100 rounded-md overflow-hidden"
                    onMouseMove={(e) => handleMouseEvent(e, 'mouse-move')}
                    onClick={(e) => handleMouseEvent(e, 'mouse-click')}
                    onContextMenu={(e) => {
                        e.preventDefault()
                        handleMouseEvent(e, 'mouse-click')
                    }}
                >
                    {/* Existing screen preview elements */}
                    <div className="hidden">
                        <video ref={videoRef} style={{ display: "none" }} autoPlay muted playsInline />
                        <canvas ref={canvasRef} style={{ display: "none" }} />
                    </div>

                    {/* Add custom cursor */}
                    <div
                        className="absolute w-2 h-2 bg-red-500 rounded-full pointer-events-none transition-all duration-75"
                        style={{
                            left: cursorPosition.x,
                            top: cursorPosition.y,
                            transform: 'translate(-50%, -50%)',
                            boxShadow: '0 0 8px rgba(255,0,0,0.5)'
                        }}
                    />
                </div>

                {/* Existing controls remain unchanged */}
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
                            <option value="1">1 FPS (Slowest)</option>
                            <option value="2">2 FPS</option>
                            <option value="3">3 FPS (Recommended)</option>
                            <option value="5">5 FPS</option>
                            <option value="10">10 FPS (Fastest)</option>
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

                <div className="mt-6 p-4 bg-gray-100 rounded-md">
                    <h3 className="text-lg font-medium mb-2">Instructions:</h3>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Click "Start Sharing" to begin sharing your screen</li>
                        <li>Adjust quality and frame rate for better performance</li>
                        <li>Lower quality and frame rate for slower connections</li>
                        <li>The client will be able to see your screen once connected</li>
                        <li>Click "Stop Sharing" to end the session</li>
                        <li>Move mouse over preview to control remote cursor</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default Client