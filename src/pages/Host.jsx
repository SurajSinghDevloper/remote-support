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
//         // Add this to your existing useEffect socket listeners
//         socket.on("control-event", (event) => {
//             if (!window.electronAPI) return;

//             // Get screen scale factor for high DPI displays
//             const scaleFactor = window.electronAPI.getScreenScaleFactor();

//             // Convert relative coordinates to actual screen coordinates
//             const actualX = event.x * scaleFactor;
//             const actualY = event.y * scaleFactor;

//             switch (event.type) {
//                 case 'mouse-move':
//                     window.electronAPI.sendInputEvent({
//                         type: 'mouseMove',
//                         x: actualX,
//                         y: actualY
//                     });
//                     // Broadcast cursor position to client
//                     socket.emit("cursor-position", {
//                         x: event.x,
//                         y: event.y,
//                         code
//                     });
//                     break;

//                 case 'mouse-click':
//                     window.electronAPI.sendInputEvent({
//                         type: event.button === 2 ? 'mouseDownRight' : 'mouseDown',
//                         x: actualX,
//                         y: actualY
//                     });
//                     break;
//             }
//         });

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

const Host = () => {
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

    useEffect(() => {
        // Join a room when Host component mounts
        socket.emit("join-room", code)
        console.log(`Host joining room: ${code}`)

        // Listen for room join confirmation
        socket.on("room-joined", (data) => {
            setConnectionStatus(`Connected as host. Room: ${data.room}`)
            console.log("Room joined:", data)
        })

        // Listen for client connection
        socket.on("client-connected", (data) => {
            console.log("Client connected:", data)
            setConnectionStatus(`Client connected to room: ${data.room}`)
            setClientConnected(true)
        })

        // Listen for control events from client
        socket.on("control-event", (event) => {
            if (!window.electronAPI) {
                console.log("Electron API not available, control events will not work")
                return
            }

            try {
                // Get screen dimensions for scaling
                const { width, height } = screenSize

                switch (event.type) {
                    case "mouse-move":
                        window.electronAPI.sendMouseMove({
                            x: event.x,
                            y: event.y,
                            screenWidth: width,
                            screenHeight: height,
                        })

                        // Send cursor position back to client for visual feedback
                        socket.emit("cursor-position", {
                            x: event.x,
                            y: event.y,
                            code,
                        })
                        break

                    case "mouse-click":
                        window.electronAPI.sendMouseClick({
                            x: event.x,
                            y: event.y,
                            button: event.button || 0,
                            screenWidth: width,
                            screenHeight: height,
                        })
                        break

                    case "key-down":
                    case "key-up":
                        window.electronAPI.sendKeyPress({
                            key: event.key,
                            keyCode: event.keyCode,
                            type: event.type,
                            shift: event.shift,
                            alt: event.alt,
                            ctrl: event.ctrl,
                            meta: event.meta,
                        })
                        break
                }
            } catch (err) {
                console.error("Error processing control event:", err)
            }
        })

        // Listen for client disconnection
        socket.on("client-disconnected", (data) => {
            console.log("Client disconnected:", data)
            setConnectionStatus(`Client disconnected from room: ${data.room}`)
            setClientConnected(false)
        })

        // Listen for acknowledgements of received screen data
        socket.on("screen-data-received", (data) => {
            console.log("Screen data received by client:", data)
            setLastSentTime(new Date().toLocaleTimeString())
            setFramesAcknowledged((prev) => prev + 1)
        })

        // Listen for room expiration
        socket.on("room-expired", (data) => {
            console.log("Room expired:", data)
            setConnectionStatus("Room expired due to inactivity")
            stopSharing()
        })

        // Listen for cursor position updates from Electron main process
        const handleCursorUpdate = (e) => {
            if (clientConnected) {
                socket.emit("cursor-position", {
                    x: e.detail.x,
                    y: e.detail.y,
                    code,
                })
            }
        }

        window.addEventListener("cursor-position-update", handleCursorUpdate)

        return () => {
            stopSharing()
            socket.off("room-joined")
            socket.off("client-connected")
            socket.off("client-disconnected")
            socket.off("screen-data-received")
            socket.off("room-expired")
            socket.off("control-event")
            window.removeEventListener("cursor-position-update", handleCursorUpdate)
        }
    }, [code, screenSize, clientConnected])

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

                // Get screen dimensions if available
                if (window.electronAPI.getScreenSize) {
                    const size = await window.electronAPI.getScreenSize()
                    if (size && size.width && size.height) {
                        setScreenSize(size)
                    }
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        mandatory: {
                            chromeMediaSource: "desktop",
                            chromeMediaSourceId: selectedSource.id,
                            minWidth: 1280,
                            maxWidth: 1280,
                            minHeight: 720,
                            maxHeight: 720,
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
                        frameRate: 15,
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                    audio: false,
                })

                // Try to get screen dimensions from video track settings
                const videoTrack = stream.getVideoTracks()[0]
                if (videoTrack) {
                    const settings = videoTrack.getSettings()
                    if (settings.width && settings.height) {
                        setScreenSize({
                            width: settings.width,
                            height: settings.height,
                        })
                    }
                }

                setupStream(stream)
            }

            setIsSharing(true)
        } catch (err) {
            console.error("Screen share error:", err)
            setError(err.message)
            stopSharing()
        }
    }

    const setupStream = async (stream) => {
        if (!videoRef.current) throw new Error("Video element not ready")

        videoRef.current.srcObject = stream
        await videoRef.current.play()

        streamRef.current = stream

        const ctx = canvasRef.current.getContext("2d")
        canvasRef.current.width = 1280
        canvasRef.current.height = 720

        // Use a more reasonable interval for remote support
        const interval = 1000 / frameRate // Convert FPS to milliseconds

        intervalRef.current = setInterval(() => {
            if (videoRef.current && canvasRef.current) {
                try {
                    // Only send if a client is connected
                    if (clientConnected) {
                        ctx.drawImage(videoRef.current, 0, 0, 1280, 720)

                        // Generate a unique ID for this frame
                        const frameId = Date.now().toString()

                        // Emit screen data with room code
                        const imageData = canvasRef.current.toDataURL("image/jpeg", quality)
                        socket.emit("screen-data", {
                            image: imageData,
                            code: code,
                            frameId: frameId,
                            timestamp: Date.now(),
                        })

                        setFramesSent((prev) => prev + 1)
                        console.log(`Sent frame ${frameId} at ${new Date().toLocaleTimeString()}`)
                    }
                } catch (err) {
                    console.error("Error capturing screen:", err)
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

                <div className="hidden">
                    <video ref={videoRef} style={{ display: "none" }} autoPlay muted playsInline />
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                </div>

                <div className="mt-6 p-4 bg-gray-100 rounded-md">
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
